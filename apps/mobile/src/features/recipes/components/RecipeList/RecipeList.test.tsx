import type { Recipe } from '@panna/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { RecipeList } from './RecipeList';

import type { CookRecord } from '@/features/cooking/store';

const recipe: Recipe = {
  id: '4b6c1d2e-0000-4000-8000-000000000001',
  title: 'Cold beetroot soup',
  description: null,
  status: 'ready',
  coverImageKey: null,
  servings: 4,
  totalTimeMinutes: null,
  createdAt: '2026-09-16T12:00:00.000Z',
  updatedAt: '2026-09-16T12:00:00.000Z',
};

const handlers = { onRetry: jest.fn(), onOpen: jest.fn(), onCreate: jest.fn() };

describe('RecipeList', () => {
  it('shows placeholders while loading, never the empty state', async () => {
    await render(<RecipeList state="loading" recipes={[]} {...handlers} />);
    expect(screen.getByLabelText('Loading recipes')).toBeTruthy();
    expect(screen.queryByText('No recipes yet')).toBeNull();
  });

  it('offers to create when there is nothing', async () => {
    await render(<RecipeList state="ready" recipes={[]} {...handlers} />);
    expect(screen.getByRole('header', { name: 'No recipes yet' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'New recipe' }));
    expect(handlers.onCreate).toHaveBeenCalledTimes(1);
  });

  it('shows a failure with a retry', async () => {
    await render(<RecipeList state="error" recipes={[]} {...handlers} />);
    expect(screen.getByRole('header', { name: 'Something went wrong' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(handlers.onRetry).toHaveBeenCalledTimes(1);
  });

  it('says offline in its own words', async () => {
    await render(<RecipeList state="offline" recipes={[]} {...handlers} />);
    expect(screen.getByRole('header', { name: 'You are offline' })).toBeTruthy();
  });

  it('lists the recipes as rows that open on press', async () => {
    await render(<RecipeList state="ready" recipes={[recipe]} {...handlers} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Cold beetroot soup, 4 servings' }));
    expect(handlers.onOpen).toHaveBeenCalledWith(recipe);
  });

  /** 0012: cooks in progress first, under their own heading, and no heading without any. */
  it('puts a cook in progress first, and shows no section without one', async () => {
    const base = {
      note: null,
      durationSeconds: null,
      ingredientIds: [],
      equipmentIds: [],
      imageKey: null,
    };
    const record: CookRecord = {
      recipe: {
        ...recipe,
        cookCount: 0,
        lastCookedAt: null,
        notes: [],
        ingredients: [],
        equipment: [],
        steps: [
          { id: 'a', position: 0, body: 'Boil', ...base, children: [] },
          { id: 'b', position: 1, body: 'Blend', ...base, children: [] },
        ],
      },
      startedAt: '2026-09-22T10:00:00.000Z',
      phase: 'cooking',
      excluded: [],
      currentStepId: 'b',
      done: ['a'],
      timer: null,
    };
    const onContinue = jest.fn();
    await render(
      <RecipeList
        state="ready"
        recipes={[recipe]}
        {...handlers}
        cooks={[record]}
        onContinue={onContinue}
      />,
    );
    expect(screen.getByRole('header', { name: 'In progress' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Cold beetroot soup, Step 2 of 2' }));
    expect(onContinue).toHaveBeenCalledWith(record);
    // The recipe being cooked is not listed twice.
    expect(screen.queryByRole('button', { name: 'Cold beetroot soup, 4 servings' })).toBeNull();
    await screen.unmount();
    await render(<RecipeList state="ready" recipes={[recipe]} {...handlers} />);
    expect(screen.queryByRole('header', { name: 'In progress' })).toBeNull();
  });
});
