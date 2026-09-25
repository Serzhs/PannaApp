import { fireEvent, render, screen } from '@testing-library/react-native';

import { UnitPicker } from './UnitPicker';

describe('UnitPicker', () => {
  /** The criterion (0033): the common units as chips, the chosen one selected, Other beside them. */
  it('offers the common units as chips and reports the tapped one', async () => {
    const onChange = jest.fn();
    await render(<UnitPicker value="g" onChange={onChange} />);
    for (const name of ['None', 'g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'piece', 'Other']) {
      expect(screen.getByRole('radio', { name })).toBeTruthy();
    }
    expect(screen.getByRole('radio', { name: 'g' })).toBeChecked();
    await fireEvent.press(screen.getByRole('radio', { name: 'ml' }));
    expect(onChange).toHaveBeenCalledWith('ml');
    await fireEvent.press(screen.getByRole('radio', { name: 'None' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  /** The criterion: Other opens the sheet of all fourteen under their dimension, and reports the choice. */
  it('opens the full sheet from Other, grouped by dimension', async () => {
    const onChange = jest.fn();
    await render(<UnitPicker value={null} onChange={onChange} />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Other' }));
    expect(screen.getByRole('header', { name: 'Weight' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Volume' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Count' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('radio', { name: 'cup' }));
    expect(onChange).toHaveBeenCalledWith('cup');
  });

  /** The criterion: a unit outside the row shows selected in Other's place. */
  it('shows a unit from the sheet selected where Other was', async () => {
    await render(<UnitPicker value="cup" onChange={jest.fn()} />);
    expect(screen.getByRole('radio', { name: 'cup' })).toBeChecked();
    expect(screen.queryByRole('radio', { name: 'Other' })).toBeNull();
  });
});
