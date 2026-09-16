import type { SessionUser, UpdateMeBody } from '@panna/shared';

import { authorizedCall } from '@/api/session';

export async function updateMe(body: UpdateMeBody): Promise<SessionUser> {
  return authorizedCall('updateMe', { body });
}
