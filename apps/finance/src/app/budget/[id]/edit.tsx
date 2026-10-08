import { useLocalSearchParams } from "expo-router";

import { BudgetForm } from "@/features/budgets/form";

export default function EditBudget() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <BudgetForm mode="edit" budgetId={id} />;
}
