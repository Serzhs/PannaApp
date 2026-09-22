import { render, screen } from '@testing-library/react-native';

import { NoteList } from './NoteList';

describe('NoteList', () => {
  it('reads each note with its date and step, newest first as given', async () => {
    await render(
      <NoteList
        notes={[
          {
            id: 'n2',
            stepId: 's1',
            cookId: null,
            body: 'Small ones take 35 min',
            createdAt: '2026-09-14T16:00:00.000Z',
          },
          {
            id: 'n1',
            stepId: null,
            cookId: 'c1',
            body: 'Squeeze a lemon in',
            createdAt: '2026-08-30T17:00:00.000Z',
          },
        ]}
        stepLabel={() => 'On step 1'}
      />,
    );
    expect(
      screen.getByLabelText(
        /^14 Sept 2026 · On step 1\. Small ones take 35 min$|^Sep 14, 2026 · On step 1\. Small ones take 35 min$/,
      ),
    ).toBeTruthy();
    expect(screen.getByText('Squeeze a lemon in')).toBeTruthy();
  });

  it('renders nothing for no notes', async () => {
    await render(<NoteList notes={[]} />);
    expect(screen.queryByText(/./)).toBeNull();
  });
});
