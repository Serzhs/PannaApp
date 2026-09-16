import { fireEvent, render, screen } from '@testing-library/react-native';

import { Card } from './Card';

import { Text } from '@/components/Text';

describe('Card', () => {
  it('renders its children', async () => {
    await render(
      <Card>
        <Text>Slow roast pork</Text>
      </Card>,
    );
    expect(screen.getByText('Slow roast pork')).toBeTruthy();
  });

  /**
   * The criterion: a list row is one stop for a screen reader, not a title, a subtitle
   * and a chip visited one after another.
   */
  it('reads as one element when given a label', async () => {
    await render(
      <Card accessibilityLabel="Slow roast pork, draft">
        <Text>Slow roast pork</Text>
        <Text>Draft</Text>
      </Card>,
    );
    // `accessible` plus a label is what folds the children into one stop on the device.
    expect(screen.getByLabelText('Slow roast pork, draft')).toHaveProp('accessible', true);
  });

  it('becomes a button when pressable, found by role and name', async () => {
    const onPress = jest.fn();
    await render(
      <Card accessibilityLabel="Slow roast pork" onPress={onPress}>
        <Text>Slow roast pork</Text>
      </Card>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Slow roast pork' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is not a button when it has nothing to do on press', async () => {
    await render(
      <Card>
        <Text>Slow roast pork</Text>
      </Card>,
    );
    expect(screen.queryByRole('button')).toBeNull();
  });
});
