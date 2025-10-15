import { describe, expect, it } from "vitest";

// Helper for approximate comparison
const closeTo = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

describe("createOffsetMesh basic behavior", () => {
  it("returns unchanged vertices when offset is 0", async () => {
    const { createOffsetMesh } = await import("./offsetObjectHash");

    const stl = `
solid test
facet normal 0 0 1
  outer loop
    vertex 0 0 0
    vertex 1 0 0
    vertex 0 1 0
  endloop
endfacet
endsolid test
`;
    const res = createOffsetMesh(stl, 0);
    expect(res).toHaveLength(1);
    const face = res[0];
    expect(face.vertices).toEqual([
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
    ]);
    expect(face.normal).toHaveLength(3);
    const len = Math.hypot(face.normal[0], face.normal[1], face.normal[2]);
    expect(closeTo(len, 1)).toBe(true);
  });

  it("applies positive offset along face normal", async () => {
    const { createOffsetMesh } = await import("./offsetObjectHash");
    const offset = 0.1;
    const stl = `
solid single
facet normal 0 0 1
  outer loop
    vertex 0 0 0
    vertex 1 0 0
    vertex 0 1 0
  endloop
endfacet
endsolid single
`;
    const res = createOffsetMesh(stl, offset);
    const verts = res[0].vertices;
    verts.forEach((v) => {
      expect(closeTo(v[2], offset)).toBe(true);
    });
  });

  it("averages normals for shared vertex across three orthogonal faces", async () => {
    const { createOffsetMesh } = await import("./offsetObjectHash");
    const offset = 2;
    const stl = `
solid corner
facet normal 1 0 0
  outer loop
    vertex 0 0 0
    vertex 0 1 0
    vertex 0 0 1
  endloop
endfacet
facet normal 0 1 0
  outer loop
    vertex 0 0 0
    vertex 1 0 0
    vertex 0 0 1
  endloop
endfacet
facet normal 0 0 1
  outer loop
    vertex 0 0 0
    vertex 1 0 0
    vertex 0 1 0
  endloop
endfacet
endsolid corner
`;
    const res = createOffsetMesh(stl, offset);
    expect(res).toHaveLength(3);

    const sqrt3 = Math.sqrt(3);
    const expCorner = offset / sqrt3; // component for (0,0,0) vertex

    // Collect all occurrences of the transformed original corner vertex
    const cornerVertices = res.flatMap((f) =>
      f.vertices.filter((v) => closeTo(v[0], expCorner) && closeTo(v[1], expCorner) && closeTo(v[2], expCorner)),
    );
    // The shared vertex should appear once per face
    expect(cornerVertices.length).toBe(3);

    // Check a vertex shared by two faces: (0,1,0) -> normals (1,0,0)+(0,0,1)
    const sqrt2 = Math.sqrt(2);
    const expTwo = offset / sqrt2;
    const transformed_0_1_0 = res
      .flatMap((f) => f.vertices)
      .find((v) => closeTo(v[0], expTwo) && closeTo(v[1], 1) && closeTo(v[2], expTwo));
    expect(transformed_0_1_0).toBeTruthy();

    // Validate normals are unit length
    res.forEach((f) => {
      expect(f.normal.length).toBe(3);
      const len = Math.hypot(f.normal[0], f.normal[1], f.normal[2]);
      expect(closeTo(len, 1)).toBe(true);
    });
  });

  it("supports negative offset (moves opposite direction)", async () => {
    const { createOffsetMesh } = await import("./offsetObjectHash");
    const stl = `
solid neg
facet normal 0 0 1
  outer loop
    vertex 0 0 0
    vertex 1 0 0
    vertex 0 1 0
  endloop
endfacet
endsolid neg
`;
    const offset = -0.25;
    const res = createOffsetMesh(stl, offset);
    res[0].vertices.forEach((v) => {
      expect(closeTo(v[2], offset)).toBe(true);
    });
  });
});
