import { fireEvent, render, screen } from '@testing-library/react-native';

import { LinkChips } from './LinkChips';

const options = [{ id: 'i1', name: 'Beetroot' }, { id: 'i2', name: 'Dill' }, { name: 'Kefir' }];

describe('LinkChips', () => {
  it('toggles an id on and off, keeping the others', async () => {
    const onChange = jest.fn();
    await render(
      <LinkChips
        title="Uses"
        options={options}
        selected={['i1']}
        onChange={onChange}
        unsavedHint="Save first"
      />,
    );
    expect(screen.getByRole('checkbox', { name: 'Beetroot' })).toBeChecked();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Dill' }));
    expect(onChange).toHaveBeenLastCalledWith(['i1', 'i2']);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Beetroot' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('disables a line that has not been saved yet and explains why', async () => {
    const onChange = jest.fn();
    await render(
      <LinkChips
        title="Uses"
        options={options}
        selected={[]}
        onChange={onChange}
        unsavedHint="Save first"
      />,
    );
    const kefir = screen.getByRole('checkbox', { name: 'Kefir' });
    expect(kefir).toBeDisabled();
    await fireEvent.press(kefir);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Save first')).toBeTruthy();
  });

  it('renders nothing when there is nothing to pick from', async () => {
    await render(
      <LinkChips title="Uses" options={[]} selected={[]} onChange={jest.fn()} unsavedHint="" />,
    );
    expect(screen.queryByText('Uses')).toBeNull();
  });
});
