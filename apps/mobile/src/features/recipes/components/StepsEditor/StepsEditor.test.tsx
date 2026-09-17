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

/** A saved step: it has an id, so it starts settled. */
const saved = (key: string, body: string, during: string | null = null): StepDraft => ({
  key,
  id: key,
  body,
  note: '',
  durationSeconds: null,
  ingredientIds: [],
  equipmentIds: [],
  during,
});
const fresh = (key: string): StepDraft => ({
  key,
  body: '',
  note: '',
  durationSeconds: null,
  ingredientIds: [],
  equipmentIds: [],
  during: null,
});

const rowLabels = () =>
  screen
    .getAllByLabelText(/^(Heat|Roast|Chop|Boil|Serve)/)
    .map((row) => row.props.accessibilityLabel as string);

describe('StepsEditor', () => {
  /** The criterion: a new step is open, a loaded one settled. */
  it('opens a step that was never saved and settles the loaded ones', async () => {
    await render(<Harness initial={[saved('a', 'Heat'), fresh('b')]} />);
    expect(screen.getByLabelText('Heat')).toBeTruthy();
    expect(screen.getAllByLabelText(/^Instruction/)).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Add step 2' })).toBeTruthy();
  });

  it('refuses to settle an empty instruction, then settles a written one with its time', async () => {
    await render(<Harness initial={[fresh('a')]} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Add step 1' }));
    expect(screen.getByLabelText('Instruction, Write what to do.')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText(/^Instruction/), 'Roast');
    await fireEvent.press(screen.getByRole('button', { name: 'Add step 1' }));
    expect(screen.queryByLabelText(/^Instruction/)).toBeNull();
    expect(screen.getByLabelText('Roast')).toBeTruthy();
  });

  it('shows the time under a settled step', async () => {
    await render(<Harness initial={[{ ...saved('a', 'Roast'), durationSeconds: 600 }]} />);
    expect(screen.getByLabelText('Roast, 10 min')).toBeTruthy();
  });

  it('drops a new step on Cancel, and puts an edited step back on Cancel', async () => {
    await render(<Harness initial={[saved('a', 'Heat')]} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Add step' }));
    expect(screen.getByText('Step 2')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Step 2')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Edit step 1' }));
    expect(screen.getByLabelText('Instruction')).toHaveProp('value', 'Heat');
    await fireEvent.changeText(screen.getByLabelText('Instruction'), 'Warm');
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByLabelText('Heat')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Edit step 1' }));
    await fireEvent.changeText(screen.getByLabelText('Instruction'), 'Warm');
    await fireEvent.press(screen.getByRole('button', { name: 'Save step 1' }));
    expect(screen.getByLabelText('Warm')).toBeTruthy();
  });

  /** The criterion from 0022 still holds: no nesting controls, and a parallel step says so. */
  it('shows a flat list with no nesting controls, and says what a parallel step runs during', async () => {
    await render(
      <Harness initial={[saved('a', 'Heat'), saved('b', 'Roast'), saved('c', 'Chop', 'b')]} />,
    );
    expect(screen.getByText('Step 2a, during step 2')).toBeTruthy();
    expect(screen.getByText('During step 2')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /meanwhile|main step|previous step/ })).toBeNull();
  });

  /** The promotion rule, in the editor: the parallel steps stay, numbered as main steps. */
  it('makes the parallel steps main ones in place when their step is removed', async () => {
    await render(
      <Harness initial={[saved('a', 'Heat'), saved('b', 'Roast'), saved('c', 'Chop', 'b')]} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Remove step 2' }));
    expect(screen.getByText('Step 2')).toBeTruthy();
    expect(screen.queryByText(/during step/)).toBeNull();
    expect(rowLabels()).toEqual(['Heat', 'Chop']);
  });

  it('moves a step among its own level only', async () => {
    await render(
      <Harness
        initial={[
          saved('a', 'Heat'),
          saved('b', 'Roast'),
          saved('c', 'Chop', 'b'),
          saved('d', 'Boil', 'b'),
        ]}
      />,
    );
    // Chop is first among Roast's parallel steps: no up, even though Roast sits above it.
    expect(screen.queryByRole('button', { name: 'Move Chop up' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Move Boil up' }));
    expect(rowLabels()).toEqual(['Heat', 'Roast', 'Boil', 'Chop']);
    await fireEvent.press(screen.getByRole('button', { name: 'Move Roast up' }));
    expect(rowLabels()).toEqual(['Roast', 'Boil', 'Chop', 'Heat']);
  });
});
