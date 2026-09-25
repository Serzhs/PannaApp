import { fireEvent, render, screen } from '@testing-library/react-native';

import { FactTile } from './FactTile';

describe('FactTile', () => {
  it('is a fact without a press, and a link with one', async () => {
    const onPress = jest.fn();
    await render(
      <>
        <FactTile icon="people-outline" text="4 servings" accessibilityLabel="4 servings" />
        <FactTile
          icon="repeat-outline"
          text="Made twice"
          detail="last on 14 September"
          accessibilityLabel="Made twice, last on 14 September"
          onPress={onPress}
        />
      </>,
    );
    expect(screen.getByLabelText('4 servings')).toBeTruthy();
    expect(screen.queryByRole('link', { name: '4 servings' })).toBeNull();
    await fireEvent.press(screen.getByRole('link', { name: 'Made twice, last on 14 September' }));
    expect(onPress).toHaveBeenCalled();
  });
});
