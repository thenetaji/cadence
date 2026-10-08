import { fromTime, toTime } from "./time";

describe("reminder time", () => {
  it("round trips HH:MM", () => {
    expect(toTime(fromTime("07:05"))).toBe("07:05");
    expect(toTime(fromTime("21:00"))).toBe("21:00");
  });
  it("falls back to 21:00", () => {
    expect(toTime(fromTime("nope"))).toBe("21:00");
  });
});
