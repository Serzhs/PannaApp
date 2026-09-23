import { render, screen } from '@testing-library/react-native';

import { ListHeaderTitle, NewRecipeButton } from './ListHeader';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
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
});
