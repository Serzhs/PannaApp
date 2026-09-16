import NetInfo from '@react-native-community/netinfo';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { SignInCancelled, signInWithGoogle } from './providerSignIn';
import { SignInScreen } from './SignInScreen';

jest.mock('./providerSignIn', () => ({
  ...jest.requireActual<object>('./providerSignIn'),
  signInWithApple: jest.fn(),
  signInWithGoogle: jest.fn(),
}));
jest.mock('./auth.api', () => ({ startSession: jest.fn(), devSignIn: jest.fn() }));
jest.mock('./AuthProvider', () => ({ useAuth: () => ({ signIn: jest.fn() }) }));

const google = jest.mocked(signInWithGoogle);
const fetchNet = jest.mocked(NetInfo.fetch);

describe('SignInScreen', () => {
  beforeEach(() => {
    google.mockReset();
    fetchNet.mockResolvedValue({ isConnected: true } as never);
  });

  it('shows Apple first and then Google on iOS', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    await render(<SignInScreen />);
    const buttons = screen.getAllByRole('button').map((b) => b.props.accessibilityLabel as string);
    expect(buttons.indexOf('Continue with Apple')).toBeLessThan(
      buttons.indexOf('Continue with Google'),
    );
  });

  it('offers only Google on Android', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    await render(<SignInScreen />);
    expect(screen.queryByRole('button', { name: 'Continue with Apple' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeTruthy();
  });

  /** The criterion: closing the sheet is not an error, so nothing is shown. */
  it('returns to idle with no message when the sheet is cancelled', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    google.mockRejectedValue(new SignInCancelled());
    await render(<SignInScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Continue with Google' })).not.toBeDisabled();
    });
    expect(screen.queryByText(/did not work|offline|not set up/i)).toBeNull();
  });

  it('says offline, not something generic, when there is no connection', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    fetchNet.mockResolvedValue({ isConnected: false } as never);
    await render(<SignInScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));
    await waitFor(() => {
      expect(screen.getByText(/You are offline/)).toBeTruthy();
    });
    expect(google).not.toHaveBeenCalled();
  });

  it('shows a generic failure when the provider fails for another reason', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    google.mockRejectedValue(new Error('boom'));
    await render(<SignInScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Continue with Google' }));
    await waitFor(() => {
      expect(screen.getByText(/did not work/)).toBeTruthy();
    });
  });
});
