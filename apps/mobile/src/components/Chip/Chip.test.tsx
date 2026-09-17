import { fireEvent, render, screen } from '@testing-library/react-native';

import { Chip } from './Chip';

describe('Chip', () => {
  it('is a checkbox that reports whether it is on', async () => {
    const onPress = jest.fn();
    await render(<Chip label="Dill" selected={false} onPress={onPress} />);
    const chip = screen.getByRole('checkbox', { name: 'Dill' });
    expect(chip).not.toBeChecked();
    await fireEvent.press(chip);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows a mark as well as a fill when on', async () => {
    await render(<Chip label="Dill" selected onPress={jest.fn()} />);
    expect(screen.getByRole('checkbox', { name: 'Dill' })).toBeChecked();
    expect(screen.getByText('✓ Dill')).toBeTruthy();
  });

  it('cannot be pressed when disabled, and says so', async () => {
    const onPress = jest.fn();
    await render(<Chip label="Dill" selected={false} onPress={onPress} disabled />);
    const chip = screen.getByRole('checkbox', { name: 'Dill' });
    expect(chip).toBeDisabled();
    await fireEvent.press(chip);
    expect(onPress).not.toHaveBeenCalled();
  });
});
