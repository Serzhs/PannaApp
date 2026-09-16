import { render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import { Spinner } from './Spinner';

describe('Spinner', () => {
  it('is found by its role and says that something is loading', async () => {
    await render(<Spinner />);
    expect(screen.getByRole('progressbar', { name: 'Loading' })).toBeBusy();
  });

  it('takes a more specific label', async () => {
    await render(<Spinner label="Saving recipe" />);
    expect(screen.getByRole('progressbar', { name: 'Saving recipe' })).toBeTruthy();
  });

  /**
   * A spinner appears without the user acting, so per the Accessibility section of
   * CLAUDE.md it is spoken on arrival, not only when focus happens to land on it.
   */
  it('announces itself to the screen reader when it appears', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    await render(<Spinner label="Saving recipe" />);
    expect(announce).toHaveBeenCalledWith('Saving recipe');
  });
});
