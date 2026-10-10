import * as React from "react";
import { ScrollView } from "react-native";

import { Chip, OptionPicker } from "@studio/ui";
import { useAccounts, useTags } from "@/data/hooks";
import type { InsightsScope } from "@/lib/insights";

type ScopeBarProps = {
  scope: InsightsScope;
  onChange: (scope: InsightsScope) => void;
};

type Picking = "account" | "tag" | null;

/** `All accounts ▾` `All tags ▾`: narrows every Insights figure to one account and/or one tag. */
function ScopeBar({ scope, onChange }: ScopeBarProps) {
  const accounts = useAccounts({ includeArchived: true });
  const tags = useTags();
  const [picking, setPicking] = React.useState<Picking>(null);

  const account = accounts.find((a) => a.id === scope.accountId);
  const tag = tags.find((t) => t.id === scope.tagId);
  // Nothing to narrow: one account and no tags.
  if (accounts.length < 2 && tags.length === 0) return null;

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 px-4 pt-2"
      >
        {accounts.length > 1 ? (
          <Chip
            label={account?.name ?? "All accounts"}
            selected={account !== undefined}
            trailingIcon="chevron.down"
            accessibilityLabel={`Account, ${account?.name ?? "all accounts"}`}
            onPress={() => setPicking("account")}
          />
        ) : null}
        {tags.length > 0 ? (
          <Chip
            label={tag ? `#${tag.name}` : "All tags"}
            selected={tag !== undefined}
            trailingIcon="chevron.down"
            accessibilityLabel={`Tag, ${tag?.name ?? "all tags"}`}
            onPress={() => setPicking("tag")}
          />
        ) : null}
        {account || tag ? (
          <Chip
            label="Clear"
            icon="xmark.circle.fill"
            onPress={() => onChange({ accountId: null, tagId: null })}
          />
        ) : null}
      </ScrollView>
      <OptionPicker<string | null>
        visible={picking === "account"}
        title="Account"
        options={[
          { value: null, label: "All accounts" },
          ...accounts
            .filter((a) => a.archivedAt === null || a.id === scope.accountId)
            .map((a) => ({ value: a.id, label: a.name })),
        ]}
        selected={scope.accountId ?? null}
        onSelect={(accountId) => onChange({ ...scope, accountId })}
        onClose={() => setPicking(null)}
      />
      <OptionPicker<string | null>
        visible={picking === "tag"}
        title="Tag"
        options={[
          { value: null, label: "All tags" },
          ...tags.map((t) => ({ value: t.id, label: t.name })),
        ]}
        selected={scope.tagId ?? null}
        onSelect={(tagId) => onChange({ ...scope, tagId })}
        onClose={() => setPicking(null)}
      />
    </>
  );
}

export { ScopeBar };
