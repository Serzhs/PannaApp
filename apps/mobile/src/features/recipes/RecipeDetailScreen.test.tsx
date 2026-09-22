import type { RecipeDetail } from '@panna/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { RecipeDetailScreen } from './RecipeDetailScreen';

import * as unitSystem from '@/features/units/useUnitSystem';
import * as online from '@/query/useIsOnline';

const mockMutate = jest.fn();
let mockDetail: RecipeDetail;

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
  useDeleteRecipe: () => ({ mockMutate: jest.fn(), isPending: false, isError: false }),
}));

const recipe = (status: RecipeDetail['status']): RecipeDetail => ({
  id: '4b6c1d2e-0000-4000-8000-000000000001',
  title: 'Cold beetroot soup',
  description: null,
  status,
  coverImageKey: null,
  servings: 4,
  totalTimeMinutes: null,
  createdAt: '2026-09-16T12:00:00.000Z',
  updatedAt: '2026-09-16T12:00:00.000Z',
  ingredients: [],
  equipment: [],
  steps: [],
});

describe('RecipeDetailScreen status control', () => {
  const isOnline = jest.spyOn(online, 'useIsOnline');

  beforeAll(() => {
    jest.spyOn(unitSystem, 'useUnitSystem').mockReturnValue('metric');
  });

  beforeEach(() => {
    mockMutate.mockReset();
    isOnline.mockReturnValue(true);
  });

  /** The criterion: mark ready sends `ready`, and the reverse sends `draft`. */
  it('offers to mark a draft ready, and sends the status', async () => {
    mockDetail = recipe('draft');
    await render(<RecipeDetailScreen recipeId={mockDetail.id} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Mark as ready' }));
    expect(mockMutate).toHaveBeenCalledWith({ status: 'ready' });
  });

  /** 0027: once ready, a recipe is only ever edited, never put back. */
  it('offers nothing to a ready recipe in place of the status button', async () => {
    mockDetail = recipe('ready');
    await render(<RecipeDetailScreen recipeId={mockDetail.id} />);
    expect(screen.queryByRole('button', { name: /Mark as ready|Back to draft/ })).toBeNull();
  });

  it('sends nothing offline and says so', async () => {
    mockDetail = recipe('draft');
    isOnline.mockReturnValue(false);
    await render(<RecipeDetailScreen recipeId={mockDetail.id} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Mark as ready' }));
    expect(mockMutate).not.toHaveBeenCalled();
    expect(screen.getByText(/You are offline/)).toBeTruthy();
  });
});
