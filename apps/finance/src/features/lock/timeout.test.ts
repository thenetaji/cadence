import { lockTimeoutLabel, shouldLockOnReturn } from "./timeout";

const base = { enabled: true, timeoutS: 60, now: 1_000_000 };

describe("shouldLockOnReturn", () => {
  it("never locks when disabled or when the app never reached the background", () => {
    expect(
      shouldLockOnReturn({ ...base, enabled: false, backgroundedAt: 0 }),
    ).toBe(false);
    expect(shouldLockOnReturn({ ...base, backgroundedAt: null })).toBe(false);
  });

  it("locks immediately for a zero timeout", () => {
    expect(
      shouldLockOnReturn({ ...base, timeoutS: 0, backgroundedAt: base.now }),
    ).toBe(true);
  });

  it("waits for the timeout to elapse", () => {
    expect(
      shouldLockOnReturn({ ...base, backgroundedAt: base.now - 59_999 }),
    ).toBe(false);
    expect(
      shouldLockOnReturn({ ...base, backgroundedAt: base.now - 60_000 }),
    ).toBe(true);
    expect(
      shouldLockOnReturn({
        ...base,
        timeoutS: 300,
        backgroundedAt: base.now - 299_000,
      }),
    ).toBe(false);
    expect(
      shouldLockOnReturn({
        ...base,
        timeoutS: 300,
        backgroundedAt: base.now - 300_000,
      }),
    ).toBe(true);
  });
});

describe("lockTimeoutLabel", () => {
  it("labels the three options", () => {
    expect([0, 60, 300].map(lockTimeoutLabel)).toEqual([
      "Immediately",
      "1 min",
      "5 min",
    ]);
  });
});
