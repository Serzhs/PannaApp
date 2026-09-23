import type { RecipeDetail, SharedRecipe } from '@panna/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { FeaturedRecipeScreen } from './FeaturedRecipeScreen';

import * as unitSystem from '@/features/units/useUnitSystem';
import * as online from '@/query/useIsOnline';

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockMutate = jest.fn();
let mockRecipe: SharedRecipe;
jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack, push: mockPush }) }));
jest.mock('./queries', () => ({
  useFeaturedRecipe: () => ({ data: mockRecipe, isPending: false, isError: false }),
  useSaveFeatured: () => ({ mutate: mockMutate, isPending: false, isError: false }),
}));

const base = {
  note: null,
  durationSeconds: null,
  ingredientIds: [],
  equipmentIds: [],
  imageKey: null,
};
const featured: SharedRecipe = {
  id: '4b6c1d2e-0000-4000-8000-000000000002',
  title: 'Pankūkas',
  description: 'Thin pancakes.',
  status: 'ready',
  coverImageKey: null,
  servings: 4,
  totalTimeMinutes: 35,
  createdAt: '2026-09-16T12:00:00.000Z',
  updatedAt: '2026-09-16T12:00:00.000Z',
  ingredients: [{ id: 'i', position: 0, name: 'milk', note: null, amount: 500, unit: 'ml' }],
  equipment: [],
  steps: [{ id: 's', position: 0, body: 'Whisk', ...base, children: [] }],
  authorName: 'Panna',
};

describe('FeaturedRecipeScreen', () => {
  beforeAll(() => {
    jest.spyOn(unitSystem, 'useUnitSystem').mockReturnValue('metric');
    jest.spyOn(online, 'useIsOnline').mockReturnValue(true);
  });

  /** The criterion: headed "By Panna", only Add to my recipes, and lands on the copy. */
  it('shows the recipe read-only and adds it to my recipes', async () => {
    mockRecipe = featured;
    mockMutate.mockImplementation(
      (_id: string, options: { onSuccess: (copy: RecipeDetail) => void }) => {
        options.onSuccess({
          ...featured,
          id: '4b6c1d2e-0000-4000-8000-000000000009',
          status: 'draft',
          cookCount: 0,
          lastCookedAt: null,
          notes: [],
          shareToken: null,
          sourceRecipeId: featured.id,
        });
      },
    );
    await render(<FeaturedRecipeScreen recipeId={featured.id} />);
    expect(screen.getByText('By Panna')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Pankūkas' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Cook|Edit|Delete|Share/ })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Add to my recipes' }));
    expect(mockMutate).toHaveBeenCalledWith(featured.id, expect.anything());
    expect(mockBack).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/recipes/[id]',
      params: { id: '4b6c1d2e-0000-4000-8000-000000000009' },
    });
  });
});
