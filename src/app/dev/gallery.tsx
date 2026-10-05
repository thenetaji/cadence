import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Amount } from '@/components/app/amount';
import { AmountReadout } from '@/components/app/amount-readout';
import { CategoryChip, Chip } from '@/components/app/chip';
import { DaySectionHeader } from '@/components/app/day-section-header';
import { EmptyState } from '@/components/app/empty-state';
import { FloatingAddButton } from '@/components/app/floating-add-button';
import { IconTile } from '@/components/app/icon-tile';
import { Keypad } from '@/components/app/keypad';
import { ListGroup, ListRow } from '@/components/app/list-group';
import { ProgressBar } from '@/components/app/progress-bar';
import { SectionHeader } from '@/components/app/section-header';
import { SummaryStrip } from '@/components/app/summary-strip';
import { showToast } from '@/components/app/toast-store';
import { TransactionRow } from '@/components/app/transaction-row';
import { UndoToast } from '@/components/app/undo-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { categoryKeys, typeScale, type TypeVariant } from '@/theme/tokens';

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text variant="footnote" tone="tertiary" className="px-4 uppercase">
        {title}
      </Text>
      {children}
    </View>
  );
}

const typeNames = Object.keys(typeScale) as TypeVariant[];

export default function Gallery() {
  const insets = useSafeAreaInsets();
  const [segment, setSegment] = React.useState(0);
  const [kind, setKind] = React.useState(0);
  const [on, setOn] = React.useState(true);
  const [selectedCat, setSelectedCat] = React.useState('Groceries');
  const [chip, setChip] = React.useState(true);

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 48, gap: 32 }}
    >
      <Text variant="largeTitle" className="px-4">
        Gallery
      </Text>

      <Block title="Type">
        <Card className="mx-4 gap-1">
          {typeNames.map((name) => (
            <Text key={name} variant={name} numberOfLines={1}>
              {name} 1,23,456.78
            </Text>
          ))}
          <Text variant="body" tone="secondary">Secondary</Text>
          <Text variant="body" tone="tertiary">Tertiary</Text>
          <Text variant="body" tone="accent">Accent</Text>
          <Text variant="body" tone="income">Income</Text>
          <Text variant="body" tone="expense">Expense</Text>
          <Text variant="body" tone="warning">Warning</Text>
        </Card>
      </Block>

      <Block title="Amounts">
        <Card className="mx-4 gap-3">
          <Amount variant="hero" value="₹1,24,560.00" />
          <Amount variant="hero" value="−₹99,99,99,999.99" />
          <Amount variant="title" value="₹12,400" />
          <Amount variant="title" value="+₹85,000.00" tone="income" />
          <Amount variant="row" value="−₹1,240.00" />
          <Amount variant="row" value="−₹99,99,99,999.99" />
        </Card>
      </Block>

      <Block title="Buttons">
        <View className="gap-3 px-4">
          <Button size="lg">Add transaction</Button>
          <Button variant="secondary">Duplicate</Button>
          <Button variant="ghost">Export CSV</Button>
          <View className="flex-row items-center justify-between">
            <Button variant="plainText">Cancel</Button>
            <Button variant="destructiveText">Delete rule</Button>
            <Button size="sm" variant="secondary">Small</Button>
          </View>
          <View className="flex-row gap-3">
            <Button loading className="flex-1">Saving</Button>
            <Button disabled className="flex-1">Disabled</Button>
          </View>
        </View>
      </Block>

      <Block title="Fields">
        <View className="gap-3 px-4">
          <Input placeholder="Title" />
          <Input value="Swiggy" onChangeText={() => undefined} />
          <Card className="py-0">
            <Input variant="inline" placeholder="Memo" />
            <Separator />
            <Input variant="inline" placeholder="Title" />
          </Card>
          <SegmentedControl values={['Expense', 'Income', 'Transfer']} selectedIndex={kind} onChange={setKind} />
          <SegmentedControl values={['Week', 'Month', 'Year', 'Custom']} selectedIndex={segment} onChange={setSegment} />
          <View className="flex-row items-center gap-4">
            <Switch value={on} onValueChange={setOn} />
            <Switch value={false} />
            <Badge label="Paused" />
            <Badge variant="accent" label="Default" />
            <Badge variant="income" label="+12%" />
            <Badge variant="warning" label="90%" />
          </View>
        </View>
      </Block>

      <Block title="Skeleton">
        <Card className="mx-4 gap-2">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </Card>
      </Block>

      <Block title="Icon tiles">
        <View className="flex-row flex-wrap gap-3 px-4">
          {categoryKeys.map((key) => (
            <IconTile key={key} icon="fork.knife" color={key} />
          ))}
          <IconTile icon="cart.fill" color="green" splitBadge />
        </View>
      </Block>

      <Block title="Chips">
        <View className="gap-3 px-4">
          <View className="flex-row flex-wrap gap-2">
            <Chip label="Expense" selected={chip} onPress={() => setChip((v) => !v)} />
            <Chip label="Income" selected={!chip} onPress={() => setChip((v) => !v)} />
            <Chip label="HDFC" icon="creditcard" trailingIcon="chevron.down" />
            <Chip label="Today 14:32" icon="calendar" />
            <Chip label="Swiggy" hint="₹340" />
          </View>
          <View className="flex-row flex-wrap gap-2">
            {[
              ['Groceries', 'cart.fill', 'green'],
              ['Food & Drink', 'fork.knife', 'red'],
              ['Transport', 'car.fill', 'blue'],
              ['Shopping', 'bag.fill', 'pink'],
            ].map(([name, icon, color]) => (
              <CategoryChip
                key={name}
                name={name}
                icon={icon}
                color={color as (typeof categoryKeys)[number]}
                selected={selectedCat === name}
                onPress={() => setSelectedCat(name)}
              />
            ))}
          </View>
        </View>
      </Block>

      <Block title="Progress">
        <Card className="mx-4 gap-4">
          <ProgressBar value={0.3} />
          <ProgressBar value={0.95} />
          <ProgressBar value={1.2} />
          <ProgressBar value={0.6} color="#E5484D" />
        </Card>
      </Block>

      <Block title="Summary">
        <View className="px-4">
          <SummaryStrip
            items={[
              { label: 'Spent', value: '−₹42,310.00' },
              { label: 'Earned', value: '+₹85,000.00', tone: 'income' },
            ]}
          />
        </View>
      </Block>

      <Block title="Rows">
        <View>
          <DaySectionHeader label="Today" total="−₹1,580.00" />
          <TransactionRow kind="expense" title="Swiggy" subtitle="Food & Drink · HDFC" amount="−₹340.00" trailing="14:32" icon="fork.knife" color="red" onDelete={() => undefined} onDuplicate={() => undefined} />
          <TransactionRow kind="income" title="Salary" subtitle="Salary · HDFC" amount="+₹85,000.00" trailing="09:00" icon="banknote.fill" color="green" onDelete={() => undefined} />
          <TransactionRow kind="expense" title="Big Basket weekly groceries and household" subtitle="3 categories · Cash" amount="−₹1,240.00" trailing="11:05" icon="cart.fill" color="green" split />
          <TransactionRow kind="transfer" title="Cash → HDFC" subtitle="Transfer" amount="₹5,000.00" trailing="10:12" icon="arrow.left.arrow.right" color="gray" />
          <TransactionRow kind="expense" title="Figma" subtitle="Subscriptions · Card" amount="−$12.00" trailing="≈ ₹1,000" icon="arrow.triangle.2.circlepath" color="indigo" />
          <TransactionRow kind="expense" title="Villa down payment" subtitle="Housing · HDFC" amount="−₹99,99,99,999.99" trailing="Mon" icon="house.fill" color="brown" separator={false} />
        </View>
      </Block>

      <Block title="Section header">
        <SectionHeader title="Recent" actionLabel="All" />
      </Block>

      <Block title="Readout">
        <View className="gap-2">
          <AmountReadout symbol="₹" value="1,23,456.78" expression="1,200 + 340" />
          <AmountReadout symbol="₹" value="0" />
          <AmountReadout symbol="₹" value="99,99,99,99,999.99" />
        </View>
      </Block>

      <Block title="Keypad">
        <View className="gap-4">
          <Keypad onKey={() => undefined} />
          <Keypad onKey={() => undefined} saveMode showDecimal={false} />
        </View>
      </Block>

      <Block title="List group">
        <View className="gap-6">
          <ListGroup header="General" footer="Rates are manual.">
            <ListRow label="Display currency" icon={{ name: 'banknote.fill', color: 'green' }} value="INR ₹" chevron onPress={() => undefined} />
            <ListRow label="Theme" icon={{ name: 'paintbrush.fill', color: 'indigo' }} value="System" chevron onPress={() => undefined} />
            <ListRow label="Haptics" icon={{ name: 'iphone', color: 'orange' }} switchValue={on} onSwitchChange={setOn} />
          </ListGroup>
          <ListGroup>
            <ListRow label="Export" chevron onPress={() => undefined} />
            <ListRow label="Erase all data" destructive onPress={() => undefined} />
          </ListGroup>
        </View>
      </Block>

      <Block title="Empty state">
        <EmptyState message="No transactions yet" actionLabel="Add transaction" onAction={() => undefined} />
      </Block>

      <Block title="Toast">
        <View className="gap-3 px-4">
          <UndoToast message="Deleted" actionLabel="Undo" onAction={() => undefined} />
          <Button variant="secondary" onPress={() => showToast({ message: 'Deleted', actionLabel: 'Undo' })}>
            Show toast
          </Button>
        </View>
      </Block>

      <Block title="Add button">
        <View className="items-end px-4">
          <FloatingAddButton onPress={() => undefined} />
        </View>
      </Block>
    </ScrollView>
  );
}
