import * as React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";

type EntryLayoutProps = {
  /** Scrolling content: the readout first, then the grouped fields. */
  children: React.ReactNode;
  /** Pinned under the content; omitted while a text field has the keyboard. */
  keypad?: React.ReactNode;
};

/** Sheet body: scrolling fields over an optional pinned keypad, the same shape as the add sheet. */
function EntryLayout({ children, keypad }: EntryLayoutProps) {
  return (
    <View className="flex-1 bg-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 pb-6 pt-2"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
        {keypad}
      </KeyboardAvoidingView>
    </View>
  );
}

export { EntryLayout };
