import { useLocalSearchParams } from 'expo-router';
import { ExpeditionBuilder } from '../create';

export default function EditExpeditionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const resolvedId = Array.isArray(id) ? id[0] : id;
  return <ExpeditionBuilder editExpeditionId={resolvedId} />;
}
