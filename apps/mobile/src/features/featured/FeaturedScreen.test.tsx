import type { Recipe } from '@panna/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { FeaturedScreen } from './FeaturedScreen';

import * as online from '@/query/useIsOnline';

const mockPush = jest.fn();
const mockUseFeatured = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('./queries', () => ({ useFeatured: (q: string): unknown => mockUseFeatured(q) }));

const one = (id: string, title: string): Recipe => ({
  id,
  title,
  description: null,
  status: 'ready',
  coverImageKey: null,
  servings: 4,
  totalTimeMinutes: 30,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
const ALL = [
  one('4b6c1d2e-0000-4000-8000-000000000001', 'Grey peas with bacon'),
  one('4b6c1d2e-0000-4000-8000-000000000002', 'Pankūkas'),
];

describe('FeaturedScreen', () => {
  beforeAll(() => {
    jest.spyOn(online, 'useIsOnline').mockReturnValue(true);
  });
  beforeEach(() => {
    mockPush.mockReset();
    mockUseFeatured.mockReset();
    mockUseFeatured.mockImplementation((q: string) => ({
      data: q === '' ? ALL : ALL.filter((r) => r.title.toLowerCase().includes(q)),
      isPending: false,
      isError: false,
      refetch: jest.fn(),
    }));
  });

  /** The criterion: rows without chips, filtered after a pause, "Nothing matches", and open. */
  it('lists the featured recipes plainly, filters after a pause, and opens one', async () => {
    await render(<FeaturedScreen />);
    expect(screen.getByRole('button', { name: 'Pankūkas, 4 servings, 30 min' })).toBeTruthy();
    expect(screen.queryByText('New')).toBeNull();
    expect(mockUseFeatured).toHaveBeenLastCalledWith('');

    await fireEvent.changeText(screen.getByLabelText('Search featured recipes'), ' peas ');
    // Not yet: the pause has not passed.
    expect(mockUseFeatured).toHaveBeenLastCalledWith('');
    await waitFor(() => {
      expect(mockUseFeatured).toHaveBeenLastCalledWith('peas');
    });
    expect(screen.queryByRole('button', { name: /Pankūkas/ })).toBeNull();

    await fireEvent.changeText(screen.getByLabelText('Search featured recipes'), 'zzz');
    await waitFor(() => {
      expect(screen.getByText('Nothing matches')).toBeTruthy();
    });

    await fireEvent.changeText(screen.getByLabelText('Search featured recipes'), '');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Grey peas/ })).toBeTruthy();
    });
    await fireEvent.press(screen.getByRole('button', { name: /Grey peas/ }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/featured/[id]',
      params: { id: ALL[0]?.id },
    });
  });

  it('says nothing here yet when there is no search and no rows', async () => {
    mockUseFeatured.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      refetch: jest.fn(),
    });
    await render(<FeaturedScreen />);
    expect(screen.getByText('Nothing here yet')).toBeTruthy();
  });
});
