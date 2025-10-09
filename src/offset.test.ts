import { Mesh, BufferGeometry, BufferAttribute, Points, PointsMaterial } from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { describe, it, expect, vi, beforeEach } from "vitest";

import { applyOffset, processGeometry } from "./offset";
import { createMeshFromObject } from "./utils/createMeshFromObject";
import { createOffsetMesh } from "./utils/offsetObjectHash";

vi.mock("three/examples/jsm/exporters/STLExporter.js");
vi.mock("./utils/createMeshFromObject");
vi.mock("./utils/offsetObjectHash");

describe("applyOffset", () => {
  let mockMesh: Mesh;
  let mockExporter: any;
  let mockResult: string;

  beforeEach(() => {
    mockMesh = new Mesh();
    mockResult = "mock stl data";
    mockExporter = {
      parse: vi.fn().mockReturnValue(mockResult),
    };
    (STLExporter as any).mockImplementation(() => mockExporter);
    (createOffsetMesh as any).mockReturnValue("mock object");
    (createMeshFromObject as any).mockResolvedValue(new Mesh());
  });

  it("should export mesh as STL and create offset mesh", async () => {
    const offset = 2;
    const result = await applyOffset(mockMesh, offset);

    expect(STLExporter).toHaveBeenCalled();
    expect(mockExporter.parse).toHaveBeenCalledWith(mockMesh, { binary: false });
    expect(createOffsetMesh).toHaveBeenCalledWith(mockResult, offset);
    expect(createMeshFromObject).toHaveBeenCalledWith("mock object");
    expect(result.name).toBe("offset");
  });
});

describe("processGeometry", () => {
  let mockGeometry: BufferGeometry;

  beforeEach(() => {
    mockGeometry = new BufferGeometry();
    const vertices = new Float32Array([0, 0, 0, 1, 1, 1, 2, 2, 2]);
    const normals = new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
    mockGeometry.setAttribute("position", new BufferAttribute(vertices, 3));
    mockGeometry.setAttribute("normal", new BufferAttribute(normals, 3));
  });

  it("should create points with offset applied to vertices", () => {
    const offset = 0.5;
    const result = processGeometry(mockGeometry, offset);

    expect(result).toBeInstanceOf(Points);
    expect(result.name).toBe("offset");
    expect(result.material).toBeInstanceOf(PointsMaterial);
    expect((result.material as PointsMaterial).color.getHex()).toBe(0xff0000);
    expect((result.material as PointsMaterial).size).toBe(0.7);

    const positions = result.geometry.attributes.position.array;
    expect(positions[0]).toBe(0.5); // 0.5 * 1 + 0
    expect(positions[1]).toBe(0); // 0.5 * 0 + 0
    expect(positions[2]).toBe(0); // 0.5 * 0 + 0
  });

  it("should handle negative offset", () => {
    const offset = -1;
    const result = processGeometry(mockGeometry, offset);

    const positions = result.geometry.attributes.position.array;
    expect(positions[0]).toBe(-1); // -1 * 1 + 0
    expect(positions[4]).toBe(0); // -1 * 1 + 1
  });
});
