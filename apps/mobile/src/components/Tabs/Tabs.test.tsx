import { fireEvent, render, screen } from '@testing-library/react-native';

import { Tabs } from './Tabs';

const TABS = [
  { key: 'recipe', label: 'Recipe' },
  { key: 'steps', label: 'Steps' },
] as const;

describe('Tabs', () => {
  it('reads as tabs, marks the open one selected, and reports a tap', async () => {
    const onChange = jest.fn();
    await render(<Tabs tabs={TABS} value="recipe" onChange={onChange} />);
    expect(screen.getByRole('tab', { name: 'Recipe' })).toBeSelected();
    expect(screen.getByRole('tab', { name: 'Steps' })).not.toBeSelected();
    await fireEvent.press(screen.getByRole('tab', { name: 'Steps' }));
    expect(onChange).toHaveBeenCalledWith('steps');
  });
});
