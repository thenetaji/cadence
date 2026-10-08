import { monthScrub } from "./labels";

describe("monthScrub", () => {
  it("reads spent then earned, compact when large", () => {
    expect(
      monthScrub({ income: 14500000, spent: 5230000 }, "Aug", "INR", "en-IN"),
    ).toBe("Aug · Spent ₹52.3K · Earned ₹1.5L");
    expect(
      monthScrub({ income: 0, spent: 124000 }, "Aug", "INR", "en-IN"),
    ).toBe("Aug · Spent ₹1,240 · Earned ₹0");
  });
});
