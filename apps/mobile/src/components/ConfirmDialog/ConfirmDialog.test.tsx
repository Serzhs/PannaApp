import { render } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';

import { ConfirmDialog } from './ConfirmDialog';

function lastAlert(spy: jest.SpyInstance) {
  const call = spy.mock.calls.at(-1) as
    | [
        string,
        string | undefined,
        AlertButton[] | undefined,
        { onDismiss?: () => void } | undefined,
      ]
    | undefined;
  if (call === undefined) throw new Error('Alert.alert was not called');
  const [title, body, buttons = [], options] = call;
  const find = (text: string) => {
    const button = buttons.find((b) => b.text === text);
    if (button === undefined) throw new Error(`no button "${text}"`);
    return button;
  };
  return { title, body, find, options };
}

describe('ConfirmDialog', () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

  beforeEach(() => {
    alert.mockClear();
  });

  const props = {
    title: 'Delete this recipe?',
    body: 'This cannot be undone.',
    confirmLabel: 'Delete',
    cancelLabel: 'Keep',
  };

  it('shows nothing until asked to', async () => {
    await render(
      <ConfirmDialog {...props} visible={false} onConfirm={jest.fn()} onCancel={jest.fn()} />,
    );
    expect(alert).not.toHaveBeenCalled();
  });

  it('opens the platform alert with the title, body and both labels', async () => {
    await render(<ConfirmDialog {...props} visible onConfirm={jest.fn()} onCancel={jest.fn()} />);
    const { title, body, find } = lastAlert(alert);
    expect(title).toBe('Delete this recipe?');
    expect(body).toBe('This cannot be undone.');
    expect(find('Delete')).toBeTruthy();
    expect(find('Keep').style).toBe('cancel');
  });

  it('routes each button to its callback', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    await render(<ConfirmDialog {...props} visible onConfirm={onConfirm} onCancel={onCancel} />);
    const { find } = lastAlert(alert);
    find('Delete').onPress?.();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    find('Keep').onPress?.();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  /**
   * The criterion: destructive uses the platform's own destructive style, which is what
   * a screen reader announces, rather than a colour nobody hears.
   */
  it('marks the confirm button destructive when told to, and not otherwise', async () => {
    const view = await render(
      <ConfirmDialog {...props} visible destructive onConfirm={jest.fn()} onCancel={jest.fn()} />,
    );
    expect(lastAlert(alert).find('Delete').style).toBe('destructive');

    await view.unmount();
    await render(<ConfirmDialog {...props} visible onConfirm={jest.fn()} onCancel={jest.fn()} />);
    expect(lastAlert(alert).find('Delete').style).toBe('default');
  });

  it('treats dismissing with the back gesture as a cancel', async () => {
    const onCancel = jest.fn();
    await render(<ConfirmDialog {...props} visible onConfirm={jest.fn()} onCancel={onCancel} />);
    const { options } = lastAlert(alert);
    options?.onDismiss?.();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('opens once per showing, not once per render', async () => {
    const view = await render(
      <ConfirmDialog {...props} visible onConfirm={jest.fn()} onCancel={jest.fn()} />,
    );
    await view.rerender(
      <ConfirmDialog {...props} visible onConfirm={jest.fn()} onCancel={jest.fn()} />,
    );
    expect(alert).toHaveBeenCalledTimes(1);

    await view.rerender(
      <ConfirmDialog {...props} visible={false} onConfirm={jest.fn()} onCancel={jest.fn()} />,
    );
    await view.rerender(
      <ConfirmDialog {...props} visible onConfirm={jest.fn()} onCancel={jest.fn()} />,
    );
    expect(alert).toHaveBeenCalledTimes(2);
  });
});
