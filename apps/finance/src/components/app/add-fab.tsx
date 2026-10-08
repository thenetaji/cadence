import { useRouter } from "expo-router";
import { ActionSheetIOS, Alert, Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FloatingAddButton } from "@studio/ui";
import { haptic } from "@studio/theme";

type Kind = "expense" | "income" | "transfer";

const kinds: readonly { kind: Kind; label: string }[] = [
  { kind: "expense", label: "Expense" },
  { kind: "income", label: "Income" },
  { kind: "transfer", label: "Transfer" },
];

function AddFab() {
  const router = useRouter();
  const open = (kind: Kind) =>
    router.push({ pathname: "/transaction/new", params: { kind } });

  const showMenu = () => {
    haptic("medium");
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...kinds.map((k) => k.label), "Cancel"],
          cancelButtonIndex: kinds.length,
        },
        (index) => {
          const picked = kinds[index];
          if (picked) open(picked.kind);
        },
      );
      return;
    }
    Alert.alert("Add", undefined, [
      ...kinds.map((k) => ({ text: k.label, onPress: () => open(k.kind) })),
      { text: "Cancel", style: "cancel" as const },
    ]);
  };

  return (
    <SafeAreaView
      edges={["bottom"]}
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        justifyContent: "flex-end",
      }}
    >
      <View
        pointerEvents="box-none"
        style={{ alignItems: "flex-end", padding: 16 }}
      >
        <FloatingAddButton
          accessibilityLabel="Add transaction"
          onPress={() => router.push("/transaction/new")}
          onLongPress={showMenu}
        />
      </View>
    </SafeAreaView>
  );
}

export { AddFab };
