import { useRouter } from "expo-router";
import * as React from "react";
import { AppState, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSetting } from "@/data/hooks";
import { SymbolIcon, Pressable, Text } from "@studio/ui";
import { useTokens } from "@studio/theme";

import { greetingFor } from "./curve";

/** Time-aware greeting; recomputed whenever the app returns to the foreground. */
function useGreeting(): string {
  const [greeting, setGreeting] = React.useState(() =>
    greetingFor(new Date().getHours()),
  );
  React.useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") setGreeting(greetingFor(new Date().getHours()));
    });
    return () => sub.remove();
  }, []);
  return greeting;
}

function CircleButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: string;
  onPress: () => void;
}) {
  const { colors } = useTokens();
  return (
    <Pressable
      role="button"
      accessibilityLabel={label}
      hitSlop={6}
      haptic="light"
      scale={0.92}
      onPress={onPress}
      className="h-[34px] w-[34px] items-center justify-center rounded-full bg-surface"
      style={{
        borderWidth: StyleSheet.hairlineWidth * 2,
        borderColor: colors.border,
      }}
    >
      <SymbolIcon
        name={icon}
        size={17}
        color={colors.textSecondary}
        weight="medium"
      />
    </Pressable>
  );
}

/** Greeting on the left; hide-amounts eye and settings circle on the right. */
function HomeTopBar() {
  const router = useRouter();
  const greeting = useGreeting();
  const [hidden, setHidden] = useSetting("hide_amounts");
  return (
    <SafeAreaView edges={["top"]} className="bg-bg">
      <View className="h-11 flex-row items-center justify-between px-4">
        <Text
          variant="subhead"
          accessibilityRole="header"
          className="font-semibold"
        >
          {greeting}
        </Text>
        <View className="flex-row items-center gap-2">
          <CircleButton
            label={hidden ? "Show amounts" : "Hide amounts"}
            icon={hidden ? "eye-off" : "eye"}
            onPress={() => setHidden(!hidden)}
          />
          <CircleButton
            label="Settings"
            icon="gearshape"
            onPress={() => router.push("/settings")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

export { HomeTopBar };
