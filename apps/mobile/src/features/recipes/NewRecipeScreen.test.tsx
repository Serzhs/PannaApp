import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { NewRecipeScreen } from './NewRecipeScreen';

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
  useCreateRecipe: () => ({ mutate: mockMutate, isPending: false, isError: false, error: null }),
}));

describe('NewRecipeScreen', () => {
  beforeAll(() => {
    jest.spyOn(online, 'useIsOnline').mockReturnValue(true);
  });

  /** The criterion: the fields and the lists on one page, sent as one request. */
  it('sends the recipe and its lists together on Continue', async () => {
    await render(<NewRecipeScreen />);
    await fireEvent.changeText(screen.getByLabelText('Title'), 'Soup');
    await fireEvent.press(screen.getByRole('radio', { name: '2' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add ingredient' }));
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Salt');
    await fireEvent.press(screen.getByRole('button', { name: 'Add Salt' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        {
          title: 'Soup',
          servings: 2,
          ingredients: [{ name: 'Salt', note: null, amount: null, unit: null }],
          equipment: [],
        },
        expect.anything(),
      );
    });
  });
});
