import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import type { MainStepDraft } from '../../steps';

import { StepsEditor } from './StepsEditor';

function Harness({ initial = [] }: { readonly initial?: MainStepDraft[] }) {
  const [value, setValue] = useState(initial);
  return (
    <StepsEditor value={value} errors={{}} onChange={setValue} ingredients={[]} equipment={[]} />
  );
}

const main = (
  key: string,
  body: string,
  children: MainStepDraft['children'] = [],
): MainStepDraft => ({
  key,
  body,
  note: '',
  durationSeconds: null,
  ingredientIds: [],
  equipmentIds: [],
  children,
});

describe('StepsEditor', () => {
  it('adds a main step, then a step to do meanwhile under it', async () => {
    await render(<Harness />);
    await fireEvent.press(screen.getByRole('button', { name: 'Add step' }));
    expect(screen.getByText('Step 1')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Add a step to do meanwhile' }));
    expect(screen.getByText('Meanwhile')).toBeTruthy();
    expect(screen.getByText('Step 1a, during step 1')).toBeTruthy();
  });

  it('nests a main step under the previous one and promotes it back', async () => {
    await render(<Harness initial={[main('a', 'Heat'), main('b', 'Chop')]} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Do this during the previous step' }));
    expect(screen.getByText('Step 1a, during step 1')).toBeTruthy();
    expect(screen.queryByText('Step 2')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Make this a main step' }));
    expect(screen.getByText('Step 2')).toBeTruthy();
    expect(screen.queryByText('Meanwhile')).toBeNull();
  });

  it('offers nesting only to a main step with a previous one and nothing nested', async () => {
    await render(
      <Harness
        initial={[
          main('a', 'Heat'),
          main('b', 'Roast', [
            {
              key: 'c',
              body: 'Chop',
              note: '',
              durationSeconds: null,
              ingredientIds: [],
              equipmentIds: [],
            },
          ]),
        ]}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Do this during the previous step' })).toBeNull();
  });

  /** The promotion rule, in the editor: the nested steps stay, numbered as main steps. */
  it('promotes nested steps in place when their main step is removed', async () => {
    await render(
      <Harness
        initial={[
          main('a', 'Heat'),
          main('b', 'Roast', [
            {
              key: 'c',
              body: 'Chop',
              note: '',
              durationSeconds: null,
              ingredientIds: [],
              equipmentIds: [],
            },
          ]),
        ]}
      />,
    );
    const removes = screen.getAllByRole('button', { name: 'Remove step' });
    // The main step's remove is the last one rendered inside its card.
    const last = removes.at(-1);
    if (last === undefined) throw new Error('no remove button');
    await fireEvent.press(last);
    expect(screen.getByText('Step 2')).toBeTruthy();
    const bodies = screen.getAllByLabelText(/^Instruction/).map((f) => f.props.value as string);
    expect(bodies).toEqual(['Heat', 'Chop']);
  });

  it('moves a main step with the buttons', async () => {
    await render(<Harness initial={[main('a', 'Heat'), main('b', 'Chop')]} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Move Chop up' }));
    const bodies = screen.getAllByLabelText(/^Instruction/).map((f) => f.props.value as string);
    expect(bodies).toEqual(['Chop', 'Heat']);
  });
});
