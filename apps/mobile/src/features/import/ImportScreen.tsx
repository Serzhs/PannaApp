import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useImportRecipe } from './importRecipe';
import { styles } from './ImportScreen.styles';
import { parseImport, type Problem } from './parse';
import { buildImportPrompt } from './prompt';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';
import { TextField } from '@/components/TextField';
import { useIsOnline } from '@/query/useIsOnline';

const BULLET = '\u2022';

/** Paste what the user's AI wrote (0016): the prompt goes out, the document comes back. */
export function ImportScreen(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const online = useIsOnline();
  const importing = useImportRecipe();
  const [copied, setCopied] = useState(false);
  const [text, setText] = useState('');
  const [refused, setRefused] = useState<string | null>(null);
  const [triedOffline, setTriedOffline] = useState(false);
  const [done, setDone] = useState<{ recipeId: string; problems: readonly Problem[] } | null>(null);

  const problemText = (problem: Problem): string => {
    switch (problem.kind) {
      case 'ingredientDropped':
        return t('recipes:import.problems.ingredientDropped', { index: problem.index });
      case 'equipmentDropped':
        return t('recipes:import.problems.equipmentDropped', { index: problem.index });
      case 'stepDropped':
        return t('recipes:import.problems.stepDropped', { index: problem.index });
      case 'unknownUnit':
        return t('recipes:import.problems.unknownUnit', { name: problem.name, unit: problem.unit });
      case 'badAmount':
        return t('recipes:import.problems.badAmount', { name: problem.name });
      case 'unknownLink':
        return t('recipes:import.problems.unknownLink', { name: problem.name });
      case 'tooMany':
        return t('recipes:import.problems.tooMany', { max: problem.max });
      case 'servingsGuessed':
        return t('recipes:import.problems.servingsGuessed');
    }
  };

  const copyPrompt = async () => {
    await Clipboard.setStringAsync(buildImportPrompt(i18n.language));
    setCopied(true);
  };

  const run = () => {
    if (!online) {
      setTriedOffline(true);
      return;
    }
    setTriedOffline(false);
    const outcome = parseImport(text);
    if (!outcome.ok) {
      setRefused(t(`recipes:import.refused.${outcome.reason}`));
      return;
    }
    setRefused(null);
    importing.mutate(outcome.recipe, {
      onSuccess: (detail) => {
        setDone({ recipeId: detail.id, problems: outcome.problems });
      },
    });
  };

  if (done !== null) {
    return (
      <Screen scroll withHeader>
        <Stack gap="space5" style={styles.body}>
          <Text variant="title" accessibilityRole="header">
            {t('recipes:import.done')}
          </Text>
          {done.problems.length === 0 ? (
            <Text variant="body" color="textSecondary">
              {t('recipes:import.clean')}
            </Text>
          ) : (
            <Stack gap="space2">
              <Text variant="body">{t('recipes:import.problemsIntro')}</Text>
              {done.problems.map((problem, index) => (
                <Text key={index} variant="body" color="textSecondary">
                  {`${BULLET} ${problemText(problem)}`}
                </Text>
              ))}
            </Stack>
          )}
          <Button
            label={t('recipes:import.check')}
            onPress={() => {
              router.replace({ pathname: '/recipes/[id]/edit', params: { id: done.recipeId } });
            }}
          />
        </Stack>
      </Screen>
    );
  }

  return (
    <Screen scroll withHeader>
      <Stack gap="space5" style={styles.body}>
        <Text variant="body" color="textSecondary">
          {t('recipes:import.how')}
        </Text>
        <Stack gap="space2">
          <Button
            label={t('recipes:import.copyPrompt')}
            variant="secondary"
            onPress={() => void copyPrompt()}
          />
          {copied ? (
            <Text variant="caption" color="textSecondary" accessibilityLiveRegion="polite">
              {t('recipes:import.copied')}
            </Text>
          ) : null}
        </Stack>
        <TextField
          label={t('recipes:import.paste')}
          value={text}
          onChangeText={(next) => {
            setText(next);
            setRefused(null);
          }}
          multiline
          tall
          {...(refused === null ? {} : { error: refused })}
        />
        {triedOffline && !online ? (
          <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
            {t('common:offline.save')}
          </Text>
        ) : importing.isError ? (
          <Text variant="caption" color="danger" accessibilityLiveRegion="polite">
            {t('recipes:import.failed')}
          </Text>
        ) : null}
        <Button
          label={t('recipes:import.import')}
          loading={importing.isPending}
          disabled={text.trim() === ''}
          onPress={run}
        />
      </Stack>
    </Screen>
  );
}
