import * as React from "react";
import { Linking, ScrollView, View } from "react-native";

import { ListGroup, ListRow, Button, Card, Text } from "@studio/ui";
import { useActions } from "@/data/actions";
import { useSetting } from "@/data/hooks";
import { Stagger } from "@studio/motion";
import { haptic } from "@studio/theme";

import { TimeField } from "./time-field";

type Permission = "granted" | "denied" | "undetermined" | "unsupported";

/** Daily reminder with a time, bill and budget alerts, and the denied-permission state. */
export function RemindersScreen() {
  const actions = useActions();
  const [daily, setDaily] = useSetting("reminder_daily_enabled");
  const [time, setTime] = useSetting("reminder_daily_time");
  const [bills, setBills] = useSetting("reminder_bills");
  const [budgets, setBudgets] = useSetting("reminder_budgets");
  const [permission, setPermission] =
    React.useState<Permission>("undetermined");

  React.useEffect(() => {
    // Reads the current permission without prompting.
    let live = true;
    actions.reminders
      .reschedule()
      .then((result) => live && setPermission(result.permission))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [actions]);

  const toggle = (set: (value: boolean) => void) => (next: boolean) => {
    set(next);
    if (!next) return;
    actions.reminders
      .enable()
      .then((result) => {
        setPermission(result);
        if (result === "denied") haptic("warning");
      })
      .catch(() => undefined);
  };

  const denied = permission === "denied" && (daily || bills || budgets);

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="gap-6 py-4 pb-12"
    >
      {denied ? (
        <Stagger index={0} className="px-4">
          <Card className="gap-3">
            <Text variant="headline">Notifications are off</Text>
            <Text variant="subhead" tone="secondary">
              Allow them in Settings to get reminders.
            </Text>
            <View className="flex-row">
              <Button
                variant="secondary"
                size="sm"
                onPress={() => void Linking.openSettings()}
              >
                Open Settings
              </Button>
            </View>
          </Card>
        </Stagger>
      ) : null}
      <Stagger index={1}>
        <ListGroup>
          <ListRow
            label="Daily reminder"
            icon={{ name: "bell", color: "red" }}
            switchValue={daily}
            onSwitchChange={toggle(setDaily)}
          />
          {daily ? (
            <ListRow
              label="Time"
              icon={{ name: "clock", color: "orange" }}
              trailing={<TimeField value={time} onChange={setTime} />}
            />
          ) : null}
        </ListGroup>
      </Stagger>
      <Stagger index={2}>
        <ListGroup>
          <ListRow
            label="Bills due"
            icon={{ name: "bill", color: "blue" }}
            switchValue={bills}
            onSwitchChange={toggle(setBills)}
          />
          <ListRow
            label="Budget alerts"
            icon={{ name: "budgets", color: "amber" }}
            switchValue={budgets}
            onSwitchChange={toggle(setBudgets)}
          />
        </ListGroup>
      </Stagger>
    </ScrollView>
  );
}
