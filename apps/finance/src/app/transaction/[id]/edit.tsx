import { useLocalSearchParams } from "expo-router";

import { TransactionForm } from "@/features/transaction-form/form";

export default function EditTransaction() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TransactionForm mode="edit" transactionId={id} />;
}
