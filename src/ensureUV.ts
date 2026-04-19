import { BufferAttribute, type BufferGeometry } from "three";

// Function to add UVs if missing
export function ensureUV(geometry: BufferGeometry) {
  if (!geometry.attributes.uv) {
    const count = geometry.attributes.position.count;
    const uvs = new Float32Array(count * 2);

    // Assign default UVs (you can adjust logic as needed)
    for (let i = 0; i < count; i++) {
      uvs[i * 2] = 0; // u-coordinate
      uvs[i * 2 + 1] = 0; // v-coordinate
    }

    geometry.setAttribute("uv", new BufferAttribute(uvs, 2));
  }
}
