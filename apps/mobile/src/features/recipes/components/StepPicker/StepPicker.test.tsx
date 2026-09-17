import { fireEvent, render, screen } from '@testing-library/react-native';

import { StepPicker } from './StepPicker';

describe('StepPicker', () => {
  it('lists the steps as checkboxes and reports each tick with its new state', async () => {
    const onToggle = jest.fn();
    await render(
      <StepPicker
        visible
        title="During step 2, Roast"
        options={[
          { key: 'c', title: 'Chop the dill', checked: true },
          { key: 'e', title: 'Serve', checked: false },
        ]}
        onToggle={onToggle}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByRole('checkbox', { name: 'Chop the dill' })).toBeChecked();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Serve' }));
    expect(onToggle).toHaveBeenCalledWith('e', true);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Chop the dill' }));
    expect(onToggle).toHaveBeenCalledWith('c', false);
  });

  it('says so when no step could run during this one', async () => {
    await render(
      <StepPicker
        visible
        title="During step 1"
        options={[]}
        onToggle={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    expect(screen.getByText('No other step is free to run during this one.')).toBeTruthy();
  });
});
