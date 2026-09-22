import type { Recipe } from '@panna/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { RecipeRow } from './RecipeRow';

const recipe: Recipe = {
  id: '4b6c1d2e-0000-4000-8000-000000000001',
  title: 'Cold beetroot soup',
  description: null,
  status: 'draft',
  servings: 4,
  totalTimeMinutes: 25,
  createdAt: '2026-09-16T12:00:00.000Z',
  updatedAt: '2026-09-16T12:00:00.000Z',
};

/** Ten days after the fixture was created, so nothing here is new unless a test says so. */
const LATER = Date.parse('2026-09-26T12:00:00.000Z');

describe('RecipeRow', () => {
  /** The criterion: one stop announcing title, servings, time and status together. */
  it('is one button whose name carries everything the row shows', async () => {
    await render(<RecipeRow recipe={recipe} onPress={jest.fn()} now={LATER} />);
    expect(
      screen.getByRole('button', { name: 'Cold beetroot soup, 4 servings, 25 min, draft' }),
    ).toBeTruthy();
  });

  it('shows the draft chip as text', async () => {
    await render(<RecipeRow recipe={recipe} onPress={jest.fn()} now={LATER} />);
    expect(screen.getByText('Draft')).toBeTruthy();
  });

  it('omits the chip and the time when the recipe is ready and untimed', async () => {
    await render(
      <RecipeRow
        recipe={{ ...recipe, status: 'ready', totalTimeMinutes: null }}
        onPress={jest.fn()}
        now={LATER}
      />,
    );
    expect(screen.queryByText('Draft')).toBeNull();
    expect(screen.getByRole('button', { name: 'Cold beetroot soup, 4 servings' })).toBeTruthy();
  });

  it('hands back the recipe when pressed', async () => {
    const onPress = jest.fn();
    await render(<RecipeRow recipe={recipe} onPress={onPress} now={LATER} />);
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledWith(recipe);
  });

  /** The criterion: New for a recipe under three days old, gone after. */
  it('marks a recipe new for three days, in the chip and in its name', async () => {
    const twoDays = Date.parse('2026-09-18T12:00:00.000Z');
    await render(<RecipeRow recipe={recipe} onPress={jest.fn()} now={twoDays} />);
    expect(screen.getByText('New')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Cold beetroot soup, 4 servings, 25 min, draft, new' }),
    ).toBeTruthy();
    await screen.unmount();
    const fourDays = Date.parse('2026-09-20T12:00:00.000Z');
    await render(<RecipeRow recipe={recipe} onPress={jest.fn()} now={fourDays} />);
    expect(screen.queryByText('New')).toBeNull();
  });
});
