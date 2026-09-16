import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';

export interface ConfirmDialogProps {
  readonly visible: boolean;
  readonly title: string;
  readonly body?: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly destructive?: boolean;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

/**
 * The platform's own alert rather than a drawn modal, per the Platform behaviour section
 * of CLAUDE.md: the right look on each phone, the back gesture, focus returning to what
 * opened it and screen reader support all come for free, which is why there is no styles
 * file. It renders nothing itself; the alert is shown when `visible` turns true.
 */
export function ConfirmDialog({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps): null {
  // React runs effects twice in development, and an alert shown twice stacks.
  const shown = useRef(false);

  useEffect(() => {
    if (!visible) {
      shown.current = false;
      return;
    }
    if (shown.current) return;
    shown.current = true;

    Alert.alert(
      title,
      body,
      [
        { text: cancelLabel, style: 'cancel', onPress: onCancel },
        { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
      ],
      // Dismissing with the Android back gesture is a cancel, not a limbo.
      { cancelable: true, onDismiss: onCancel },
    );
  }, [visible, title, body, confirmLabel, cancelLabel, destructive, onConfirm, onCancel]);

  return null;
}
