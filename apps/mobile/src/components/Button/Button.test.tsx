import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from './Button';

describe('Button', () => {
  it('is found by its role and its name', async () => {
    await render(<Button label="Save recipe" />);
    expect(screen.getByRole('button', { name: 'Save recipe' })).toBeTruthy();
  });

  it('calls onPress once per press', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('reports disabled through accessibilityState and fires nothing', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" disabled onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('reports busy while loading and swallows a second press', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" loading onPress={onPress} />);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeBusy();
    await fireEvent.press(button);
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  /**
   * Width cannot be measured without a layout pass, so the guarantee is checked where
   * it is actually made: the label stays mounted and keeps its box, hidden by opacity.
   */
  it('keeps the label laid out while loading so the button cannot resize', async () => {
    await render(<Button label="Save" loading />);
    expect(screen.getByText('Save')).toHaveStyle({ opacity: 0 });
  });

  it.each(['primary', 'secondary', 'ghost', 'danger'] as const)(
    'gives the %s variant a target of at least 44 by 44',
    async (variant) => {
      await render(<Button label="Go" variant={variant} />);
      expect(screen.getByRole('button', { name: 'Go' })).toHaveStyle({
        minHeight: 44,
        minWidth: 44,
      });
    },
  );
});
