import { BOM, parseCsv, stringifyCsv } from "./csv";

describe("stringifyCsv", () => {
  it("quotes commas, quotes and newlines and joins with CRLF", () => {
    expect(
      stringifyCsv([
        ["a", "b,c", 'say "hi"', "x\ny"],
        ["1", "", "", ""],
      ]),
    ).toBe('a,"b,c","say ""hi""","x\ny"\r\n1,,,');
  });
});

describe("parseCsv", () => {
  it("reads quoted fields, doubled quotes and embedded newlines", () => {
    expect(parseCsv('a,"b,c","say ""hi""","x\r\ny"\r\n1,,,\r\n')).toEqual([
      ["a", "b,c", 'say "hi"', "x\r\ny"],
      ["1", "", "", ""],
    ]);
  });

  it("strips a BOM and accepts LF, CRLF and CR", () => {
    expect(parseCsv(`${BOM}a,b\n1,2\r\n3,4\r5,6`)).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
      ["5", "6"],
    ]);
  });

  it("drops blank lines but keeps an explicitly empty quoted field", () => {
    expect(parseCsv('a\n\n\nb\n""\n')).toEqual([["a"], ["b"], [""]]);
  });

  it("round-trips awkward text", () => {
    const rows = [["", " lead", "trail ", '"', ",", "\n", "é€🙂", 'a""b']];
    expect(parseCsv(stringifyCsv(rows))).toEqual(rows);
  });

  it("handles an unterminated final row without a newline", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});
