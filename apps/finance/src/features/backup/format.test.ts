import { backupTimeLabel, unavailableNote } from "./format";

describe("backup labels", () => {
  it("formats the last backup time", () => {
    expect(backupTimeLabel(new Date(2026, 9, 6, 21, 4).getTime())).toBe(
      "6 Oct, 21:04",
    );
    expect(backupTimeLabel(new Date(2026, 0, 12, 7, 30).getTime())).toBe(
      "12 Jan, 07:30",
    );
  });
  it("explains unavailable providers tersely", () => {
    expect(unavailableNote("needs-paid-developer-account")).toBe(
      "Needs App Store build",
    );
    expect(unavailableNote("needs-standalone-build")).toBe(
      "Needs standalone app",
    );
  });
});
