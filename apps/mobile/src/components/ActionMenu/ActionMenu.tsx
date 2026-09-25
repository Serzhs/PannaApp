import { ActionSheetIOS, Alert, Platform } from 'react-native';

export interface MenuAction {
  readonly label: string;
  readonly destructive?: boolean;
  readonly onPress: () => void;
}

export interface ActionMenuOptions {
  readonly title?: string;
  readonly actions: readonly MenuAction[];
  readonly cancelLabel: string;
}

/**
 * The platform's own menu, per the Platform behaviour section of CLAUDE.md: the iOS action
 * sheet, and on Android the system alert with its buttons, which holds three. No screen in
 * the app offers more than three actions at once, and this is where that limit lives.
 */
export function showActionMenu({ title, actions, cancelLabel }: ActionMenuOptions): void {
  if (Platform.OS === 'ios') {
    const cancelButtonIndex = actions.length;
    const destructiveButtonIndex = actions.findIndex((action) => action.destructive === true);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        ...(title === undefined ? {} : { title }),
        options: [...actions.map((action) => action.label), cancelLabel],
        cancelButtonIndex,
        ...(destructiveButtonIndex < 0 ? {} : { destructiveButtonIndex }),
      },
      (index) => {
        actions[index]?.onPress();
      },
    );
    return;
  }
  Alert.alert(
    title ?? '',
    undefined,
    [
      ...actions.map((action) => ({
        text: action.label,
        style: action.destructive === true ? ('destructive' as const) : ('default' as const),
        onPress: action.onPress,
      })),
      { text: cancelLabel, style: 'cancel' as const },
    ],
    { cancelable: true },
  );
}
