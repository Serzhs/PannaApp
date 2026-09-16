import { render, screen } from '@testing-library/react-native';
import { View } from 'react-native';

import { EmptyState } from './EmptyState';

import { Button } from '@/components/Button';

describe('EmptyState', () => {
  it('announces its title as a heading', async () => {
    await render(<EmptyState title="No recipes yet" />);
    expect(screen.getByRole('header', { name: 'No recipes yet' })).toBeTruthy();
  });

  it('shows the body and offers the action', async () => {
    await render(
      <EmptyState
        title="No recipes yet"
        body="Write one, or paste one from your AI."
        action={<Button label="New recipe" />}
      />,
    );
    expect(screen.getByText('Write one, or paste one from your AI.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'New recipe' })).toBeTruthy();
  });

  it('hides a decorative icon from the screen reader', async () => {
    await render(<EmptyState title="No recipes yet" icon={<View testID="icon" />} />);
    expect(screen.queryByTestId('icon')).toBeNull();
    expect(screen.getByTestId('icon', { includeHiddenElements: true })).toBeTruthy();
  });
});
