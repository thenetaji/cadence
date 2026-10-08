import { View } from "react-native";

import { Amount, ProgressBar, Card, Pressable, Text } from "@studio/ui";
import { pressScale } from "@studio/theme";

import type { BudgetView } from "./model";

type BudgetCardProps = {
  view: BudgetView;
  /** Title above the amount; defaults to "This month", or the month's name when not current. */
  title?: string;
  onPress?: () => void;
};

/** Progress card: period label, big amount left, 6 pt bar, spent and per-day line. */
function BudgetCard({ view, title, onPress }: BudgetCardProps) {
  const body = (
    <Card className="gap-3">
      <View className="gap-0.5">
        <Text variant="footnote" tone="secondary">
          {title ?? view.caption}
        </Text>
        <Amount
          value={view.headline}
          variant="hero"
          animate
          tone={view.status === "over" ? "expense" : "default"}
        />
      </View>
      <ProgressBar
        value={view.ratio}
        marker={view.marker}
        accessibilityLabel={view.accessibilityLabel}
      />
      <Text variant="footnote" tone="secondary" numeric numberOfLines={1}>
        {view.detail}
      </Text>
    </Card>
  );
  if (!onPress) return body;
  return (
    <Pressable
      role="button"
      accessibilityLabel={view.accessibilityLabel}
      scale={pressScale.card}
      onPress={onPress}
    >
      {body}
    </Pressable>
  );
}

export { BudgetCard };
