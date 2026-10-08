import {
  CASHEW_SAMPLE,
  DIME_SAMPLE,
  NATIVE_SAMPLE,
  dimeFixture,
} from "./fixtures";
import {
  CsvFormatError,
  parseCashew,
  parseDateTime,
  parseDime,
  parseNative,
  parseImport,
} from "./import";

describe("parseDateTime", () => {
  it("treats an offset as an absolute instant", () => {
    expect(parseDateTime("2023-09-26 14:42:00 +0000")).toBe(
      Date.UTC(2023, 8, 26, 14, 42),
    );
    expect(parseDateTime("2023-09-26 14:42:00 +0530")).toBe(
      Date.UTC(2023, 8, 26, 9, 12),
    );
    expect(parseDateTime("2024-03-05T08:00:00Z")).toBe(
      Date.UTC(2024, 2, 5, 8, 0),
    );
  });

  it("treats text without an offset as local time", () => {
    expect(parseDateTime("2024-03-05 14:32:10.000")).toBe(
      new Date(2024, 2, 5, 14, 32, 10).getTime(),
    );
    expect(parseDateTime("2024-03-05")).toBe(
      new Date(2024, 2, 5, 12, 0).getTime(),
    );
  });

  it("rejects junk", () => {
    expect(parseDateTime("yesterday")).toBeNull();
    expect(parseDateTime("2024-13-05")).toBeNull();
  });
});

describe("Dime", () => {
  const { rows, skipped } = parseDime(DIME_SAMPLE);

  it("reads the five columns", () => {
    expect(skipped).toBe(0);
    expect(rows).toHaveLength(9);
    expect(rows[0]).toMatchObject({
      kind: "expense",
      title: "Doctor’s Appointment",
      memo: "",
      amount: "70.30",
      category: "Healthcare",
      account: null,
      currency: null,
      occurredAt: Date.UTC(2023, 8, 26, 14, 42),
    });
  });

  it("maps Type to the kind", () => {
    expect(rows[rows.length - 1]).toMatchObject({
      kind: "income",
      title: "September pay",
      amount: "3200.00",
      category: "Salary",
    });
  });

  it("skips unreadable rows and rejects other formats", () => {
    const result = parseDime(
      "Date,Note,Amount,Category,Type\nnope,x,1.00,Food,Expense\n2023-01-01 10:00:00 +0000,x,abc,Food,Expense\n",
    );
    expect(result).toEqual({ rows: [], skipped: 2 });
    expect(() => parseDime(CASHEW_SAMPLE)).toThrow(CsvFormatError);
  });
});

describe("Cashew", () => {
  const { rows } = parseCashew(CASHEW_SAMPLE);

  it("uses the sign and income flag for the kind and drops the sign from the amount", () => {
    expect(rows.map((r) => [r.kind, r.amount])).toEqual([
      ["expense", "12.5"],
      ["expense", "86.4"],
      ["income", "2400.0"],
      ["expense", "9.99"],
    ]);
  });

  it("maps title and note to title and memo, with quoted commas", () => {
    expect(rows[0]).toMatchObject({
      title: "Blue Bottle",
      memo: "Oat flat white",
      category: "Food & Drink",
      account: "Main",
      currency: "USD",
    });
    expect(rows[1]).toMatchObject({
      title: "Trader Joe's",
      memo: "Weekly shop, incl. wine",
    });
    expect(rows[0]?.occurredAt).toBe(new Date(2024, 2, 5, 8, 32, 10).getTime());
  });

  it("falls back to the note as the title when the title is empty", () => {
    const text =
      "account,amount,currency,title,note,date,income,type,category name\nMain,-3,usd,,Taxi home,2024-01-01 10:00:00.000,false,null,Transport\n";
    expect(parseCashew(text).rows[0]).toMatchObject({
      title: "Taxi home",
      memo: "",
    });
  });

  it("infers income from the sign when the flag is missing", () => {
    const text =
      "amount,date,category name\n5.00,2024-01-01 10:00:00.000,Gifts\n-5.00,2024-01-01 10:00:00.000,Food\n";
    expect(parseCashew(text).rows.map((r) => r.kind)).toEqual([
      "income",
      "expense",
    ]);
  });
});

describe("native CSV", () => {
  const { rows } = parseNative(NATIVE_SAMPLE);

  it("groups split lines into one transaction", () => {
    expect(rows).toHaveLength(4);
    expect(rows[1]).toMatchObject({
      id: "a2",
      amount: "86.40",
      memo: 'Bulk, "party" run',
      splits: [
        { category: "Groceries", amount: "60.00" },
        { category: "Shopping", amount: "26.40" },
      ],
    });
  });

  it("reads transfers", () => {
    expect(rows[3]).toMatchObject({
      kind: "transfer",
      account: "Main",
      transferAccount: "Savings",
      transferAmount: "500.00",
      category: "",
    });
  });

  it("parseImport dispatches by format", () => {
    expect(parseImport("dime", DIME_SAMPLE).rows).toHaveLength(9);
    expect(parseImport("cashew", CASHEW_SAMPLE).rows).toHaveLength(4);
    expect(dimeFixture(312).split("\n").length).toBe(314);
    expect(parseDime(dimeFixture(312)).rows).toHaveLength(312);
  });
});
