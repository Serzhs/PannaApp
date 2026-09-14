import { render, screen } from '@testing-library/react-native';

import { Stack } from './Stack';

import { Text } from '@/components/Text';
import { theme } from '@/styles/theme';

describe('Stack', () => {
  it('renders its children', async () => {
    await render(
      <Stack>
        <Text>One</Text>
        <Text>Two</Text>
      </Stack>,
    );
    expect(screen.getByText('One')).toBeTruthy();
    expect(screen.getByText('Two')).toBeTruthy();
  });

  it('takes its gap from the spacing scale', async () => {
    await render(
      <Stack gap="space4" testID="stack">
        <Text>One</Text>
      </Stack>,
    );
    expect(screen.getByTestId('stack')).toHaveStyle({ gap: theme.space.space4 });
  });

  it('lays out as a row when asked', async () => {
    await render(
      <Stack direction="row" testID="stack">
        <Text>One</Text>
      </Stack>,
    );
    expect(screen.getByTestId('stack')).toHaveStyle({ flexDirection: 'row' });
  });
});
