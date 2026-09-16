import type { ResponseOf } from '@panna/shared';

import { call } from './client';

export async function checkHealth(): Promise<ResponseOf<'health'>> {
  return call('health');
}
