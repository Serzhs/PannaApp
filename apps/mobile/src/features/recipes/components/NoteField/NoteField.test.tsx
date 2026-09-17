import { fireEvent, render, screen } from '@testing-library/react-native';

import { NoteField } from './NoteField';

describe('NoteField', () => {
  it('starts as a button when there is no note, and opens the field when pressed', async () => {
    await render(
      <NoteField label="Note" addLabel="Add a note" value="" onChangeText={jest.fn()} />,
    );
    expect(screen.queryByLabelText('Note')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Add a note' }));
    expect(screen.getByLabelText('Note')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Add a note' })).toBeNull();
  });

  it('shows the field at once when a note already exists', async () => {
    await render(
      <NoteField label="Note" addLabel="Add a note" value="Fan off" onChangeText={jest.fn()} />,
    );
    expect(screen.getByLabelText('Note')).toHaveProp('value', 'Fan off');
    expect(screen.queryByRole('button', { name: 'Add a note' })).toBeNull();
  });
});
