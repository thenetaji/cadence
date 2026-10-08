import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { ScrollView, View } from "react-native";

import {
  IconTile,
  ListGroup,
  ListRow,
  barRight,
  Button,
  Text,
  AnimatedNumber,
} from "@studio/ui";
import { useRecurringRule, useTransaction } from "@/data/hooks";
import { DetailRow } from "@/features/transactions/detail-row";
import { repeatLabel } from "@/features/transactions/repeat-label";
import { ReceiptThumb } from "@/features/receipts/receipt-thumb";
import { TagPills } from "@/features/tags/tag-pill";
import { formatTime, lendingLabel } from "@/features/transactions/row-model";
import { useMoneyContext } from "@/features/transactions/use-money-context";
import { useTransactionActions } from "@/features/transactions/use-transaction-actions";
import { fullDayLabel } from "@studio/dates";
import { isLendingKind, type TransactionKind } from "@/lib/ledger";
import {
  convertWithRates,
  formatMoney,
  formatMoneyForSpeech,
  type SignMode,
} from "@studio/money";
import { Stagger } from "@studio/motion";
import type { CategoryColorKey } from "@studio/theme";

const SIGN: Record<TransactionKind, SignMode> = {
  expense: "minus",
  income: "plus",
  transfer: "none",
  lent: "minus",
  borrowed: "plus",
  repaid_to_me: "plus",
  repaid_by_me: "minus",
};

const LEND_CAPTION: Partial<Record<TransactionKind, string>> = {
  lent: "Lent",
  borrowed: "Borrowed",
  repaid_to_me: "Repaid to you",
  repaid_by_me: "You repaid",
};

function EditButton({ id }: { id: string }) {
  const actions = useTransactionActions();
  return (
    <Button variant="barPrimary" size="sm" onPress={() => actions.edit(id)}>
      Edit
    </Button>
  );
}

