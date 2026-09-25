import { fireEvent, render, screen } from '@testing-library/react-native';
import { ActionSheetIOS } from 'react-native';

import { ListHeaderTitle, NewRecipeButton } from './ListHeader';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ user: { displayName: 'Jānis' } }),
}));

/** 0018: settings moved to the You tab, so the header carries the name and New, nothing else. */
describe('the list header', () => {
  it('names the screen and the person, and offers New but not Settings', async () => {
    await render(
      <>
        <ListHeaderTitle />
        <NewRecipeButton />
      </>,
    );
    expect(screen.getByRole('header', { name: 'Recipes' })).toBeTruthy();
    expect(screen.getByText('Jānis')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'New recipe' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Settings' })).toBeNull();
  });

  /** 0032: New asks which way first, in the platform's own sheet. */
  it('opens a menu on New, with a way to write and a way to paste', async () => {
    let labels: string[] = [];
    const sheet = jest
      .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
      .mockImplementation((options, callback) => {
        labels = options.options;
        callback(1);
      });
    await render(<NewRecipeButton />);
    await fireEvent.press(screen.getByRole('button', { name: 'New recipe' }));
    expect(labels).toEqual(['Write it myself', 'Paste from your AI', 'Cancel']);
    expect(mockPush).toHaveBeenCalledWith('/recipes/import');
    sheet.mockRestore();
  });
});
