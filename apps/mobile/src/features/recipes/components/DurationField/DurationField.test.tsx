import { fireEvent, render, screen } from '@testing-library/react-native';

import { DurationField } from './DurationField';

describe('DurationField', () => {
  it('reads as not timed, or as the time, in its name', async () => {
    const view = await render(<DurationField value={null} onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Time (optional), Not timed' })).toBeTruthy();
    await view.rerender(<DurationField value={5400} onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Time (optional), 1 h 30 min' })).toBeTruthy();
  });

  it('clears the time from the sheet', async () => {
    const onChange = jest.fn();
    await render(<DurationField value={600} onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Time (optional), 10 min' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Clear' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('keeps the picked time on Set', async () => {
    const onChange = jest.fn();
    await render(<DurationField value={600} onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Time (optional), 10 min' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Set' }));
    expect(onChange).toHaveBeenCalledWith(600);
  });
});
