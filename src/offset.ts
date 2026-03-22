import { BufferAttribute, BufferGeometry, type Mesh, Points, PointsMaterial, Vector3 } from "three";
import { ensureUV } from "./ensureUV";

interface Facet {
  face: number; // index of the facet (triangle)
  normal: Vector3; // face normal
  vertices: Vector3[]; // length 3
}

interface VertexUsageInfo {
  facetIndex: number; // which facet uses this vertex
  normal: Vector3; // source face normal
  vertexPositionInTheObject: number; // 0..2 within the triangle
}

type FacetCollection = Facet[];

const VERTEX_PRECISION = 6;

function vertexKey(v: Vector3): string {
  return `${v.x.toFixed(VERTEX_PRECISION)},${v.y.toFixed(VERTEX_PRECISION)},${v.z.toFixed(VERTEX_PRECISION)}`;
}

// Remember! Some vertices are shared between facets, so we need to know
// all the usages of a vertex to calculate the offset position correctly.
// We can't just take the normal of one facet and move the vertex along it,
// because that would create gaps in the offset mesh. Instead, we need to
// sum up all the normals of the facets that use this vertex and then move
// it along the average normal direction.
function buildVertexUsageMap(facets: FacetCollection): Map<string, VertexUsageInfo[]> {
  const map = new Map<string, VertexUsageInfo[]>();
  facets.forEach((facet, facetIndex) => {
    facet.vertices.forEach((v, idx) => {
      const key = vertexKey(v);
      const entry = map.get(key);
      const info: VertexUsageInfo = {
        facetIndex,
        normal: facet.normal,
        vertexPositionInTheObject: idx,
      };
      if (entry) entry.push(info);
      else map.set(key, [info]);
    });
  });
  return map;
}

function calcNormalsSum(list: VertexUsageInfo[]): Vector3 {
  const sum = new Vector3();
  for (const item of list) sum.add(item.normal);
  return sum;
}

function offsetPosition(offset: number, n: Vector3, v: Vector3): Vector3 {
  return new Vector3(v.x + offset * n.x, v.y + offset * n.y, v.z + offset * n.z);
}

const _ab = new Vector3();
const _ac = new Vector3();
function faceNormal(a: Vector3, b: Vector3, c: Vector3): Vector3 {
  _ab.subVectors(b, a);
  _ac.subVectors(c, a);
  const normal = new Vector3().crossVectors(_ab, _ac).normalize();
  return normal;
}

function extractFacetsFromGeometry(geometry: BufferGeometry): FacetCollection {
  const positionAttr = geometry.getAttribute("position") as BufferAttribute;
  if (!positionAttr) return [];
  const positions = positionAttr.array as Float32Array;
  const facets: FacetCollection = [];
  const triCount = positions.length / 9; // 3 verts * 3 comps
  for (let t = 0; t < triCount; t++) {
    const base = t * 9;
    const a = new Vector3(positions[base], positions[base + 1], positions[base + 2]);
    const b = new Vector3(positions[base + 3], positions[base + 4], positions[base + 5]);
    const c = new Vector3(positions[base + 6], positions[base + 7], positions[base + 8]);
    const n = faceNormal(a, b, c);
    facets.push({ face: t, normal: n, vertices: [a, b, c] });
  }
  return facets;
}

function buildOffsetFacetSet(facets: FacetCollection, offset: number): FacetCollection {
  const usageMap = buildVertexUsageMap(facets);
  const updated: FacetCollection = facets.map((_, idx) => ({
    face: idx,
    normal: new Vector3(),
    vertices: [] as Vector3[],
  }));

  usageMap.forEach((usages) => {
    const summed = calcNormalsSum(usages).normalize();
    for (const u of usages) {
      const sourceFacet = facets[u.facetIndex];
      if (!sourceFacet) continue;
      const originalVertex = sourceFacet.vertices[u.vertexPositionInTheObject];
      const newPos = offsetPosition(offset, summed, originalVertex);
      const target = updated[u.facetIndex];
      target.vertices[u.vertexPositionInTheObject] = newPos;
    }
  });

  for (const facet of updated) {
    const n = faceNormal(facet.vertices[0], facet.vertices[1], facet.vertices[2]);
    facet.normal.copy(n);
  }
  return updated;
}

function createOffsetFacetsFromGeometry(geometry: BufferGeometry, offset: number): FacetCollection {
  const working = geometry.index ? geometry.toNonIndexed() : geometry;
  const facets = extractFacetsFromGeometry(working);
  return buildOffsetFacetSet(facets, offset);
}

/**
 * Creates a mesh with the offset passed
 * @param {THREE.Mesh} meshToOffset The mesh that the user added to the scene
 * @param {Number} offset The offset passed
 */
export async function applyOffset(meshToOffset: Mesh, offset: number): Promise<Mesh> {
  const baseGeometry = meshToOffset.geometry as BufferGeometry;
  const offsetFacets = createOffsetFacetsFromGeometry(baseGeometry, offset);

  // Update geometry in-place instead of creating a new mesh
  const faceCount = offsetFacets.length;
  const verticesPosition = new Float32Array(faceCount * 9);
  const normalsPosition = new Float32Array(faceCount * 9);
  let ptr = 0;
  for (const facet of offsetFacets) {
    for (let i = 0; i < 3; i++) {
      const v = facet.vertices[i];
      const n = facet.normal;
      verticesPosition[ptr] = v.x;
      verticesPosition[ptr + 1] = v.y;
      verticesPosition[ptr + 2] = v.z;
      normalsPosition[ptr] = n.x;
      normalsPosition[ptr + 1] = n.y;
      normalsPosition[ptr + 2] = n.z;
      ptr += 3;
    }
  }

  // Dispose old geometry and create new one
  const oldGeometry = meshToOffset.geometry;
  const newGeometry = new BufferGeometry();
  newGeometry.setAttribute("position", new BufferAttribute(verticesPosition, 3));
  newGeometry.setAttribute("normal", new BufferAttribute(normalsPosition, 3));
  newGeometry.computeBoundingBox();
  newGeometry.computeBoundingSphere();
  newGeometry.computeVertexNormals();
  ensureUV(newGeometry);

  meshToOffset.geometry = newGeometry;
  oldGeometry.dispose();

  return meshToOffset;
}

/**
 * Creates a points with the offset passed
 * @param {THREE.BufferGeometry} geometry
 * @param {Number} offset
 */
export function processGeometry(geometry: BufferGeometry, offset: number) {
  const vertices = geometry.attributes.position.array;
  const normals = geometry.attributes.normal.array;
  const position = new Float32Array(vertices.length * 3);

  for (let i = 0; i < vertices.length; i = i + 3) {
    position[i] = offset * normals[i] + vertices[i];
    position[i + 1] = offset * normals[i + 1] + vertices[i + 1];
    position[i + 2] = offset * normals[i + 2] + vertices[i + 2];
  }

  const newGeometry = new BufferGeometry();
  newGeometry.setAttribute("position", new BufferAttribute(position, 3));

  const newMaterial = new PointsMaterial({ color: 0xff0000, size: 0.7 });
  const newMesh = new Points(newGeometry, newMaterial);
  newMesh.name = "offset";

  return newMesh;
}
