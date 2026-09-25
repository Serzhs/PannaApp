import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';

export interface CookBarProps {
  readonly continuing: boolean;
  readonly onPress: () => void;
}

/** The one thing the recipe screen is for, pinned so it is never scrolled away (0029). */
export function CookBar({ continuing, onPress }: CookBarProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <Button
      label={continuing ? t('recipes:cook.continue') : t('recipes:cook.start')}
      onPress={onPress}
    />
  );
}
