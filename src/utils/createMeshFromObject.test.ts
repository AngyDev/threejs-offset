import * as THREE from "three";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils";
import { createMeshFromObject } from "./createMeshFromObject";
import type { InitialObject } from "@/types";

vi.mock("three/examples/jsm/utils/BufferGeometryUtils", () => ({
  mergeVertices: vi.fn((geometry) => geometry),
}));

describe("createMeshFromObject", () => {
  let mockObject: InitialObject[];

  beforeEach(() => {
    mockObject = [
      {
        face: 0,
        normal: [0, 0, 1],
        vertices: [
          [0, 0, 0],
          [1, 0, 0],
          [0, 1, 0],
        ],
      },
      {
        face: 1,
        normal: [0, 1, 0],
        vertices: [
          [0, 1, 0],
          [1, 1, 0],
          [0, 2, 0],
        ],
      },
    ];
  });

  it("should create a mesh with the correct geometry and material", async () => {
    const mesh = await createMeshFromObject(mockObject);

    expect(mesh).toBeInstanceOf(THREE.Mesh);
    expect(mesh.material).toBeInstanceOf(THREE.MeshStandardMaterial);

    const material = mesh.material as THREE.MeshStandardMaterial;
    expect(material.color.getHex()).toBe(0x0000ff);
    expect(material.opacity).toBe(0.2);
    expect(material.transparent).toBe(true);
    expect(material.side).toBe(THREE.DoubleSide);
    expect(material.vertexColors).toBe(true);
    expect(material.wireframe).toBe(true);

    const geometry = mesh.geometry as THREE.BufferGeometry;
    expect(geometry.attributes.position.count).toBe(6); // 2 triangles * 3 vertices
    expect(geometry.attributes.normal.count).toBe(6);
    expect(geometry.attributes.color.count).toBe(6);
    expect(mergeVertices).toHaveBeenCalledWith(geometry);
  });

  it("should correctly set vertex positions and normals", async () => {
    const mesh = await createMeshFromObject(mockObject);
    const geometry = mesh.geometry as THREE.BufferGeometry;

    const positions = geometry.attributes.position.array;
    const normals = geometry.attributes.normal.array;

    expect(positions).toEqual(
      new Float32Array([
        0, 0, 0, 1, 0, 0, 0, 1, 0, // First object
        0, 1, 0, 1, 1, 0, 0, 2, 0, // Second object
      ])
    );

    expect(normals).toEqual(
      new Float32Array([
        0, 0, 1, 0, 0, 1, 0, 0, 1, // First object
        0, 0, 1, 0, 0, 1, 0, 0, 1, // Second object
      ])
    );
  });

  it("should set vertex colors to white", async () => {
    const mesh = await createMeshFromObject(mockObject);
    const geometry = mesh.geometry as THREE.BufferGeometry;

    const colors = geometry.attributes.color.array;
    expect(colors).toEqual(new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]));
  });
});