import { useTranslation } from 'react-i18next';

import { TextField } from '@/components/TextField';
import { useUnitSystem } from '@/features/units/useUnitSystem';

export interface TemperatureFieldProps {
  readonly value: string;
  readonly onChangeText: (text: string) => void;
  readonly error?: string;
}

/** Labelled with the author's own unit; the Celsius it becomes is the validator's business. */
export function TemperatureField({
  value,
  onChangeText,
  error,
}: TemperatureFieldProps): React.JSX.Element {
  const { t } = useTranslation();
  const system = useUnitSystem();
  return (
    <TextField
      label={t('recipes:steps.temperature', { unit: system === 'metric' ? '°C' : '°F' })}
      value={value}
      onChangeText={onChangeText}
      keyboardType="numbers-and-punctuation"
      {...(error === undefined ? {} : { error })}
    />
  );
}
