import { fireEvent, render, screen } from '@testing-library/react-native';

import { FinishSheet } from './FinishSheet';

describe('FinishSheet', () => {
  it('finishes with the note typed, or without one', async () => {
    const onFinish = jest.fn();
    await render(<FinishSheet visible onFinish={onFinish} />);
    expect(screen.getByRole('button', { name: 'Save and finish' })).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('Note'), ' Less salt ');
    await fireEvent.press(screen.getByRole('button', { name: 'Save and finish' }));
    expect(onFinish).toHaveBeenCalledWith('Less salt');
    await fireEvent.press(screen.getByRole('button', { name: 'Finish without a note' }));
    expect(onFinish).toHaveBeenCalledWith(null);
  });
});
