import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { Divider } from './Divider';

import { theme } from '@/styles/theme';

describe('Divider', () => {
  it('is hidden from the accessibility tree', async () => {
    await render(<Divider testID="divider" />);
    expect(screen.queryByTestId('divider')).toBeNull();
    expect(screen.getByTestId('divider', { includeHiddenElements: true })).toBeTruthy();
  });

  it('is one device pixel in the subtle border colour', async () => {
    await render(<Divider testID="divider" />);
    expect(screen.getByTestId('divider', { includeHiddenElements: true })).toHaveStyle({
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.borderSubtle,
    });
  });
});
