import { fireEvent, render, screen } from '@testing-library/react-native';

import { QUICK_EQUIPMENT, QUICK_INGREDIENTS, QUICK_STEPS, QuickPicks } from './QuickPicks';

describe('QuickPicks', () => {
  /** The criterion: five of each, each a button named by its text, and a tap hands that text back. */
  it('offers five common steps and hands back the tapped one', async () => {
    const onPick = jest.fn();
    await render(<QuickPicks title="Common steps" options={QUICK_STEPS} onPick={onPick} />);
    expect(QUICK_STEPS).toHaveLength(5);
    expect(QUICK_INGREDIENTS).toHaveLength(5);
    expect(QUICK_EQUIPMENT).toHaveLength(5);
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

  it('offers the common ingredients and tools by name', async () => {
    await render(
      <>
        <QuickPicks title="Common ingredients" options={QUICK_INGREDIENTS} onPick={jest.fn()} />
        <QuickPicks title="Common equipment" options={QUICK_EQUIPMENT} onPick={jest.fn()} />
      </>,
    );
    for (const name of [
      'Salt',
      'Water',
      'Olive oil',
      'Onion',
      'Garlic',
      'Pot',
      'Frying pan',
      'Knife',
      'Chopping board',
      'Bowl',
    ]) {
      expect(screen.getByRole('checkbox', { name })).toBeTruthy();
    }
  });
});
