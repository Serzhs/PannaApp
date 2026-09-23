import { useLocalSearchParams } from 'expo-router';

import { baseUrl } from '@/api/client';
import { SharedScreen } from '@/features/sharing/SharedScreen';

export default function SharedRoute(): React.JSX.Element {
  const { token, api } = useLocalSearchParams<{ token: string; api?: string }>();
  // A link with no api part is one this same app made: read it from its own API.
  return <SharedScreen token={token} apiUrl={api ?? baseUrl()} />;
}
