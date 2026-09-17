import type { RecipeDetail } from '@panna/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { ReviewScreen } from './ReviewScreen';

import * as unitSystem from '@/features/units/useUnitSystem';
import * as online from '@/query/useIsOnline';

const mockMutate = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: mockReplace,
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
  description: 'Chilled, pink.',
  status: 'draft',
  servings: 4,
  totalTimeMinutes: 25,
  createdAt: '2026-09-16T12:00:00.000Z',
  updatedAt: '2026-09-16T12:00:00.000Z',
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
      children: [],
    },
  ],
};

describe('ReviewScreen', () => {
  const isOnline = jest.spyOn(online, 'useIsOnline');

  beforeAll(() => {
    jest.spyOn(unitSystem, 'useUnitSystem').mockReturnValue('metric');
  });

  beforeEach(() => {
    mockMutate.mockReset();
    mockReplace.mockReset();
    isOnline.mockReturnValue(true);
  });

  it('shows the recipe as entered, with the switch off', async () => {
    await render(<ReviewScreen recipeId={mockDetail.id} />);
    expect(screen.getByRole('header', { name: 'Cold beetroot soup' })).toBeTruthy();
    expect(screen.getByText('4 servings · 25 min')).toBeTruthy();
    expect(screen.getByText('Chilled, pink.')).toBeTruthy();
    expect(screen.getByText('500 g Beetroot')).toBeTruthy();
    expect(screen.getByText('Roast')).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'Ready to cook' })).toHaveProp('value', false);
  });

  it('lands on the recipe as a draft when the switch is off', async () => {
    await render(<ReviewScreen recipeId={mockDetail.id} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(mockMutate).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/recipes/[id]',
      params: { id: mockDetail.id },
    });
  });

  it('marks the recipe ready when the switch is on', async () => {
    await render(<ReviewScreen recipeId={mockDetail.id} />);
    await fireEvent(screen.getByRole('switch', { name: 'Ready to cook' }), 'valueChange', true);
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(mockMutate).toHaveBeenCalledWith({ status: 'ready' }, expect.anything());
  });

  it('sends nothing offline with the switch on, and says so', async () => {
    isOnline.mockReturnValue(false);
    await render(<ReviewScreen recipeId={mockDetail.id} />);
    await fireEvent(screen.getByRole('switch', { name: 'Ready to cook' }), 'valueChange', true);
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(mockMutate).not.toHaveBeenCalled();
    expect(screen.getByText(/You are offline/)).toBeTruthy();
  });
});
