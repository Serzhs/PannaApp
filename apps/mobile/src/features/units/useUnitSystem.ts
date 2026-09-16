import type { UnitSystem } from '@panna/shared';

import { useAuth } from '@/features/auth/AuthProvider';
import { deviceMeasurementSystem, resolveUnitSystem } from '@/i18n';

/** The signed-in person's choice, or what the device implies, ending at metric. */
export function useUnitSystem(): UnitSystem {
  const { user } = useAuth();
  return resolveUnitSystem(user?.unitSystem ?? null, deviceMeasurementSystem());
}
