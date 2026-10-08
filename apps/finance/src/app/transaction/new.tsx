import { useLocalSearchParams } from "expo-router";

import {
  TransactionForm,
  type FormParams,
} from "@/features/transaction-form/form";

export default function NewTransaction() {
  const params = useLocalSearchParams<FormParams>();
  return <TransactionForm mode="new" params={params} />;
}
