import { render, screen } from '@testing-library/react-native';

import { IngredientRow } from './IngredientRow';

describe('IngredientRow', () => {
  it('shows the amount apart from the name, and reads as one element', async () => {
    await render(
      <IngredientRow
        amount="500 g"
        name="carrots"
        note="not too long"
        accessibilityLabel="500 g carrots, not too long"
      />,
    );
    expect(screen.getByText('500 g')).toBeTruthy();
    expect(screen.getByText('carrots')).toBeTruthy();
    expect(screen.getByLabelText('500 g carrots, not too long')).toBeTruthy();
  });

  it('shows a tag after the name', async () => {
    await render(
      <IngredientRow
        amount={null}
        name="Grater"
        note={null}
        tag="optional"
        accessibilityLabel="Grater, optional"
      />,
    );
    expect(screen.getByText('optional')).toBeTruthy();
  });
});
