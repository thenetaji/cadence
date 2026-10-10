import { balanceHistory, historyBuckets, type Movement } from "./history";

const today = "2026-10-10";

describe("historyBuckets", () => {
  it("uses 90 days for three months", () => {
    const keys = historyBuckets("3m", today, null);
    expect(keys).toHaveLength(90);
    expect(keys[0]).toBe("2026-07-13");
    expect(keys[89]).toBe(today);
  });
  it("uses 53 weekly points for a year", () => {
    const keys = historyBuckets("1y", today, null);
    expect(keys).toHaveLength(53);
    expect(keys[51]).toBe("2026-10-03");
    expect(keys[52]).toBe(today);
  });
  it("uses month ends for all time, anchored the day before the first movement", () => {
    expect(historyBuckets("all", today, "2026-05-14")).toEqual([
      "2026-05-13",
      "2026-05-31",
      "2026-06-30",
      "2026-07-31",
      "2026-08-31",
      "2026-09-30",
      today,
    ]);
  });
  it("falls back to days for a short history, never fewer than two points", () => {
    expect(historyBuckets("all", today, "2026-10-08")).toEqual([
      "2026-10-08",
      "2026-10-09",
      today,
    ]);
    expect(historyBuckets("all", today, null)).toEqual(["2026-10-09", today]);
  });
});

describe("balanceHistory", () => {
  const accounts = [
    { id: "a", currency: "INR", openingBalance: 1000 },
    { id: "b", currency: "USD", openingBalance: 10 },
  ];
  const movements: Movement[] = [
    { accountId: "a", dateKey: "2026-10-02", delta: -300 },
    { accountId: "b", dateKey: "2026-10-01", delta: 5 },
    { accountId: "a", dateKey: "2026-10-03", delta: 500 },
    { accountId: "gone", dateKey: "2026-10-01", delta: 99999 },
  ];
  const convert = (amount: number, currency: string) =>
    currency === "USD" ? amount * 80 : amount;

  it("adds opening balances and movements up to each day, converted", () => {
    expect(
      balanceHistory(
        accounts,
        movements,
        ["2026-09-30", "2026-10-01", "2026-10-02", "2026-10-10"],
        convert,
      ),
    ).toEqual([1800, 2200, 1900, 2400]);
  });
  it("leaves out accounts that cannot be converted", () => {
    expect(
      balanceHistory(accounts, movements, ["2026-10-10"], (amount, currency) =>
        currency === "USD" ? null : amount,
      ),
    ).toEqual([1200]);
  });
});
