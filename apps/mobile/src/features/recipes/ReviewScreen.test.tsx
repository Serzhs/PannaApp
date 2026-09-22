import type { RecipeDetail } from '@panna/shared';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { ReviewScreen } from './ReviewScreen';

import * as unitSystem from '@/features/units/useUnitSystem';
import * as online from '@/query/useIsOnline';

const mockMutate = jest.fn();
const mockRemove = jest.fn();
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
  useDeleteRecipe: () => ({ mutate: mockRemove, isPending: false, isError: false }),
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
    mockRemove.mockReset();
    mockReplace.mockReset();
    isOnline.mockReturnValue(true);
  });

  it('shows the recipe as entered, with Save, Close and Delete and no switch', async () => {
    await render(<ReviewScreen recipeId={mockDetail.id} />);
    expect(screen.getByRole('header', { name: 'Cold beetroot soup' })).toBeTruthy();
    expect(screen.getByText('4 servings · 25 min')).toBeTruthy();
    expect(screen.getByText('Chilled, pink.')).toBeTruthy();
    expect(screen.getByText('500 g Beetroot')).toBeTruthy();
    expect(screen.getByText('Roast')).toBeTruthy();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeTruthy();
    expect(screen.getByText('It stays in your recipes as a draft.')).toBeTruthy();
  });

  it('marks the recipe ready on Save and lands on the list', async () => {
    mockMutate.mockImplementation((_body: unknown, options: { onSuccess: () => void }) => {
      options.onSuccess();
    });
    await render(<ReviewScreen recipeId={mockDetail.id} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(mockMutate).toHaveBeenCalledWith({ status: 'ready' }, expect.anything());
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('sends nothing on Close and lands on the list', async () => {
    await render(<ReviewScreen recipeId={mockDetail.id} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(mockMutate).not.toHaveBeenCalled();
    expect(mockRemove).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('asks before deleting, then deletes and lands on the list', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockRemove.mockImplementation((_body: unknown, options: { onSuccess: () => void }) => {
      options.onSuccess();
    });
    await render(<ReviewScreen recipeId={mockDetail.id} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    expect(mockRemove).not.toHaveBeenCalled();
    const buttons = alert.mock.calls.at(-1)?.[2];
    const confirm = buttons?.find((b) => b.text === 'Delete');
    if (confirm?.onPress === undefined) throw new Error('no confirm button');
    await act(() => {
      confirm.onPress?.();
    });
    expect(mockRemove).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/');
    alert.mockRestore();
  });

  it('sends nothing offline on Save, and says so', async () => {
    isOnline.mockReturnValue(false);
    await render(<ReviewScreen recipeId={mockDetail.id} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(mockMutate).not.toHaveBeenCalled();
    expect(screen.getByText(/You are offline/)).toBeTruthy();
  });
});
