import { render, screen } from '@testing-library/react-native';

import { Text } from './Text';

import { theme } from '@/styles/theme';

describe('Text', () => {
  it('is found by the words it renders', async () => {
    await render(<Text>Roast the pork</Text>);
    expect(screen.getByText('Roast the pork')).toBeTruthy();
  });

  it('applies the named style and the semantic colour together', async () => {
    await render(
      <Text variant="title" color="textSecondary">
        Ingredients
      </Text>,
    );
    expect(screen.getByText('Ingredients')).toHaveStyle({
      ...theme.text.title,
      color: theme.colors.textSecondary,
    });
  });

  it('can carry a heading role so focus can land on it after navigation', async () => {
    await render(
      <Text variant="heading" accessibilityRole="header">
        Steps
      </Text>,
    );
    expect(screen.getByRole('header', { name: 'Steps' })).toBeTruthy();
  });
});
