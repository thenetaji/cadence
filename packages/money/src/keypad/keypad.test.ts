import {
  createKeypadState,
  deriveKeypad,
  keypadReducer,
  type KeypadKey,
} from "./reducer";

const press = (keys: KeypadKey[], digits = 2, initial = 0) =>
  keys.reduce(keypadReducer, createKeypadState(digits, initial));
const view = (keys: KeypadKey[], digits = 2, locale = "en-US") =>
  deriveKeypad(press(keys, digits), locale);

describe("keypad digits", () => {
  it("starts empty and not saveable", () => {
    const v = deriveKeypad(createKeypadState(2), "en-US");
    expect(v).toMatchObject({
      display: "0",
      isEmpty: true,
      expression: "",
      total: 0,
      canSave: false,
      equalsIsSave: true,
    });
  });

  it("accumulates integer digits into minor units", () => {
    const v = view(["1", "2", "5"]);
    expect(v.display).toBe("125");
    expect(v.total).toBe(12500);
    expect(v.canSave).toBe(true);
  });

  it("drops leading zeros", () => {
    expect(view(["0", "0", "7"]).display).toBe("7");
    expect(view(["0"]).display).toBe("0");
    expect(view(["0"]).canSave).toBe(false);
  });

  it("handles 00 as two zeros and respects the cap", () => {
    expect(view(["5", "00"]).display).toBe("500");
    expect(view(["0", "00", "4"]).display).toBe("4");
  });

  it("caps at 12 integer digits", () => {
    const keys = Array<KeypadKey>(14).fill("9");
    const v = view(keys);
    expect(v.display).toBe("999,999,999,999");
    expect(v.total).toBe(99999999999900);
    expect(view([...Array<KeypadKey>(11).fill("1"), "00"]).display).toBe(
      "111,111,111,110",
    );
  });

  it("groups per locale", () => {
    expect(view(["1", "2", "3", "4", "5", "6"], 2, "en-IN").display).toBe(
      "1,23,456",
    );
    expect(view(["1", "2", "3", "4", ".", "5"], 2, "de-DE").display).toBe(
      "1.234,5",
    );
  });

  it("stops decimal input at the minor digits", () => {
    const v = view(["1", ".", "2", "3", "4"]);
    expect(v.display).toBe("1.23");
    expect(v.total).toBe(123);
    expect(view(["1", ".", "5"]).total).toBe(150);
    expect(view([".", "5"]).display).toBe("0.5");
    expect(view(["1", ".", ".", "2"]).display).toBe("1.2");
    expect(view(["1", "."]).display).toBe("1.");
  });

  it("ignores the dot for 0-decimal currencies", () => {
    const v = view(["1", ".", "5"], 0);
    expect(v.display).toBe("15");
    expect(v.total).toBe(15);
  });

  it("supports 3-decimal currencies", () => {
    expect(view(["1", ".", "2", "3", "4", "5"], 3).total).toBe(1234);
  });
});

describe("keypad backspace and clear", () => {
  it("removes digits then the dot", () => {
    expect(view(["1", "2", "back"]).display).toBe("1");
    expect(view(["1", ".", "5", "back"]).display).toBe("1.");
    expect(view(["1", ".", "5", "back", "back"]).display).toBe("1");
    expect(view(["5", "back"]).isEmpty).toBe(true);
    expect(view(["back"]).isEmpty).toBe(true);
  });

  it("clears everything including a pending expression", () => {
    const v = view(["1", "+", "2", "clear"]);
    expect(v).toMatchObject({ isEmpty: true, expression: "", total: 0 });
  });

  it("backspace on an empty entry undoes the operator and restores the number", () => {
    const state = press(["1", "2", "+", "back"]);
    expect(deriveKeypad(state, "en-US")).toMatchObject({
      display: "12",
      expression: "",
      equalsIsSave: true,
    });
    const chained = press(["1", "+", "2", "-", "back"]);
    expect(deriveKeypad(chained, "en-US")).toMatchObject({
      display: "2",
      expression: "1 +",
    });
  });
});

describe("keypad expressions", () => {
  it("evaluates + and − in integer minor units", () => {
    const v = view(["1", "0", "0", "+", "2", "0", "0", "-", "5", "0"]);
    expect(v.total).toBe(25000);
    expect(v.expression).toBe("100 + 200 −");
    expect(v.display).toBe("50");
    expect(v.equalsIsSave).toBe(false);
  });

  it("has no float drift", () => {
    expect(view(["0", ".", "1", "+", "0", ".", "2"]).total).toBe(30);
    expect(
      view([
        "1",
        ".",
        "1",
        "0",
        "+",
        "2",
        ".",
        "2",
        "0",
        "+",
        "3",
        ".",
        "3",
        "0",
      ]).total,
    ).toBe(660);
  });

  it("equals collapses to the total and then acts as Save", () => {
    const state = press(["1", "0", "0", "+", "2", "5", ".", "5", "="]);
    const v = deriveKeypad(state, "en-US");
    expect(v).toMatchObject({
      display: "125.5",
      expression: "",
      total: 12550,
      equalsIsSave: true,
    });
  });

  it("equals with a dangling operator keeps the running total", () => {
    expect(deriveKeypad(press(["4", "+", "="]), "en-US")).toMatchObject({
      display: "4",
      equalsIsSave: true,
    });
  });

  it("a non-positive result collapses to empty", () => {
    const state = press(["5", "-", "9", "="]);
    expect(deriveKeypad(state, "en-US")).toMatchObject({
      isEmpty: true,
      canSave: false,
    });
  });

  it("cannot save while the total is not positive", () => {
    expect(view(["5", "-", "9"]).canSave).toBe(false);
    expect(view(["5", "-", "9"]).total).toBe(-400);
  });

  it("changes the pending operator when pressed twice and ignores a leading operator", () => {
    expect(view(["5", "+", "-", "2"]).total).toBe(300);
    expect(view(["+", "-", "3"]).total).toBe(300);
    expect(view(["+"]).expression).toBe("");
  });

  it("equals is a no-op when nothing is pending", () => {
    expect(view(["7", "="]).display).toBe("7");
  });

  it("formats terms with locale and decimals in the expression", () => {
    expect(
      view(["1", "2", "3", "4", ".", "5", "+"], 2, "en-US").expression,
    ).toBe("1,234.5 +");
  });

  it("can be seeded from a stored amount", () => {
    const v = deriveKeypad(press([], 2, 123456), "en-IN");
    expect(v.display).toBe("1,234.56");
    expect(deriveKeypad(press([], 2, 1200), "en-US").display).toBe("12");
    expect(deriveKeypad(press([], 0, 500), "en-US").total).toBe(500);
  });

  it("clamps the expression total to the cap", () => {
    const nines = Array<KeypadKey>(12).fill("9");
    const v = view([...nines, "+", ...nines, "="]);
    expect(v.total).toBe(99999999999999);
  });
});
