import { render, screen } from '@testing-library/react-native';

import { TextField } from './TextField';

import { theme } from '@/styles/theme';

describe('TextField', () => {
  it('is found by its label rather than a testID', async () => {
    await render(<TextField label="Recipe title" value="" />);
    expect(screen.getByLabelText('Recipe title')).toBeTruthy();
  });

  /**
   * The criterion this covers is that the error reaches a screen reader at all. Colour
   * alone would pass a visual review and fail a blind user.
   */
  it('folds the error into the accessible name so it is announced with the field', async () => {
    await render(<TextField label="Recipe title" value="S" error="Too short" />);
    expect(screen.getByLabelText('Recipe title, Too short')).toBeTruthy();
  });

  it('shows the error as text, not only as a colour', async () => {
    await render(<TextField label="Recipe title" value="S" error="Too short" />);
    // Hidden from the accessibility tree on purpose, so the query opts back in.
    expect(screen.getByText('Too short', { includeHiddenElements: true })).toBeTruthy();
  });

  it('marks the border with danger when invalid', async () => {
    await render(<TextField label="Recipe title" value="S" error="Too short" testID="input" />);
    expect(screen.getByTestId('input')).toHaveStyle({ borderColor: theme.colors.danger });
  });

  it('offers the helper as a hint when there is no error', async () => {
    await render(<TextField label="Recipe title" value="" helper="Shown at the top" />);
    expect(screen.getByLabelText('Recipe title')).toHaveProp(
      'accessibilityHint',
      'Shown at the top',
    );
  });

  it('replaces the helper with the error rather than showing both', async () => {
    await render(
      <TextField label="Recipe title" value="S" helper="Shown at the top" error="Too short" />,
    );
    expect(screen.queryByText('Shown at the top', { includeHiddenElements: true })).toBeNull();
    expect(screen.getByText('Too short', { includeHiddenElements: true })).toBeTruthy();
  });

  it('gives the input a target at least 44 points tall', async () => {
    await render(<TextField label="Recipe title" value="" testID="input" />);
    expect(screen.getByTestId('input')).toHaveStyle({ minHeight: 44 });
  });

  /**
   * A border that grows on focus or error changes the field's height, which shifts
   * every field below it. In a form that reads as a jump, so the width is fixed and
   * only the colour moves.
   */
  it('keeps the same border width in every state, so the height cannot shift', async () => {
    const view = await render(<TextField label="Title" value="" testID="input" />);
    expect(screen.getByTestId('input')).toHaveStyle({ borderWidth: 1 });

    await view.rerender(<TextField label="Title" value="S" error="Too short" testID="input" />);
    expect(screen.getByTestId('input')).toHaveStyle({ borderWidth: 1 });
  });

  it('does not take the line height token, which would push the text off centre on iOS', async () => {
    await render(<TextField label="Title" value="" testID="input" />);
    expect(screen.getByTestId('input')).not.toHaveStyle({ lineHeight: theme.text.body.lineHeight });
  });
});
