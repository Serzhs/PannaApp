import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { showActionMenu } from '@/components/ActionMenu';

/**
 * New asks which way first (0032): write it yourself, or paste one from your AI. The
 * two are different jobs, so the choice comes before either screen, in the platform's
 * own menu.
 */
export function useNewRecipeMenu(): () => void {
  const router = useRouter();
  const { t } = useTranslation();
  return () => {
    showActionMenu({
      title: t('recipes:header.newRecipe'),
      actions: [
        {
          label: t('recipes:newMenu.write'),
          onPress: () => {
            router.push('/recipes/new');
          },
        },
        {
          label: t('recipes:newMenu.paste'),
          onPress: () => {
            router.push('/recipes/import');
          },
        },
      ],
      cancelLabel: t('common:cancel'),
    });
  };
}
