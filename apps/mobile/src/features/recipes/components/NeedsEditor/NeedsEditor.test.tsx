import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { EMPTY_NEEDS, type NeedsDraft } from '../../needs';

import { NeedsEditor } from './NeedsEditor';

function Harness({ initial = EMPTY_NEEDS }: { readonly initial?: NeedsDraft }) {
  const [value, setValue] = useState(initial);
  return <NeedsEditor value={value} errors={{}} onChange={setValue} />;
}

const TWO: NeedsDraft = {
  ingredients: [
    { key: 'a', name: 'Beetroot', amount: '500', unit: 'g', note: '' },
    { key: 'b', name: 'Kefir', amount: '', unit: null, note: 'cold' },
  ],
  equipment: [{ key: 'e', name: 'Blender', note: '', optional: true }],
};

describe('NeedsEditor', () => {
  /** The criterion: Add checks the line and settles it into a row. */
  it('opens a card for a new line, refuses an empty name, and settles a named one', async () => {
    await render(<Harness />);
    await fireEvent.press(screen.getByRole('button', { name: 'Add ingredient' }));
    expect(screen.getByLabelText('Name')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Add unnamed line' }));
    expect(screen.getByLabelText('Name, Give the line a name.')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText(/^Name/), 'Beetroot');
    await fireEvent.changeText(screen.getByLabelText('Amount (optional)'), '2');
    await fireEvent.press(screen.getByRole('button', { name: 'Add Beetroot' }));
    expect(screen.queryByLabelText(/^Name/)).toBeNull();
    expect(screen.getByLabelText('2 Beetroot')).toBeTruthy();
  });

  it('drops a new line on Cancel, and puts an edited line back on Cancel', async () => {
    await render(<Harness initial={TWO} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Add equipment' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByLabelText('Name')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'Edit Kefir' }));
    expect(screen.getByLabelText('Name')).toHaveProp('value', 'Kefir');
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Yoghurt');
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByLabelText('Kefir, cold')).toBeTruthy();
    expect(screen.queryByText('Yoghurt')).toBeNull();
  });

  it('saves an edit back into the row', async () => {
    await render(<Harness initial={TWO} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Edit Kefir' }));
    await fireEvent.changeText(screen.getByLabelText('Name'), 'Yoghurt');
    await fireEvent.press(screen.getByRole('button', { name: 'Save Yoghurt' }));
    expect(screen.getByLabelText('Yoghurt, cold')).toBeTruthy();
  });

  /** The criterion: a loaded recipe starts with every line settled. */
  it('shows loaded lines as rows, amounts and the optional mark included', async () => {
    await render(<Harness initial={TWO} />);
    expect(screen.queryByLabelText('Name')).toBeNull();
    expect(screen.getByLabelText('500 g Beetroot')).toBeTruthy();
    expect(screen.getByLabelText('Blender (optional)')).toBeTruthy();
  });

  it('moves a settled line with the buttons and removes one', async () => {
    await render(<Harness initial={TWO} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Move Kefir up' }));
    const rows = screen
      .getAllByLabelText(/^(Kefir, cold|500 g Beetroot)$/)
      .map((row) => row.props.accessibilityLabel as string);
    expect(rows).toEqual(['Kefir, cold', '500 g Beetroot']);
    await fireEvent.press(screen.getByRole('button', { name: 'Remove Kefir' }));
    expect(screen.queryByLabelText('Kefir, cold')).toBeNull();
  });

  it('reopens a settled line when the save flags it', async () => {
    await render(<NeedsEditor value={TWO} errors={{ a: { amount: true } }} onChange={jest.fn()} />);
    expect(screen.getByLabelText(/^Amount \(optional\), Amount is a number/)).toBeTruthy();
    expect(screen.queryByLabelText('500 g Beetroot')).toBeNull();
  });

  /** 0030: common ingredients and tools above a fresh card, gone once it has a name. */
  it('offers the common ingredients and tools above a new card until it has a name', async () => {
    await render(<Harness />);
    await fireEvent.press(screen.getByRole('button', { name: 'Add ingredient' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Garlic' }));
    expect(screen.getByLabelText(/^Name/)).toHaveProp('value', 'Garlic');
    expect(screen.queryByRole('checkbox', { name: 'Salt' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Add Garlic' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Add equipment' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Frying pan' }));
    expect(screen.getByLabelText(/^Name/)).toHaveProp('value', 'Frying pan');
    expect(screen.queryByRole('checkbox', { name: 'Pot' })).toBeNull();
  });
});
