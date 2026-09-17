import { fireEvent, render, screen } from '@testing-library/react-native';

import { ReorderableList } from './ReorderableList';

import { Text } from '@/components/Text';

const labels = {
  moveUp: (item: string) => `Move ${item} up`,
  moveDown: (item: string) => `Move ${item} down`,
  up: 'Move up',
  down: 'Move down',
};

function renderList(items: readonly string[], onMove = jest.fn()) {
  return render(
    <ReorderableList
      items={items}
      keyOf={(item) => item}
      renderItem={(item, _index, controls) => (
        <>
          {controls}
          <Text>{item}</Text>
        </>
      )}
      onMove={onMove}
      labels={labels}
    />,
  );
}

describe('ReorderableList', () => {
  it('renders every item with worded move buttons and nothing to drag', async () => {
    await renderList(['Beetroot', 'Kefir', 'Dill']);
    expect(screen.getByText('Kefir')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Move Kefir up' })).toBeTruthy();
    // Two lines can go up and two can go down; the words are what everyone sees.
    expect(screen.getAllByText('↑ Move up')).toHaveLength(2);
    expect(screen.getAllByText('↓ Move down')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /drag/i })).toBeNull();
  });

  /** The criterion: the first line has no move up, the last no move down. */
  it('offers no move up on the first line and no move down on the last', async () => {
    await renderList(['Beetroot', 'Kefir', 'Dill']);
    expect(screen.queryByRole('button', { name: 'Move Beetroot up' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Move Beetroot down' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Move Dill up' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Move Dill down' })).toBeNull();
  });

  it('reports a move as from and to', async () => {
    const onMove = jest.fn();
    await renderList(['Beetroot', 'Kefir', 'Dill'], onMove);
    await fireEvent.press(screen.getByRole('button', { name: 'Move Beetroot down' }));
    expect(onMove).toHaveBeenCalledWith(0, 1);
    await fireEvent.press(screen.getByRole('button', { name: 'Move Kefir up' }));
    expect(onMove).toHaveBeenCalledWith(1, 0);
    await fireEvent.press(screen.getByRole('button', { name: 'Move Kefir down' }));
    expect(onMove).toHaveBeenCalledWith(1, 2);
  });

  it('shows nothing to move for a single line', async () => {
    await renderList(['Beetroot']);
    expect(screen.queryByRole('button', { name: /Move/ })).toBeNull();
  });
});
