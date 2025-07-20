import { describe, it, expect } from "vitest";
import { add } from "../src/functions_tests/math";

describe("add function", () => {
  it("should return 3 when adding 1 and 2", () => {
    expect(add(1, 2)).toBe(3);
  });
});
