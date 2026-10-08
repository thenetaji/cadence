import { luminance, mixColors, parseColor, readableOn } from "./color-mix";

describe("tint helpers", () => {
  it("parses hex and rgba", () => {
    expect(parseColor("#F0625D")).toEqual([240, 98, 93, 1]);
    expect(parseColor("#fff")).toEqual([255, 255, 255, 1]);
    expect(parseColor("rgba(10, 20, 30, 0.5)")).toEqual([10, 20, 30, 0.5]);
  });
  it("mixes linearly", () => {
    expect(mixColors("#000000", "#FFFFFF", 0.5)).toBe("rgba(128,128,128,1)");
    expect(mixColors("#102030", "#102030", 0.3)).toBe("rgba(16,32,48,1)");
  });
  it("picks readable text for each kind colour", () => {
    expect(luminance("#FFFFFF")).toBeCloseTo(1, 3);
    for (const fill of ["#F0625D", "#4FD08A", "#5B86E0", "#E2B96A"])
      expect(readableOn(fill, "#141210", "#FFFFFF")).toBe("#141210");
    expect(readableOn("#101010", "#141210", "#FFFFFF")).toBe("#FFFFFF");
  });
});
