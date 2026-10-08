import { Stack, useRouter } from "expo-router";
import * as React from "react";
import { ScrollView, View } from "react-native";

import {
  Amount,
  EmptyState,
  HeaderButton,
  barRight,
  Card,
  Pressable,
  Text,
} from "@studio/ui";
import { useOutstanding, useOutstandingTotals } from "@/data/hooks";
import { useMoneyContext } from "@/features/transactions/use-money-context";
import { AppIcon } from "@studio/icons";
import { formatMoney, formatMoneyForSpeech } from "@studio/money";
import { Stagger } from "@studio/motion";
import { useTokens } from "@studio/theme";

import { balanceLine } from "./model";
import { PersonRowLine } from "./person-row";

/** Who owes whom: two totals up top, a row per person, settled people collapsed at the bottom. */
export function PeopleScreen() {
  const router = useRouter();
  const { colors } = useTokens();
  const money = useMoneyContext();
  const totals = useOutstandingTotals();
  const everyone = useOutstanding({ includeSettled: true });
  const [showSettled, setShowSettled] = React.useState(false);

  const open = everyone.filter((o) => o.balances.length > 0);
  const settled = everyone.filter((o) => o.balances.length === 0);
  const decimals = money.showDecimals ? undefined : 0;
  const fmt = (minor: number) =>
    formatMoney(minor, totals.currency, {
      locale: money.locale,
      sign: "none",
      decimals,
    });
  const lend = () =>
    router.push({ pathname: "/transaction/new", params: { kind: "lent" } });

  const header = (
    <Stack.Screen
      options={{
        title: "People",
        ...barRight(
          <HeaderButton symbol="plus" label="Lend money" onPress={lend} />,
        ),
      }}
    />
  );

  if (everyone.length === 0) {
    return (
      <View className="flex-1 justify-center bg-bg pb-24">
        {header}
        <EmptyState
          message="No one owes you"
          icon="loans"
          actionLabel="Lend money"
          onAction={lend}
        />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="gap-6 pb-12 pt-2"
    >
      {header}
      <Stagger index={0} className="gap-4 px-4">
        <View>
          <Text variant="footnote" tone="secondary">
            Owed to you
          </Text>
          <Amount
            value={fmt(totals.owedToMe)}
            variant="hero"
            animate="intro"
            tone={totals.owedToMe > 0 ? "income" : "default"}
            accessibilityLabel={`Owed to you, ${formatMoneyForSpeech(totals.owedToMe, totals.currency, { sign: "none", locale: money.locale })}`}
          />
        </View>
        <View className="flex-row items-baseline gap-2">
          <Text variant="subhead" tone="secondary">
            You owe
          </Text>
          <Amount
            value={fmt(totals.iOwe)}
            variant="title"
            animate="intro"
            accessibilityLabel={`You owe, ${formatMoneyForSpeech(totals.iOwe, totals.currency, { sign: "none", locale: money.locale })}`}
          />
        </View>
      </Stagger>

      {open.length > 0 ? (
        <Stagger index={1}>
          <Card className="mx-4 p-0">
            {open.map((o, i) => (
              <PersonRowLine
                key={o.person.id}
                name={o.person.name}
                line={balanceLine(o.balances, {
                  locale: money.locale,
                  decimals,
                })}
                separator={i < open.length - 1}
                onPress={() =>
                  router.push({
                    pathname: "/people/[id]",
                    params: { id: o.person.id },
                  })
                }
              />
            ))}
          </Card>
        </Stagger>
      ) : (
        <Stagger index={1}>
          <Text variant="callout" tone="secondary" className="px-4">
            All settled
          </Text>
        </Stagger>
      )}

      {settled.length > 0 ? (
        <Stagger index={2}>
          <Pressable
            role="button"
            accessibilityLabel={`Settled, ${settled.length}`}
            accessibilityState={{ expanded: showSettled }}
            scale={1}
            dimTo={0.6}
            onPress={() => setShowSettled((v) => !v)}
            className="min-h-11 flex-row items-center gap-1.5 px-4"
          >
            <Text variant="footnote" tone="secondary">
              Settled · {settled.length}
            </Text>
            <AppIcon
              name={showSettled ? "chevron-up" : "chevron-down"}
              size={10}
              color={colors.textTertiary}
            />
          </Pressable>
          {showSettled ? (
            <Card className="mx-4 mt-1 p-0">
              {settled.map((o, i) => (
                <PersonRowLine
                  key={o.person.id}
                  name={o.person.name}
                  line={{ text: "settled", tone: "secondary" }}
                  separator={i < settled.length - 1}
                  onPress={() =>
                    router.push({
                      pathname: "/people/[id]",
                      params: { id: o.person.id },
                    })
                  }
                />
              ))}
            </Card>
          ) : null}
        </Stagger>
      ) : null}
    </ScrollView>
  );
}
