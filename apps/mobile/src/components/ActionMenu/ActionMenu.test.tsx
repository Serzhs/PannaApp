import { ActionSheetIOS } from 'react-native';

import { showActionMenu } from './ActionMenu';

describe('showActionMenu', () => {
  /** The sheet is the platform's; the test checks what it is handed and that a tap lands. */
  it('opens the iOS sheet with the actions, cancel last, and runs the chosen one', () => {
    const sheet = jest
      .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
      .mockImplementation((_options, callback) => {
        callback(1);
      });
    const edit = jest.fn();
    const remove = jest.fn();
    showActionMenu({
      title: 'Soup',
      actions: [
        { label: 'Edit', onPress: edit },
        { label: 'Delete', destructive: true, onPress: remove },
      ],
      cancelLabel: 'Cancel',
    });
    expect(sheet).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Soup',
        options: ['Edit', 'Delete', 'Cancel'],
        cancelButtonIndex: 2,
        destructiveButtonIndex: 1,
      }),
      expect.any(Function),
    );
    expect(remove).toHaveBeenCalled();
    expect(edit).not.toHaveBeenCalled();
    sheet.mockRestore();
  });
});
