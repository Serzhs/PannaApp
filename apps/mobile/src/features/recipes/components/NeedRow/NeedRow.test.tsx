import { fireEvent, render, screen } from '@testing-library/react-native';

import { NeedRow } from './NeedRow';

describe('NeedRow', () => {
  it('reads the line as one element and offers edit and remove', async () => {
    const onEdit = jest.fn();
    const onRemove = jest.fn();
    await render(
      <NeedRow
        title="500 g beetroot"
        detail="cold"
        editLabel="Edit"
        editAccessibilityLabel="Edit beetroot"
        removeLabel="Remove"
        removeAccessibilityLabel="Remove beetroot"
        onEdit={onEdit}
        onRemove={onRemove}
      />,
    );
    expect(screen.getByLabelText('500 g beetroot, cold')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Edit beetroot' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole('button', { name: 'Remove beetroot' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
