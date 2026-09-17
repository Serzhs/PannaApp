import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import type { StepDraft } from '../../steps';

import { StepsEditor } from './StepsEditor';

function Harness({ initial = [] }: { readonly initial?: StepDraft[] }) {
  const [value, setValue] = useState(initial);
  return (
    <StepsEditor value={value} errors={{}} onChange={setValue} ingredients={[]} equipment={[]} />
  );
}

const step = (key: string, body: string, during: string | null = null): StepDraft => ({
  key,
  body,
  note: '',
  durationSeconds: null,
  ingredientIds: [],
  equipmentIds: [],
  during,
});

const bodies = () => screen.getAllByLabelText(/^Instruction/).map((f) => f.props.value as string);

describe('StepsEditor', () => {
  it('adds a step at the end, numbered', async () => {
    await render(<Harness initial={[step('a', 'Heat')]} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Add step' }));
    expect(screen.getByText('Step 2')).toBeTruthy();
  });

  /** The criterion: no nest or promote buttons; a parallel step says which step it runs during. */
  it('shows a flat list with no nesting controls, and says what a parallel step runs during', async () => {
    await render(
      <Harness initial={[step('a', 'Heat'), step('b', 'Roast'), step('c', 'Chop', 'b')]} />,
    );
    expect(screen.getByText('Step 2a, during step 2')).toBeTruthy();
    expect(screen.getByText('During step 2')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /meanwhile|main step|previous step/ })).toBeNull();
  });

  /** The promotion rule, in the editor: the parallel steps stay, numbered as main steps. */
  it('makes the parallel steps main ones in place when their step is removed', async () => {
    await render(
      <Harness initial={[step('a', 'Heat'), step('b', 'Roast'), step('c', 'Chop', 'b')]} />,
    );
    const removes = screen.getAllByRole('button', { name: 'Remove step' });
    const roast = removes[1];
    if (roast === undefined) throw new Error('no remove button');
    await fireEvent.press(roast);
    expect(screen.getByText('Step 2')).toBeTruthy();
    expect(screen.queryByText(/during step/)).toBeNull();
    expect(bodies()).toEqual(['Heat', 'Chop']);
  });

  it('moves a step among its own level only', async () => {
    await render(
      <Harness
        initial={[
          step('a', 'Heat'),
          step('b', 'Roast'),
          step('c', 'Chop', 'b'),
          step('d', 'Boil', 'b'),
        ]}
      />,
    );
    // Chop is first among Roast's parallel steps: no up, even though Roast sits above it.
    expect(screen.queryByRole('button', { name: 'Move Chop up' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Move Boil up' }));
    expect(bodies()).toEqual(['Heat', 'Roast', 'Boil', 'Chop']);
    await fireEvent.press(screen.getByRole('button', { name: 'Move Roast up' }));
    expect(bodies()).toEqual(['Roast', 'Boil', 'Chop', 'Heat']);
  });
});
