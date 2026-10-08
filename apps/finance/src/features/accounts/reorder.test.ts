import { moveItem, orderBySlots, reslot, slotFor } from "./reorder";

describe("moveItem", () => {
  it("moves down and up", () => {
    expect(moveItem(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]);
  });
  it("clamps and ignores bad indexes", () => {
    expect(moveItem(["a", "b", "c"], 0, 9)).toEqual(["b", "c", "a"]);
    expect(moveItem(["a", "b", "c"], 1, -4)).toEqual(["b", "a", "c"]);
    expect(moveItem(["a", "b"], 5, 0)).toEqual(["a", "b"]);
  });
});

describe("slotFor", () => {
  it("rounds the drag distance to whole rows and clamps", () => {
    expect(slotFor(1, 80, 72, 4)).toBe(2);
    expect(slotFor(1, 30, 72, 4)).toBe(1);
    expect(slotFor(1, -200, 72, 4)).toBe(0);
    expect(slotFor(2, 500, 72, 4)).toBe(3);
  });
});

describe("reslot", () => {
  const slots = { a: 0, b: 1, c: 2, d: 3 };
  it("shifts passed rows when dragging down", () => {
    expect(reslot(slots, "a", 2)).toEqual({ a: 2, b: 0, c: 1, d: 3 });
  });
  it("shifts passed rows when dragging up", () => {
    expect(reslot(slots, "d", 1)).toEqual({ a: 0, b: 2, c: 3, d: 1 });
  });
  it("is a no-op for the same slot and round-trips into an order", () => {
    expect(reslot(slots, "b", 1)).toEqual(slots);
    expect(orderBySlots(reslot(slots, "a", 2))).toEqual(["b", "c", "a", "d"]);
  });
});
