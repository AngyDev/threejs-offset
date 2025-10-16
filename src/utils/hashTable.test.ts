import { beforeEach, describe, expect, it } from "vitest";
import { HashTable } from "./hashTable";

describe("HashTable", () => {
  let table: HashTable<string | object, number | string>;

  beforeEach(() => {
    table = new HashTable(5);
  });

  it("initializes with correct length and size", () => {
    expect(table.data.length).toBe(5);
    expect(table.size).toBe(0);
    expect(table.data.every((b) => b === undefined)).toBe(true);
  });

  it("adds a new key and stores value array", () => {
    table.set("foo", 1);
    const bucketIndex = table.hash("foo");
    const bucket = table.data[bucketIndex];
    expect(bucket.length).toBe(1);
    expect(bucket[0][0]).toBe("foo");
    expect(bucket[0][1]).toEqual([1]);
    expect(table.size).toBe(1);
  });

  it("appends value for existing primitive key without increasing size", () => {
    table.set("foo", 1);
    table.set("foo", 2);
    const bucket = table.data[table.hash("foo")];
    expect(bucket.length).toBe(1);
    expect(bucket[0][1]).toEqual([1, 2]);
    expect(table.size).toBe(1);
  });

  it("treats different object instances with same JSON as same key", () => {
    const a1 = { x: 1 };
    const a2 = { x: 1 };
    table.set(a1, "v1");
    table.set(a2, "v2");
    const bucket = table.data[table.hash(a1)];
    expect(bucket.length).toBe(1);
    expect(bucket[0][1]).toEqual(["v1", "v2"]);
    expect(table.size).toBe(1);
  });

  it("treats objects with different property order as different keys", () => {
    const o1 = { a: 1, b: 2 };
    const o2 = { b: 2, a: 1 }; // JSON.stringify order differs
    table.set(o1, "first");
    table.set(o2, "second");

    // Could be same hash or different; count total size instead
    expect(table.size).toBe(2);
    const flatEntries = table.data.filter(Boolean).flat();
    const values = flatEntries.map((e) => e[1]);
    expect(values).toContainEqual(["first"]);
    expect(values).toContainEqual(["second"]);
  });

  it("handles hash collisions by chaining", () => {
    // 'ab' and 'ba' have same char code sum => same hash in length 5
    table.set("ab", 1);
    table.set("ba", 2);
    const idx = table.hash("ab");
    expect(idx).toBe(table.hash("ba"));
    const bucket = table.data[idx];
    expect(bucket.length).toBe(2);
    const entryAb = bucket.find((e) => e[0] === "ab");
    const entryBa = bucket.find((e) => e[0] === "ba");

    if (!entryAb || !entryBa) {
      throw new Error("Entries not found in collision bucket");
    }

    expect(entryAb[1]).toEqual([1]);
    expect(entryBa[1]).toEqual([2]);
    expect(table.size).toBe(2);
  });

  it("adds multiple values for same object key reference", () => {
    const key = { id: 7 };
    table.set(key, "a");
    table.set(key, "b");
    const bucket = table.data[table.hash(key)];
    expect(bucket.length).toBe(1);
    expect(bucket[0][1]).toEqual(["a", "b"]);
    expect(table.size).toBe(1);
  });

  it("hash is deterministic for same key", () => {
    const key = "stable";
    const h1 = table.hash(key);
    const h2 = table.hash(key);
    expect(h1).toBe(h2);
  });

  it("separates different primitive keys with different hash buckets when possible", () => {
    table.set("a", 1);
    table.set("b", 2);
    const hA = table.hash("a");
    const hB = table.hash("b");
    const sameBucket = hA === hB;
    const bucketA = table.data[hA];
    if (sameBucket) {
      expect(bucketA.length).toBeGreaterThanOrEqual(2);
    } else {
      const bucketB = table.data[hB];
      expect(bucketA.length).toBe(1);
      expect(bucketB.length).toBe(1);
    }
    expect(table.size).toBe(sameBucket ? 2 : 2);
  });
});
