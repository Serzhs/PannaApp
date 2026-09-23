import type { SessionUser } from '@panna/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { YouScreen } from './YouScreen';

import * as images from '@/api/images';
import { knuckleHintSeen, markKnuckleHintSeen } from '@/features/cooking/hint';
import * as online from '@/query/useIsOnline';

const mockMutate = jest.fn();
const mockPush = jest.fn();
let mockUser: SessionUser;

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ user: mockUser, signOut: jest.fn(), updateUser: jest.fn() }),
}));
jest.mock('./queries', () => ({
  useUpdateMe: () => ({ mutate: mockMutate, isPending: false, isError: false }),
}));

const user = (avatarImageKey: string | null): SessionUser => ({
  id: '4b6c1d2e-0000-4000-8000-000000000001',
  email: 'janis@example.com',
  displayName: 'Jānis',
  avatarImageKey,
  locale: null,
  unitSystem: null,
});

describe('YouScreen', () => {
  const pick = jest.spyOn(images, 'pickImage');
  const upload = jest.spyOn(images, 'uploadImage');
  beforeAll(() => {
    jest.spyOn(online, 'useIsOnline').mockReturnValue(true);
  });
  beforeEach(() => {
    mockMutate.mockReset();
    pick.mockReset();
    upload.mockReset();
  });

  /** The criterion: name, email, the initial without a photo, the photo with one. */
  it('shows who this is, with the first letter standing in for a missing photo', async () => {
    mockUser = user(null);
    await render(<YouScreen />);
    expect(screen.getByLabelText('Name')).toHaveProp('value', 'Jānis');
    expect(screen.getByText('Signed in as janis@example.com')).toBeTruthy();
    expect(screen.getByRole('image', { name: 'No photo yet' })).toBeTruthy();
    expect(screen.getByText('J')).toBeTruthy();
    await screen.unmount();

    mockUser = user('a'.repeat(32));
    await render(<YouScreen />);
    expect(screen.getByLabelText('Photo of Jānis')).toBeTruthy();
    expect(screen.queryByText('J')).toBeNull();
  });

  /** The criterion: Save sends the trimmed name; a blank is refused with a line and no request. */
  it('saves a trimmed name and refuses a blank one before sending', async () => {
    mockUser = user(null);
    await render(<YouScreen />);
    await fireEvent.changeText(screen.getByLabelText('Name'), '  Jānis B. ');
    await fireEvent.press(screen.getByRole('button', { name: 'Save name' }));
    expect(mockMutate).toHaveBeenCalledWith({ displayName: 'Jānis B.' });

    mockMutate.mockReset();
    await fireEvent.changeText(screen.getByLabelText('Name'), '   ');
    await fireEvent.press(screen.getByRole('button', { name: 'Save name' }));
    expect(mockMutate).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Name, Enter a name.')).toBeTruthy();
  });

  /** The criterion: choosing uploads then saves the key; Remove sends null. */
  it('uploads a chosen photo and saves its key, and removes one with null', async () => {
    mockUser = user(null);
    pick.mockResolvedValue({ uri: 'file:///me.jpg' });
    upload.mockResolvedValue('b'.repeat(32));
    await render(<YouScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Choose photo' }));
    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({ avatarImageKey: 'b'.repeat(32) });
    });
    expect(upload).toHaveBeenCalledWith({ uri: 'file:///me.jpg' });
    await screen.unmount();

    mockUser = user('a'.repeat(32));
    await render(<YouScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Remove photo' }));
    expect(mockMutate).toHaveBeenCalledWith({ avatarImageKey: null });
  });

  it('keeps a photo it could not upload out of the form and says so', async () => {
    mockUser = user(null);
    pick.mockResolvedValue({ uri: 'file:///me.jpg' });
    upload.mockRejectedValue(new Error('boom'));
    await render(<YouScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Choose photo' }));
    await waitFor(() => {
      expect(screen.getByText('Could not add the photo. Try again.')).toBeTruthy();
    });
    expect(mockMutate).not.toHaveBeenCalled();
  });

  /** 0028: the way to see the knuckle hint again, and a line saying when. */
  it('clears the knuckle hint so it shows on the next cook', async () => {
    mockUser = user(null);
    markKnuckleHintSeen();
    await render(<YouScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Show the knuckle hint again' }));
    expect(knuckleHintSeen()).toBe(false);
    expect(screen.getByText('It will show the next time you cook.')).toBeTruthy();
  });
});
