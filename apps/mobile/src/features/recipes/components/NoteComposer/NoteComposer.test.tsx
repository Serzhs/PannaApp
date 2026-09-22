import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { NoteComposer } from './NoteComposer';

import * as online from '@/query/useIsOnline';

describe('NoteComposer', () => {
  const isOnline = jest.spyOn(online, 'useIsOnline');
  beforeEach(() => {
    isOnline.mockReturnValue(true);
  });

  it('opens on Add a note, saves the trimmed text, and closes', async () => {
    const onSave = jest.fn(() => Promise.resolve());
    await render(<NoteComposer onSave={onSave} saving={false} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Add a note' }));
    await fireEvent.changeText(screen.getByLabelText('Note'), '  Less salt  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('Less salt');
    });
    expect(screen.queryByLabelText('Note')).toBeNull();
  });

  /** The criterion: offline shows the message and the text stays; so does a failed save. */
  it('keeps the text when offline', async () => {
    isOnline.mockReturnValue(false);
    const onSave = jest.fn(() => Promise.resolve());
    await render(<NoteComposer onSave={onSave} saving={false} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Add a note' }));
    await fireEvent.changeText(screen.getByLabelText('Note'), 'Less salt');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText(/You are offline/)).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Note')).toHaveProp('value', 'Less salt');
  });

  it('keeps the text when the save fails', async () => {
    const onSave = jest.fn(() => Promise.reject(new Error('down')));
    await render(<NoteComposer onSave={onSave} saving={false} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Add a note' }));
    await fireEvent.changeText(screen.getByLabelText('Note'), 'Less salt');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(screen.getByText('Could not save the note. Try again.')).toBeTruthy();
    });
    expect(screen.getByLabelText('Note')).toHaveProp('value', 'Less salt');
  });
});
