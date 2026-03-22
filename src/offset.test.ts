import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as THREE from 'three'
import { applyOffset, processGeometry } from './offset'

// Helper: create a non-indexed triangle geometry from raw positions (flat Float32Array, 9 floats per triangle)
function makeTriangleGeometry(positions: number[]): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3))
  geo.computeVertexNormals()
  return geo
}

// Helper: build a simple mesh wrapping a geometry
function makeMesh(positions: number[]): THREE.Mesh {
  const geo = makeTriangleGeometry(positions)
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial())
}

// A single triangle lying in the XY plane (z = 0), normal pointing +Z
const FLAT_TRIANGLE = [
  0, 0, 0,
  1, 0, 0,
  0, 1, 0,
]

// Two triangles sharing an edge (a quad split into two triangles in XY plane)
const TWO_TRIANGLE_QUAD = [
  // Triangle 1
  0, 0, 0,
  1, 0, 0,
  0, 1, 0,
  // Triangle 2
  1, 0, 0,
  1, 1, 0,
  0, 1, 0,
]

describe('offset', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('applyOffset', () => {
    it('should return the same mesh object (mutates in place)', async () => {
      const mesh = makeMesh(FLAT_TRIANGLE)
      const result = await applyOffset(mesh, 1.0)
      expect(result).toBe(mesh)
    })

    it('should replace the geometry on the mesh', async () => {
      const mesh = makeMesh(FLAT_TRIANGLE)
      const oldGeo = mesh.geometry
      await applyOffset(mesh, 1.0)
      expect(mesh.geometry).not.toBe(oldGeo)
    })

    it('should preserve the number of vertices for a single triangle', async () => {
      const mesh = makeMesh(FLAT_TRIANGLE)
      await applyOffset(mesh, 1.0)
      const posAttr = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
      // 1 triangle = 3 vertices
      expect(posAttr.count).toBe(3)
    })

    it('should offset a flat triangle along its normal (+Z)', async () => {
      const mesh = makeMesh(FLAT_TRIANGLE)
      const offset = 2.0
      await applyOffset(mesh, offset)

      const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
      // For a single planar triangle all normals point in the same direction (+Z),
      // so every vertex should move by +offset in Z.
      for (let i = 0; i < pos.count; i++) {
        expect(pos.getZ(i)).toBeCloseTo(offset, 4)
      }
      // X and Y should be unchanged from the original positions
      expect(pos.getX(0)).toBeCloseTo(0, 4)
      expect(pos.getY(0)).toBeCloseTo(0, 4)
      expect(pos.getX(1)).toBeCloseTo(1, 4)
      expect(pos.getY(1)).toBeCloseTo(0, 4)
      expect(pos.getX(2)).toBeCloseTo(0, 4)
      expect(pos.getY(2)).toBeCloseTo(1, 4)
    })

    it('should handle negative offset', async () => {
      const mesh = makeMesh(FLAT_TRIANGLE)
      const offset = -3.0
      await applyOffset(mesh, offset)

      const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i < pos.count; i++) {
        expect(pos.getZ(i)).toBeCloseTo(offset, 4)
      }
    })

    it('should handle zero offset (vertices stay in place)', async () => {
      const mesh = makeMesh(FLAT_TRIANGLE)
      await applyOffset(mesh, 0)

      const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
      expect(pos.getX(0)).toBeCloseTo(0, 4)
      expect(pos.getY(0)).toBeCloseTo(0, 4)
      expect(pos.getZ(0)).toBeCloseTo(0, 4)
      expect(pos.getX(1)).toBeCloseTo(1, 4)
      expect(pos.getZ(1)).toBeCloseTo(0, 4)
    })

    it('should preserve vertex count for multi-triangle geometry', async () => {
      const mesh = makeMesh(TWO_TRIANGLE_QUAD)
      await applyOffset(mesh, 1.0)
      const posAttr = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
      // 2 triangles * 3 vertices = 6
      expect(posAttr.count).toBe(6)
    })

    it('should produce averaged normals at shared vertices of a quad', async () => {
      const mesh = makeMesh(TWO_TRIANGLE_QUAD)
      const offset = 1.0
      await applyOffset(mesh, offset)

      const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
      // Both triangles lie in XY plane so normals all point +Z even at shared edges.
      // All vertices should simply move +1 in Z.
      for (let i = 0; i < pos.count; i++) {
        expect(pos.getZ(i)).toBeCloseTo(offset, 4)
      }
    })

    it('should set normal attributes on the new geometry', async () => {
      const mesh = makeMesh(FLAT_TRIANGLE)
      await applyOffset(mesh, 1.0)

      const normals = mesh.geometry.getAttribute('normal') as THREE.BufferAttribute
      expect(normals).toBeDefined()
      expect(normals.count).toBe(3)
    })

    it('should add UV attribute via ensureUV', async () => {
      const mesh = makeMesh(FLAT_TRIANGLE)
      await applyOffset(mesh, 1.0)

      const uv = mesh.geometry.getAttribute('uv') as THREE.BufferAttribute
      expect(uv).toBeDefined()
      expect(uv.itemSize).toBe(2)
    })

    it('should compute bounding box and bounding sphere', async () => {
      const mesh = makeMesh(FLAT_TRIANGLE)
      await applyOffset(mesh, 1.0)

      expect(mesh.geometry.boundingBox).not.toBeNull()
      expect(mesh.geometry.boundingSphere).not.toBeNull()
    })

    it('should handle indexed geometry by converting to non-indexed', async () => {
      // Create an indexed geometry (a single triangle with indices)
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(
        new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3
      ))
      geo.setIndex([0, 1, 2])
      geo.computeVertexNormals()

      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial())
      await applyOffset(mesh, 1.0)

      const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
      expect(pos.count).toBe(3)
      for (let i = 0; i < pos.count; i++) {
        expect(pos.getZ(i)).toBeCloseTo(1.0, 4)
      }
    })

    it('should correctly offset a non-planar shape (two angled triangles)', async () => {
      // Two triangles meeting at an edge along the X axis
      // Triangle 1 lies in XY plane, normal = +Z = (0, 0, 1)
      // Triangle 2 lies in XZ plane with winding giving normal = -Y = (0, -1, 0)
      //   cross((1,0,0)-(0,0,0), (0,0,1)-(0,0,0)) = (1,0,0) × (0,0,1) = (0,-1,0)
      const positions = [
        // Triangle 1
        0, 0, 0,
        1, 0, 0,
        0, 1, 0,
        // Triangle 2
        0, 0, 0,
        1, 0, 0,
        0, 0, 1,
      ]
      const mesh = makeMesh(positions)
      const offset = 1.0
      await applyOffset(mesh, offset)

      const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
      expect(pos.count).toBe(6)

      // Vertex (0,1,0) only in triangle 1 -> offset along +Z -> (0, 1, 1)
      const t1v2 = new THREE.Vector3(pos.getX(2), pos.getY(2), pos.getZ(2))
      expect(t1v2.x).toBeCloseTo(0, 4)
      expect(t1v2.y).toBeCloseTo(1, 4)
      expect(t1v2.z).toBeCloseTo(1, 4)

      // Vertex (0,0,1) only in triangle 2 -> offset along -Y -> (0, -1, 1)
      const t2v2 = new THREE.Vector3(pos.getX(5), pos.getY(5), pos.getZ(5))
      expect(t2v2.x).toBeCloseTo(0, 4)
      expect(t2v2.y).toBeCloseTo(-1, 4)
      expect(t2v2.z).toBeCloseTo(1, 4)

      // Shared vertex (0,0,0): averaged normal = normalize(0, -1, 1) = (0, -1/sqrt2, 1/sqrt2)
      const invSqrt2 = 1 / Math.sqrt(2)
      const t1v0 = new THREE.Vector3(pos.getX(0), pos.getY(0), pos.getZ(0))
      expect(t1v0.x).toBeCloseTo(0, 4)
      expect(t1v0.y).toBeCloseTo(-invSqrt2, 4)
      expect(t1v0.z).toBeCloseTo(invSqrt2, 4)
    })

    it('should dispose the old geometry', async () => {
      const mesh = makeMesh(FLAT_TRIANGLE)
      const oldGeo = mesh.geometry
      const disposeSpy = vi.spyOn(oldGeo, 'dispose')

      await applyOffset(mesh, 1.0)

      expect(disposeSpy).toHaveBeenCalledOnce()
    })

    it('should handle a large offset value', async () => {
      const mesh = makeMesh(FLAT_TRIANGLE)
      const offset = 1000
      await applyOffset(mesh, offset)

      const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i < pos.count; i++) {
        expect(pos.getZ(i)).toBeCloseTo(offset, 2)
      }
    })

    it('should handle a very small offset value', async () => {
      const mesh = makeMesh(FLAT_TRIANGLE)
      const offset = 0.0001
      await applyOffset(mesh, offset)

      const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i < pos.count; i++) {
        expect(pos.getZ(i)).toBeCloseTo(offset, 6)
      }
    })
  })

  describe('processGeometry', () => {
    it('should create points with offset applied to vertices', () => {
      const geometry = new THREE.BufferGeometry()
      const vertices = new Float32Array([1, 2, 3, 4, 5, 6])
      const normals = new Float32Array([0, 1, 0, 1, 0, 0])
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
      geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))

      const offset = 2.0
      const result = processGeometry(geometry, offset)

      expect(result).toBeInstanceOf(THREE.Points)
      expect(result.name).toBe('offset')
      expect(result.material).toBeInstanceOf(THREE.PointsMaterial)
    })

    it('should apply offset correctly to vertex positions', () => {
      const geometry = new THREE.BufferGeometry()
      const vertices = new Float32Array([0, 0, 0, 3, 3, 3])
      const normals = new Float32Array([1, 0, 0, 0, 1, 0])
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
      geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))

      const offset = 1.0
      const result = processGeometry(geometry, offset)
      const resultPositions = result.geometry.attributes.position.array as Float32Array

      expect(resultPositions[0]).toBe(1) // 1 * 1 + 0
      expect(resultPositions[1]).toBe(0) // 0 * 1 + 0
      expect(resultPositions[2]).toBe(0) // 0 * 1 + 0
      expect(resultPositions[3]).toBe(3) // 0 * 1 + 3
      expect(resultPositions[4]).toBe(4) // 1 * 1 + 3
      expect(resultPositions[5]).toBe(3) // 0 * 1 + 3
    })

    it('should create material with correct properties', () => {
      const geometry = new THREE.BufferGeometry()
      const vertices = new Float32Array([1, 2, 3])
      const normals = new Float32Array([0, 1, 0])
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
      geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))

      const result = processGeometry(geometry, 1.0)
      const material = result.material as THREE.PointsMaterial

      expect(material.color.getHex()).toBe(0xff0000)
      expect(material.size).toBe(0.7)
    })
  })
})