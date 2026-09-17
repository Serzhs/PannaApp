import { render, screen } from '@testing-library/react-native';

import { StepsScreen } from './StepsScreen';

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
  useRecipe: () => ({ data: undefined, isPending: true, isError: false, refetch: jest.fn() }),
  useUpdateRecipe: () => ({ mutate: mockMutate, isPending: false, isError: false, error: null }),
}));

describe('StepsScreen', () => {
  beforeAll(() => {
    jest.spyOn(online, 'useIsOnline').mockReturnValue(true);
  });

  /** The criterion: the page opens on one open card, no rows, no button to press first. */
  it('opens with the first step ready to write', async () => {
    await render(<StepsScreen recipeId="4b6c1d2e-0000-4000-8000-000000000001" />);
    expect(screen.getByText('Step 1')).toBeTruthy();
    expect(screen.getAllByLabelText(/^Instruction/)).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Add step 1' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Edit/ })).toBeNull();
  });
});
