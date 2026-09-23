import { ApiError, type RecipeDetail, type SharedRecipe } from '@panna/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import * as api from './shared.api';
import { SharedScreen } from './SharedScreen';

import * as recipesApi from '@/features/recipes/recipes.api';
import * as unitSystem from '@/features/units/useUnitSystem';
import * as online from '@/query/useIsOnline';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: mockReplace,
    back: jest.fn(),
    canGoBack: () => true,
  }),
}));

const base = {
  note: null,
  durationSeconds: null,
  ingredientIds: [],
  equipmentIds: [],
  imageKey: null,
};
const shared: SharedRecipe = {
  id: '4b6c1d2e-0000-4000-8000-000000000001',
  title: 'Cold beetroot soup',
  description: null,
  status: 'ready',
  coverImageKey: null,
  servings: 4,
  totalTimeMinutes: 25,
  createdAt: '2026-09-16T12:00:00.000Z',
  updatedAt: '2026-09-16T12:00:00.000Z',
  ingredients: [{ id: 'i', position: 0, name: 'beetroot', note: null, amount: 500, unit: 'g' }],
  equipment: [],
  steps: [{ id: 's', position: 0, body: 'Boil', ...base, children: [] }],
  authorName: 'Jānis',
};
const copy: RecipeDetail = {
  ...shared,
  id: '4b6c1d2e-0000-4000-8000-000000000002',
  status: 'draft',
  cookCount: 0,
  lastCookedAt: null,
  notes: [],
  shareToken: null,
  sourceRecipeId: shared.id,
};

function renderShared() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <SharedScreen token="abcdefghijkl" apiUrl="http://author:3000" />
    </QueryClientProvider>,
  );
}

describe('SharedScreen', () => {
  const get = jest.spyOn(api, 'getShared');
  const save = jest.spyOn(recipesApi, 'saveShared');
  beforeAll(() => {
    jest.spyOn(unitSystem, 'useUnitSystem').mockReturnValue('metric');
    jest.spyOn(online, 'useIsOnline').mockReturnValue(true);
  });
  beforeEach(() => {
    get.mockReset();
    save.mockReset();
    mockReplace.mockReset();
  });

  /** The criterion: the recipe, who shared it, one button, landing on the copy. */
  it('shows the shared recipe and adds it to my recipes', async () => {
    get.mockResolvedValue(shared);
    save.mockResolvedValue(copy);
    await renderShared();
    await waitFor(() => {
      expect(screen.getByRole('header', { name: 'Cold beetroot soup' })).toBeTruthy();
    });
    expect(get).toHaveBeenCalledWith('http://author:3000', 'abcdefghijkl');
    expect(screen.getByText('Shared by Jānis')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Cook|Edit|Delete/ })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Add to my recipes' }));
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: '/recipes/[id]',
        params: { id: copy.id },
      });
    });
  });

  it('says a revoked link no longer works', async () => {
    get.mockRejectedValue(
      new ApiError(
        { statusCode: 404, error: 'Not Found', message: 'gone', code: 'SHARE_NOT_FOUND' },
        404,
      ),
    );
    await renderShared();
    await waitFor(() => {
      expect(screen.getByText('This link no longer works')).toBeTruthy();
    });
  });
});
