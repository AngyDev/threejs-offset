import * as THREE from "three"
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js"
import { createMeshFromObject } from "./utils/createMeshFromObject"
import { createOffsetMesh } from "./utils/offsetObjectHash"

/**
 * Creates a mesh with the offset passed
 * @param {THREE.Mesh} meshToOffset The mesh that the user added to the scene
 * @param {Number} offset The offset passed
 */
export async function applyOffset(meshToOffset, offset) {
  console.time()

  // 1. Export mesh as an ascii file
  const exporter = new STLExporter()
  const result = exporter.parse(meshToOffset, { binary: false })

  // 2. Creates mesh with offset
  const object = createOffsetMesh(result, offset)
  const meshOffset = await createMeshFromObject(object)

  meshOffset.name = "offset"

  console.timeEnd()

  return meshOffset
}

/**
 * Creates a points with the offset passed
 * @param {THREE.BufferGeometry} geometry
 * @param {Number} offset
 */
export function processGeometry(geometry, offset) {
  const vertices = geometry.attributes.position.array
  const normals = geometry.attributes.normal.array
  const position = new Float32Array(vertices.length * 3)

  for (let i = 0; i < vertices.length; i = i + 3) {
    position[i] = offset * normals[i] + vertices[i]
    position[i + 1] = offset * normals[i + 1] + vertices[i + 1]
    position[i + 2] = offset * normals[i + 2] + vertices[i + 2]
  }

  const newGeometry = new THREE.BufferGeometry()
  newGeometry.setAttribute("position", new THREE.BufferAttribute(position, 3))

  const newMaterial = new THREE.PointsMaterial({ color: 0xff0000, size: 0.7 })
  const newMesh = new THREE.Points(newGeometry, newMaterial)
  newMesh.name = "offset"

  return newMesh
}
