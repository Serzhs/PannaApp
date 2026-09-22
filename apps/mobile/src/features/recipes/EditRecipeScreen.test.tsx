import type { RecipeDetail } from '@panna/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { EditRecipeScreen } from './EditRecipeScreen';

import * as online from '@/query/useIsOnline';

const mockMutate = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => true,
  }),
}));
jest.mock('./queries', () => ({
  useRecipe: () => ({ data: mockDetail, isPending: false, isError: false, refetch: jest.fn() }),
  useUpdateRecipe: () => ({ mutate: mockMutate, isPending: false, isError: false, error: null }),
}));

const mockDetail: RecipeDetail = {
  id: '4b6c1d2e-0000-4000-8000-000000000001',
  title: 'Cold beetroot soup',
  description: null,
  status: 'draft',
  coverImageKey: null,
  servings: 3,
  totalTimeMinutes: null,
  createdAt: '2026-09-16T12:00:00.000Z',
  updatedAt: '2026-09-16T12:00:00.000Z',
  cookCount: 0,
  lastCookedAt: null,
  notes: [],
  ingredients: [{ id: 'i', position: 0, name: 'Beetroot', note: null, amount: 500, unit: 'g' }],
  equipment: [],
  steps: [
    {
      id: 's',
      position: 0,
      body: 'Roast',
      note: null,
      durationSeconds: null,
      ingredientIds: [],
      equipmentIds: [],
      imageKey: null,
      children: [],
    },
  ],
};

describe('EditRecipeScreen', () => {
  beforeAll(() => {
    jest.spyOn(online, 'useIsOnline').mockReturnValue(true);
  });

  /** The criterion: three tabs, one part at a time, the Save button under all of them. */
  it('shows one part at a time and keeps Save under every tab', async () => {
    await render(<EditRecipeScreen recipeId={mockDetail.id} />);
    expect(screen.getByRole('tab', { name: 'Recipe' })).toBeSelected();
    expect(screen.getByLabelText('Title')).toHaveProp('value', 'Cold beetroot soup');
    expect(screen.getByLabelText('500 g Beetroot')).toBeTruthy();
    expect(screen.queryByLabelText('Roast')).toBeNull();

    await fireEvent.press(screen.getByRole('tab', { name: 'Steps' }));
    expect(screen.getByLabelText('Roast')).toBeTruthy();
    expect(screen.queryByLabelText('Title')).toBeNull();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('tab', { name: 'Flow' }));
    expect(screen.getByLabelText('Step 1, Roast')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeTruthy();
  });

  it('opens on Other with the value filled when servings is not in the row', async () => {
    await render(<EditRecipeScreen recipeId={mockDetail.id} />);
    expect(screen.getByRole('radio', { name: 'Other' })).toBeChecked();
    expect(screen.getByLabelText('Servings')).toHaveProp('value', '3');
  });
});
