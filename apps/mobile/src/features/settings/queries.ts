import type { SessionUser, UpdateMeBody } from '@panna/shared';
import { useMutation } from '@tanstack/react-query';

import { updateMe } from './settings.api';

import { useAuth } from '@/features/auth/AuthProvider';

/** The response replaces the stored user, which is what makes the change take effect at once. */
export function useUpdateMe() {
  const { updateUser } = useAuth();
  return useMutation({
    mutationFn: (body: UpdateMeBody) => updateMe(body),
    onSuccess: async (user: SessionUser) => {
      await updateUser(user);
    },
  });
}
