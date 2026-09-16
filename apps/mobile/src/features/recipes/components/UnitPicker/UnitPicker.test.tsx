import { fireEvent, render, screen } from '@testing-library/react-native';

import { UnitPicker } from './UnitPicker';

describe('UnitPicker', () => {
  it('shows the current unit, or none, as its value', async () => {
    const view = await render(<UnitPicker value="g" onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Unit, g' })).toBeTruthy();
    await view.rerender(<UnitPicker value={null} onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Unit, None' })).toBeTruthy();
  });

  /** The criterion: all fourteen units, grouped by dimension. */
  it('opens a sheet listing every unit under its dimension', async () => {
    await render(<UnitPicker value={null} onChange={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Unit, None' }));
    expect(screen.getByRole('header', { name: 'Weight' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Volume' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Count' })).toBeTruthy();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(15);
  });

  it('reports the chosen unit and closes', async () => {
    const onChange = jest.fn();
    await render(<UnitPicker value={null} onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Unit, None' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'cup' }));
    expect(onChange).toHaveBeenCalledWith('cup');
  });
});
