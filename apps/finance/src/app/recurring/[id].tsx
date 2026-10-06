import { useLocalSearchParams } from 'expo-router';

import { RuleForm } from '@/features/recurring/rule-form';

export default function EditRule() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RuleForm ruleId={id} />;
}
