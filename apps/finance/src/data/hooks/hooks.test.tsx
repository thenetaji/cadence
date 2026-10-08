/** @jest-environment node */
import { createElement, type ReactNode } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { DatabaseContext } from "@/db/context";
import { at, categoryId, createTestDb, makeAccounts } from "@/db/test-helpers";
import type { Db } from "@/db/types";
import { useActions } from "../actions";
import {
  useAccounts,
  useCategories,
  useRecentTransactions,
  useSetting,
  usePeriodSummary,
} from "./index";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function renderHook<T>(db: Db, hook: () => T) {
  const result: { current: T | undefined } = { current: undefined };
  function Probe(): ReactNode {
    result.current = hook();
    return null;
  }
  let renderer: ReactTestRenderer | undefined;
  act(() => {
    renderer = create(
      createElement(
        DatabaseContext.Provider,
        { value: db },
        createElement(Probe),
      ),
    );
  });
  return {
    get value(): T {
      if (result.current === undefined) throw new Error("hook did not render");
      return result.current;
    },
    unmount: () => act(() => renderer?.unmount()),
  };
}

const flush = () =>
  act(async () => {
    await Promise.resolve();
  });

describe("live hooks", () => {
  it("update immediately after writes made through useActions", async () => {
    const db = createTestDb();
    const { cash } = makeAccounts(db);
    const groceries = categoryId(db, "Groceries");
    const hooks = renderHook(db, () => ({
      actions: useActions(),
      accounts: useAccounts(),
      recent: useRecentTransactions(5),
      summary: usePeriodSummary({ from: "2026-10-01", to: "2026-10-31" }),
    }));

    expect(hooks.value.recent).toHaveLength(0);
    expect(hooks.value.accounts.find((a) => a.id === cash.id)?.balance).toBe(
      100000,
    );

    act(() => {
      hooks.value.actions.transactions.create({
        kind: "expense",
        amount: 25000,
        accountId: cash.id,
        categoryId: groceries,
        occurredAt: at("2026-10-02"),
      });
    });
    await flush();

    expect(hooks.value.recent).toHaveLength(1);
    expect(hooks.value.accounts.find((a) => a.id === cash.id)?.balance).toBe(
      75000,
    );
    expect(hooks.value.summary.spent).toBe(25000);
    hooks.unmount();
  });

  it("exposes settings and categories reactively", async () => {
    const db = createTestDb();
    const hooks = renderHook(db, () => {
      const [theme, setTheme] = useSetting("theme");
      return {
        theme,
        setTheme,
        expense: useCategories("expense"),
        income: useCategories("income"),
      };
    });
    expect(hooks.value.theme).toBe("system");
    expect(hooks.value.expense).toHaveLength(13);
    expect(hooks.value.income).toHaveLength(6);
    act(() => hooks.value.setTheme("dark"));
    await flush();
    expect(hooks.value.theme).toBe("dark");
    hooks.unmount();
  });
});
