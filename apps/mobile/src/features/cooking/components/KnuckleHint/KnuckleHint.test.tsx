import { fireEvent, render, screen } from '@testing-library/react-native';
import type * as Reanimated from 'react-native-reanimated';

import { KnuckleHint } from './KnuckleHint';

let mockReduced = false;
jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual<typeof Reanimated>('react-native-reanimated');
  return {
    __esModule: true,
    ...actual,
    default: actual.default,
    useReducedMotion: () => mockReduced,
  };
});

describe('KnuckleHint', () => {
  /** The criterion: the words and the button, the picture out of the accessibility tree. */
  it('says it in words, hides the picture from a screen reader, and dismisses on Got it', async () => {
    const onDismiss = jest.fn();
    await render(<KnuckleHint onDismiss={onDismiss} />);
    expect(screen.getByRole('header', { name: 'Tap with a knuckle' })).toBeTruthy();
    expect(screen.getByText(/Your knuckles stay cleaner/)).toBeTruthy();
    expect(screen.queryByTestId('knuckle-picture')).toBeNull();
    expect(screen.getByTestId('knuckle-picture', { includeHiddenElements: true })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Got it' }));
    expect(onDismiss).toHaveBeenCalled();
  });

  /** The criterion: reduce motion keeps the same words and shows the still picture. */
  it('shows the same words with reduce motion on', async () => {
    mockReduced = true;
    await render(<KnuckleHint onDismiss={jest.fn()} />);
    expect(screen.getByRole('header', { name: 'Tap with a knuckle' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Got it' })).toBeTruthy();
    mockReduced = false;
  });
});
