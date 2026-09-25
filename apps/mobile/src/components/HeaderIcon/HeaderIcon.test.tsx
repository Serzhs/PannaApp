import { fireEvent, render, screen } from '@testing-library/react-native';

import { HeaderIcon } from './HeaderIcon';

describe('HeaderIcon', () => {
  /** An icon alone says nothing to a screen reader: the label is its whole name. */
  it('is a button named by its label, and reports disabled through state', async () => {
    const onPress = jest.fn();
    await render(<HeaderIcon name="share-outline" label="Share" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Share' }));
    expect(onPress).toHaveBeenCalled();
    await screen.unmount();
    await render(<HeaderIcon name="ellipsis-horizontal" label="More" onPress={onPress} disabled />);
    expect(screen.getByRole('button', { name: 'More' })).toBeDisabled();
  });
});
