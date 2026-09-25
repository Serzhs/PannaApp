import { fireEvent, render, screen } from '@testing-library/react-native';

import { QUICK_STEPS, QuickSteps } from './QuickSteps';

describe('QuickSteps', () => {
  /** The criterion: five, each a button named by its text, and a tap hands that text back. */
  it('offers the five common steps and hands back the tapped one', async () => {
    const onPick = jest.fn();
    await render(<QuickSteps onPick={onPick} />);
    expect(QUICK_STEPS).toHaveLength(5);
    for (const name of [
      'Boil water',
      'Heat the pan',
      'Heat the oven',
      'Chop the onions',
      'Season with salt and pepper',
    ]) {
      expect(screen.getByRole('checkbox', { name })).toBeTruthy();
    }
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Heat the pan' }));
    expect(onPick).toHaveBeenCalledWith('Heat the pan');
  });
});
