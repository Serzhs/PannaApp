import { render, screen } from '@testing-library/react-native';

import { Screen } from './Screen';

import { Text } from '@/components/Text';

describe('Screen', () => {
  it('renders its children', async () => {
    await render(
      <Screen>
        <Text>Recipes</Text>
      </Screen>,
    );
    expect(screen.getByText('Recipes')).toBeTruthy();
  });

  it('still renders its children when scrolling', async () => {
    await render(
      <Screen scroll>
        <Text>Recipes</Text>
      </Screen>,
    );
    expect(screen.getByText('Recipes')).toBeTruthy();
  });
});
