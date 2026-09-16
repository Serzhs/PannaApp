import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { ErrorState } from './ErrorState';

describe('ErrorState', () => {
  it('has a heading and a retry action', async () => {
    const onRetry = jest.fn();
    await render(<ErrorState onRetry={onRetry} />);
    expect(screen.getByRole('header', { name: 'Something went wrong' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('shows the message it is given under the title', async () => {
    await render(<ErrorState message="The recipe could not be loaded." onRetry={jest.fn()} />);
    expect(screen.getByText('The recipe could not be loaded.')).toBeTruthy();
  });

  /** The criterion: offline reads differently from a failure, and both offer an action. */
  it('reads differently offline, and still offers an action', async () => {
    const onRetry = jest.fn();
    await render(<ErrorState variant="offline" onRetry={onRetry} />);
    expect(screen.getByRole('header', { name: 'You are offline' })).toBeTruthy();
    expect(screen.queryByText('Something went wrong')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not show a request message when offline, where the cause is already known', async () => {
    await render(
      <ErrorState variant="offline" message="Network request failed" onRetry={jest.fn()} />,
    );
    expect(screen.queryByText('Network request failed')).toBeNull();
  });

  it('announces the error to the screen reader when it appears', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    await render(<ErrorState variant="offline" onRetry={jest.fn()} />);
    expect(announce).toHaveBeenCalledWith(expect.stringContaining('You are offline'));
  });
});
