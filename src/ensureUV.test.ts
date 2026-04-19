import { describe, it, expect } from "vitest";
import { BufferAttribute, BufferGeometry, Float32BufferAttribute } from "three";
import { ensureUV } from "./ensureUV";

describe("ensureUV", () => {
  it("should add UV attribute when geometry has no UVs", () => {
    const geometry = new BufferGeometry();
    const positions = new Float32BufferAttribute([0, 0, 0, 1, 1, 1, 2, 2, 2], 3);
    geometry.setAttribute("position", positions);

    ensureUV(geometry);

    expect(geometry.attributes.uv).toBeDefined();
    expect(geometry.attributes.uv).toBeInstanceOf(BufferAttribute);
  });

  it("should create UVs with item size of 2", () => {
    const geometry = new BufferGeometry();
    const positions = new Float32BufferAttribute([0, 0, 0, 1, 1, 1], 3);
    geometry.setAttribute("position", positions);

    ensureUV(geometry);

    expect(geometry.attributes.uv.itemSize).toBe(2);
  });

  it("should create UV count matching position count", () => {
    const geometry = new BufferGeometry();
    const vertexCount = 5;
    const positions = new Float32BufferAttribute(new Float32Array(vertexCount * 3), 3);
    geometry.setAttribute("position", positions);

    ensureUV(geometry);

    expect(geometry.attributes.uv.count).toBe(vertexCount);
  });

  it("should initialize all UV values to 0", () => {
    const geometry = new BufferGeometry();
    const positions = new Float32BufferAttribute([0, 0, 0, 1, 1, 1, 2, 2, 2], 3);
    geometry.setAttribute("position", positions);

    ensureUV(geometry);

    const uvArray = geometry.attributes.uv.array;
    for (let i = 0; i < uvArray.length; i++) {
      expect(uvArray[i]).toBe(0);
    }
  });

  it("should use Float32Array for UV data", () => {
    const geometry = new BufferGeometry();
    const positions = new Float32BufferAttribute([0, 0, 0], 3);
    geometry.setAttribute("position", positions);

    ensureUV(geometry);

    expect(geometry.attributes.uv.array).toBeInstanceOf(Float32Array);
  });

  it("should not overwrite existing UV attribute", () => {
    const geometry = new BufferGeometry();
    const positions = new Float32BufferAttribute([0, 0, 0, 1, 1, 1], 3);
    geometry.setAttribute("position", positions);

    const existingUVs = new Float32BufferAttribute([0.5, 0.5, 1.0, 1.0], 2);
    geometry.setAttribute("uv", existingUVs);

    ensureUV(geometry);

    expect(geometry.attributes.uv.array[0]).toBe(0.5);
    expect(geometry.attributes.uv.array[1]).toBe(0.5);
    expect(geometry.attributes.uv.array[2]).toBe(1.0);
    expect(geometry.attributes.uv.array[3]).toBe(1.0);
  });

  it("should handle geometry with a single vertex", () => {
    const geometry = new BufferGeometry();
    const positions = new Float32BufferAttribute([0, 0, 0], 3);
    geometry.setAttribute("position", positions);

    ensureUV(geometry);

    expect(geometry.attributes.uv.count).toBe(1);
    expect(geometry.attributes.uv.array.length).toBe(2);
  });

  it("should handle geometry with many vertices", () => {
    const geometry = new BufferGeometry();
    const vertexCount = 1000;
    const positions = new Float32BufferAttribute(new Float32Array(vertexCount * 3), 3);
    geometry.setAttribute("position", positions);

    ensureUV(geometry);

    expect(geometry.attributes.uv.count).toBe(vertexCount);
    expect(geometry.attributes.uv.array.length).toBe(vertexCount * 2);
  });
});
