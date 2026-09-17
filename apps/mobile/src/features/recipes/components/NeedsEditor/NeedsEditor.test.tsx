import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { EMPTY_NEEDS, type NeedsDraft } from '../../needs';

import { NeedsEditor } from './NeedsEditor';

function Harness({ initial = EMPTY_NEEDS }: { readonly initial?: NeedsDraft }) {
  const [value, setValue] = useState(initial);
  return <NeedsEditor value={value} errors={{}} onChange={setValue} />;
}

describe('NeedsEditor', () => {
  it('adds a line, names it as typed, and removes it', async () => {
    await render(<Harness />);
    await fireEvent.press(screen.getByRole('button', { name: 'Add ingredient' }));
    expect(screen.getByLabelText('Name')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Beetroot');
    await fireEvent.press(screen.getByRole('button', { name: 'Remove Beetroot' }));
    expect(screen.queryByLabelText('Name')).toBeNull();
  });

  it('moves a line with the buttons', async () => {
    await render(
      <Harness
        initial={{
          ingredients: [
            { key: 'a', name: 'Beetroot', amount: '', unit: null, note: '' },
            { key: 'b', name: 'Kefir', amount: '', unit: null, note: '' },
          ],
          equipment: [],
        }}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Move Kefir up' }));
    const names = screen.getAllByLabelText('Name').map((field) => field.props.value as string);
    expect(names).toEqual(['Kefir', 'Beetroot']);
  });

  it('adds equipment with the optional switch off', async () => {
    await render(<Harness />);
    await fireEvent.press(screen.getByRole('button', { name: 'Add equipment' }));
    expect(screen.getByRole('switch', { name: 'Optional' })).toHaveProp('value', false);
  });

  it("keeps each line's note behind a button until it is wanted, per 0020", async () => {
    await render(
      <Harness
        initial={{
          ingredients: [{ key: 'a', name: 'Beetroot', amount: '', unit: null, note: '' }],
          equipment: [{ key: 'e', name: 'Blender', note: 'Big one', optional: false }],
        }}
      />,
    );
    // The ingredient has no note: a button. The equipment has one: its field, open.
    expect(screen.getAllByLabelText('Note')).toHaveLength(1);
    expect(screen.getByLabelText('Note')).toHaveProp('value', 'Big one');
    await fireEvent.press(screen.getByRole('button', { name: 'Add a note' }));
    expect(screen.getAllByLabelText('Note')).toHaveLength(2);
  });
});
