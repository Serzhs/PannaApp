import { fireEvent, render, screen } from '@testing-library/react-native';

import { ChoiceList } from './ChoiceList';

const choices = [
  { value: null, label: 'Device (English)' },
  { value: 'en', label: 'English' },
  { value: 'lv', label: 'Latviešu' },
] as const;

describe('ChoiceList', () => {
  it('is a radio group whose rows announce their state', async () => {
    await render(<ChoiceList title="Language" choices={choices} value="lv" onChange={jest.fn()} />);
    expect(screen.getByRole('radio', { name: 'Latviešu' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'English' })).not.toBeChecked();
  });

  it("reports a press as the row's value, and nothing for the row already chosen", async () => {
    const onChange = jest.fn();
    await render(<ChoiceList title="Language" choices={choices} value="lv" onChange={onChange} />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Device (English)' }));
    expect(onChange).toHaveBeenCalledWith(null);
    await fireEvent.press(screen.getByRole('radio', { name: 'Latviešu' }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('marks the chosen row with text, not colour alone', async () => {
    await render(<ChoiceList title="Language" choices={choices} value="en" onChange={jest.fn()} />);
    expect(screen.getByText('✓', { includeHiddenElements: true })).toBeTruthy();
  });
});
