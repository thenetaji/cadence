import { clear, hexToRgb, hsl, hueOf } from "./color";
import { tileSpec } from "./tile-styles";
import { ICON_BACKGROUNDS } from "./types";

describe("icon colour helpers", () => {
  it("reads hues", () => {
    expect(hueOf("#FF0000")).toBe(0);
    expect(hueOf("#00FF00")).toBe(120);
    expect(hueOf("#0000FF")).toBe(240);
    expect(hueOf("#888888")).toBe(0);
  });

  it("converts hsl to rgba and clears alpha", () => {
    expect(hsl(0, 100, 50)).toBe("rgba(255, 0, 0, 1)");
    expect(hsl(120, 100, 50, 0.5)).toBe("rgba(0, 255, 0, 0.5)");
    expect(clear("rgba(1, 2, 3, 0.4)")).toBe("rgba(1, 2, 3, 0)");
    expect(hexToRgb("#fff")).toEqual([255, 255, 255]);
  });
});

describe("tile specs", () => {
  it("defines every treatment in both schemes", () => {
    for (const bg of ICON_BACKGROUNDS) {
      for (const dark of [true, false]) {
        const spec = tileSpec(bg, dark, "#5B86E0");
        expect(spec.icon).toBeTruthy();
        if (spec.kind === "glass") {
          expect(spec.face).toContain("gradient");
          expect(spec.rimGradient).toContain("gradient");
        }
        if (spec.kind === "plain") expect(spec.base).toBeTruthy();
      }
    }
  });

  it("has no tile for glyph-only", () => {
    expect(tileSpec("glyph-only", true, "#5B86E0").kind).toBe("none");
  });
});
