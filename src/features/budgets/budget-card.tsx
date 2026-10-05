import { View } from 'react-native';

import { Amount } from '@/components/app/amount';
import { ProgressBar } from '@/components/app/progress-bar';
import { Card } from '@/components/ui/card';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { pressScale } from '@/theme/tokens';

import { periodTitle } from './logic';
import type { BudgetView } from './model';

type BudgetCardProps = {
  view: BudgetView;
  /** Title above the amount; defaults to "This month" and friends. */
  title?: string;
  onPress?: () => void;
};

/** Progress card: period label, big amount left, 6 pt bar, spent and per-day line. */
function BudgetCard({ view, title, onPress }: BudgetCardProps) {
  const body = (
    <Card className="gap-3">
      <View className="gap-0.5">
        <Text variant="footnote" tone="secondary">
          {title ?? periodTitle(view.period)}
        </Text>
        <Amount value={view.headline} variant="hero" tone={view.status === 'over' ? 'expense' : 'default'} />
      </View>
      <ProgressBar value={view.ratio} accessibilityLabel={view.accessibilityLabel} />
      <Text variant="footnote" tone="secondary" numeric numberOfLines={1}>
        {view.detail}
      </Text>
    </Card>
  );
  if (!onPress) return body;
  return (
    <Pressable role="button" accessibilityLabel={view.accessibilityLabel} scale={pressScale.card} onPress={onPress}>
      {body}
    </Pressable>
  );
}

export { BudgetCard };
