import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as THREE from 'three'
import { applyOffset, processGeometry } from './offset'

// Mock dependencies
const mockParse = vi.fn().mockReturnValue('mocked stl data')

vi.mock('three/examples/jsm/exporters/STLExporter.js', () => ({
  // biome-ignore lint/complexity/useArrowFunction: required for mocking classes
  STLExporter: vi.fn().mockImplementation(function() {
    return {
      parse: mockParse
    }
  })
}))

vi.mock('./utils/createMeshFromObject', () => ({
  createMeshFromObject: vi.fn().mockResolvedValue(new THREE.Mesh())
}))

vi.mock('./utils/offsetObjectHash', () => ({
  createOffsetMesh: vi.fn().mockReturnValue({})
}))

describe('offset', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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