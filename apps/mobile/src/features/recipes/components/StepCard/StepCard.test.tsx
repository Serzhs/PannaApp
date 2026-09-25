import { render, screen } from '@testing-library/react-native';

import { StepCard } from './StepCard';

describe('StepCard', () => {
  it('shows the number, the instruction, the facts and the note, and reads as one element', async () => {
    await render(
      <StepCard
        number="1"
        body="Heat the oven"
        when="10 min"
        uses="Uses 2 eggs"
        needs="Needs a pan"
        note="Fan off"
        accessibilityLabel="Step 1. Heat the oven. 10 min. Uses 2 eggs. Needs a pan. Fan off"
      />,
    );
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('Heat the oven')).toBeTruthy();
    expect(screen.getByText('10 min')).toBeTruthy();
    expect(screen.getByText('Fan off')).toBeTruthy();
    expect(
      screen.getByLabelText('Step 1. Heat the oven. 10 min. Uses 2 eggs. Needs a pan. Fan off'),
    ).toBeTruthy();
  });
});
