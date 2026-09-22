import { fireEvent, render, screen } from '@testing-library/react-native';

import { PhotoViewer } from './PhotoViewer';

describe('PhotoViewer', () => {
  it('shows the picture with a big close bar', async () => {
    const onClose = jest.fn();
    await render(<PhotoViewer uri="http://x/a.jpg" label="How it should look" onClose={onClose} />);
    expect(screen.getByLabelText('How it should look')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});