export default function TransactionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const item = useTransaction(id);
  const rule = useRecurringRule(item?.recurringRuleId);
  const money = useMoneyContext();
  const actions = useTransactionActions();
  const leaving = React.useRef(false);

  // Deleted elsewhere while open: pop back.
  React.useEffect(() => {
    if (!item && !leaving.current && router.canGoBack()) router.back();
  }, [item, router]);

  const itemId = item?.id;
  const headerOptions = React.useMemo(
    () => ({
      title: "",
      ...barRight(itemId ? <EditButton id={itemId} /> : null),
    }),
    [itemId],
  );

  if (!item) return <View className="flex-1 bg-bg" />;

  const { displayCurrency, locale, rates } = money;
  const sign = SIGN[item.kind];
  const isTransfer = item.kind === "transfer";
  const foreignRate =
    !isTransfer && item.currency !== displayCurrency
      ? rates(item.currency, displayCurrency)
      : null;
  const shownCurrency = foreignRate === null ? item.currency : displayCurrency;
  const shownMinor =
    foreignRate === null
      ? item.amount
      : convertWithRates(item.amount, item.currency, displayCurrency, rates);
  const amount = formatMoney(shownMinor, shownCurrency, { locale, sign });
  const transferRate =
    isTransfer && item.currency !== displayCurrency
      ? rates(item.currency, displayCurrency)
      : null;
  const transferNote =
    transferRate === null
      ? null
      : `≈ ${formatMoney(convertWithRates(item.amount, item.currency, displayCurrency, rates), displayCurrency, { locale, sign: "none", decimals: 0 })}`;
  const split = item.splits.length > 1;
  const lending = isLendingKind(item.kind);
  const title = isTransfer
    ? `${item.account.name} → ${item.transferAccount?.name ?? ""}`
    : lending
      ? item.title || lendingLabel(item.kind, item.person?.name)
      : item.title ||
        (split
          ? `${item.splits.length} categories`
          : (item.category?.name ?? "Transaction"));
  const icon = lending
    ? "loans"
    : isTransfer
      ? "arrow.left.arrow.right"
      : ((split ? item.splits[0]?.category.icon : item.category?.icon) ??
        "tag.fill");
  const color = (
    isTransfer || lending
      ? "gray"
      : ((split ? item.splits[0]?.category.color : item.category?.color) ??
        "gray")
  ) as CategoryColorKey;
  const date = `${fullDayLabel(item.dateKey)} · ${formatTime(item.occurredAt)}`;
  const memo = item.memo.trim();
  const fmt = (minor: number, currency: string) =>
    formatMoney(minor, currency, { locale, sign: "none" });

  const onDelete = () => {
    leaving.current = true;
    if (actions.remove(item.id)) {
      if (router.canGoBack()) router.back();
    } else {
      leaving.current = false;
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="pb-12"
    >
      <Stack.Screen options={headerOptions} />
      <Stagger index={0} className="items-center gap-1 px-6 pb-6 pt-4">
        <View className="mb-3">
          <IconTile icon={icon} color={color} size={64} splitBadge={split} />
        </View>
        <Text
          variant="title2"
          numberOfLines={2}
          className="text-center"
          accessibilityRole="header"
        >
          {title}
        </Text>
        <AnimatedNumber
          value={amount}
          variant="largeTitle"
          tone={
            item.kind === "income" ||
            item.kind === "borrowed" ||
            item.kind === "repaid_to_me"
              ? "income"
              : "default"
          }
          intro
          fit
          justify="center"
          className="font-semibold"
          accessibilityLabel={formatMoneyForSpeech(shownMinor, shownCurrency, {
            sign,
            locale,
          })}
        />
        <Text variant="footnote" tone="secondary" numeric>
          {date}
        </Text>
        {transferNote ? (
          <Text variant="footnote" tone="secondary" numeric>
            {transferNote}
          </Text>
        ) : null}
      </Stagger>

      <View className="gap-6">
        {split ? (
          <Stagger index={1}>
            <ListGroup header="Split">
              {item.splits.map((line) => (
                <DetailRow
                  key={line.id}
                  label={line.category.name}
                  value={fmt(line.amount, item.currency)}
                  numeric
                  leading={{
                    icon: line.category.icon,
                    color: line.category.color as CategoryColorKey,
                  }}
                />
              ))}
            </ListGroup>
          </Stagger>
        ) : null}

        <Stagger index={2}>
          <ListGroup>
            {item.person ? (
              <DetailRow
                label="Person"
                value={item.person.name}
                caption={LEND_CAPTION[item.kind]}
                chevron
                onPress={() =>
                  router.push({
                    pathname: "/people/[id]",
                    params: { id: item.person?.id ?? "" },
                  })
                }
              />
            ) : null}
            {!split && !isTransfer && item.category ? (
              <DetailRow
                label="Category"
                value={item.category.name}
                tile={{
                  icon: item.category.icon,
                  color: item.category.color as CategoryColorKey,
                }}
              />
            ) : null}
            {isTransfer ? (
              <DetailRow
                label="From"
                value={item.account.name}
                caption={fmt(item.amount, item.currency)}
                tile={{
                  icon: item.account.icon,
                  color: item.account.color as CategoryColorKey,
                }}
              />
            ) : (
              <DetailRow
                label="Account"
                value={item.account.name}
                tile={{
                  icon: item.account.icon,
                  color: item.account.color as CategoryColorKey,
                }}
              />
            )}
            {isTransfer && item.transferAccount ? (
              <DetailRow
                label="To"
                value={item.transferAccount.name}
                caption={fmt(
                  item.transferAmount ?? item.amount,
                  item.transferCurrency ?? item.currency,
                )}
                tile={{
                  icon: item.transferAccount.icon,
                  color: item.transferAccount.color as CategoryColorKey,
                }}
              />
            ) : null}
            {foreignRate !== null ? (
              <DetailRow
                label="Original amount"
                value={`${fmt(item.amount, item.currency)} · rate ${Number(foreignRate.toFixed(4))}`}
                numeric
              />
            ) : null}
          </ListGroup>
        </Stagger>

        {item.tags.length > 0 ? (
          <Stagger index={3}>
            <ListGroup header="Tags">
              <View className="bg-surface px-4 py-3.5">
                <TagPills
                  tags={item.tags}
                  onPressTag={(tagId) =>
                    router.push({
                      pathname: "/tags/[id]",
                      params: { id: tagId },
                    })
                  }
                />
              </View>
            </ListGroup>
          </Stagger>
        ) : null}

        {item.attachments.length > 0 ? (
          <Stagger index={3}>
            <ListGroup header="Receipt">
              <View className="flex-row flex-wrap gap-3 bg-surface px-4 py-3.5">
                {item.attachments.map((a) => (
                  <ReceiptThumb
                    key={a.id}
                    uri={a.uri}
                    size={84}
                    onPress={() =>
                      router.push({
                        pathname: "/transaction/receipt",
                        params: {
                          uri: a.uri,
                          w: String(a.width ?? 0),
                          h: String(a.height ?? 0),
                        },
                      })
                    }
                  />
                ))}
              </View>
            </ListGroup>
          </Stagger>
        ) : null}

        {memo || rule ? (
          <Stagger index={3}>
            <ListGroup>
              {memo ? <DetailRow label="Memo" value={memo} stacked /> : null}
              {rule ? (
                <DetailRow
                  label="Repeats"
                  value={repeatLabel(rule)}
                  chevron
                  onPress={() =>
                    router.push({
                      pathname: "/recurring/[id]",
                      params: { id: rule.id },
                    })
                  }
                />
              ) : null}
            </ListGroup>
          </Stagger>
        ) : null}
      </View>

      <Stagger index={4} className="gap-6 pt-6">
        <View className="px-4">
          <Button
            variant="secondary"
            size="lg"
            onPress={() => actions.duplicate(item.id)}
          >
            Duplicate
          </Button>
        </View>
        <ListGroup>
          <ListRow label="Delete" destructive centered onPress={onDelete} />
        </ListGroup>
      </Stagger>
    </ScrollView>
  );
}
