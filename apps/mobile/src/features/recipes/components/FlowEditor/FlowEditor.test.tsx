import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import type { StepDraft } from '../../steps';

import { FlowEditor } from './FlowEditor';

const step = (key: string, body: string, during: string | null = null): StepDraft => ({
  key,
  body,
  note: '',
  durationSeconds: null,
  ingredientIds: [],
  equipmentIds: [],
  during,
  imageKey: null,
});

function Harness({ initial }: { readonly initial: StepDraft[] }) {
  const [value, setValue] = useState(initial);
  return <FlowEditor value={value} onChange={setValue} />;
}

describe('FlowEditor', () => {
  /** The criterion: ticking moves the step under; "Back to the main flow" returns it after its parent. */
  it('ticks a step under another and sends it back to the main flow', async () => {
    await render(
      <Harness
        initial={[step('a', 'Heat the oven'), step('b', 'Roast'), step('c', 'Chop the dill')]}
      />,
    );
    expect(screen.getByText('2. Roast')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Add steps to do during step 2' }));
    // Roast itself is not offered; the others are.
    expect(screen.queryByRole('checkbox', { name: 'Roast' })).toBeNull();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Chop the dill' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByText('2a. Chop the dill')).toBeTruthy();
    expect(screen.queryByText('3. Chop the dill')).toBeNull();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Move Chop the dill back to the main flow' }),
    );
    expect(screen.getByText('3. Chop the dill')).toBeTruthy();
  });

  it('does not offer a step that already has parallel steps under it', async () => {
    await render(
      <Harness
        initial={[
          step('a', 'Heat'),
          step('b', 'Roast'),
          step('c', 'Chop', 'b'),
          step('e', 'Serve'),
        ]}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Add steps to do during step 3' }));
    expect(screen.getByRole('checkbox', { name: 'Heat' })).toBeTruthy();
    expect(screen.queryByRole('checkbox', { name: 'Roast' })).toBeNull();
  });

  it('says there is nothing to organise with fewer than two steps', async () => {
    await render(<Harness initial={[step('a', 'Heat')]} />);
    expect(screen.getByText(/at least two steps/)).toBeTruthy();
  });
});
