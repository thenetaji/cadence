import { iconSections, pickableCount } from "./icons";

const flat = (query: string, current?: string) =>
  iconSections(query, current).flatMap((s) => s.ids);

describe("category icon picker", () => {
  it("groups every pickable concept under a theme", () => {
    const sections = iconSections("");
    expect(sections.length).toBeGreaterThan(8);
    expect(flat("")).toHaveLength(pickableCount());
    expect(pickableCount()).toBeGreaterThanOrEqual(150);
  });

  it("matches every typed word by prefix", () => {
    expect(flat("car")).toContain("car");
    expect(flat("take away")).toEqual([]);
    expect(flat("takeaway")).toEqual(["takeaway"]);
    expect(flat("zzzz")).toEqual([]);
  });

  it("finds icons by synonym", () => {
    expect(flat("burger")).toContain("fastfood");
  });

  it("keeps a non-pickable current icon in its own section", () => {
    expect(iconSections("", "plus.circle.fill")[0]).toEqual({
      title: "Current",
      ids: ["add-circle"],
    });
    expect(iconSections("", "cart.fill")[0]?.title).not.toBe("Current");
    expect(
      iconSections("car", "plus.circle.fill").some(
        (s) => s.title === "Current",
      ),
    ).toBe(false);
  });
});
