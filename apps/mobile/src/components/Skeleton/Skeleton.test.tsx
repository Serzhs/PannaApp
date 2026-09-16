import { render, screen } from '@testing-library/react-native';

import { Skeleton } from './Skeleton';

import { Text } from '@/components/Text';
import { theme } from '@/styles/theme';

function lines(testID: string) {
  return screen
    .getByTestId(testID, { includeHiddenElements: true })
    .children.filter((child) => typeof child !== 'string');
}

describe('Skeleton', () => {
  it('is hidden from the accessibility tree', async () => {
    await render(
      <>
        <Skeleton.Text testID="text" lines={2} />
        <Skeleton.Block testID="block" height={theme.space.space16} />
      </>,
    );
    expect(screen.queryByTestId('text')).toBeNull();
    expect(screen.queryByTestId('block')).toBeNull();
    expect(screen.getByTestId('text', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId('block', { includeHiddenElements: true })).toBeTruthy();
  });

  /**
   * The criterion the side-by-side gallery entry checks by eye, checked here by
   * numbers: a line stands in for exactly one line of the text style it names.
   */
  it.each(['body', 'heading', 'caption'] as const)(
    'gives a %s line the same height as that text style',
    async (variant) => {
      await render(
        <>
          <Skeleton.Text testID="text" variant={variant} />
          <Text variant={variant}>Slow roast pork</Text>
        </>,
      );
      const [line] = lines('text');
      expect(line).toHaveStyle({ height: theme.text[variant].lineHeight });
      expect(screen.getByText('Slow roast pork')).toHaveStyle({
        lineHeight: theme.text[variant].lineHeight,
      });
    },
  );

  it('renders as many lines as asked for, the last one shorter', async () => {
    await render(<Skeleton.Text testID="text" lines={3} />);
    const all = lines('text');
    expect(all).toHaveLength(3);
    expect(all[0]).toHaveStyle({ width: '100%' });
    expect(all[2]).toHaveStyle({ width: '60%' });
  });

  it('draws a block at the size and radius it is given', async () => {
    await render(
      <Skeleton.Block
        testID="block"
        width={theme.space.space16}
        height={theme.space.space10}
        radius="radiusLg"
      />,
    );
    expect(screen.getByTestId('block', { includeHiddenElements: true })).toHaveStyle({
      width: theme.space.space16,
      height: theme.space.space10,
      borderRadius: theme.radius.radiusLg,
      backgroundColor: theme.colors.skeletonBase,
    });
  });
});
