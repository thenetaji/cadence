import { useLocalSearchParams } from "expo-router";

import { AccountForm } from "@/features/accounts/form";

export default function EditAccount() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AccountForm mode="edit" accountId={id} />;
}
