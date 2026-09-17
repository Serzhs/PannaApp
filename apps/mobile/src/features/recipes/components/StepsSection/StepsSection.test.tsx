import type { Step } from '@panna/shared';
import { render, screen } from '@testing-library/react-native';

import { StepsSection } from './StepsSection';

import * as unitSystem from '@/features/units/useUnitSystem';

const step = (over: Partial<Step> & { id: string }): Step => ({
  position: 0,
  body: 'Do something',
  note: null,
  durationSeconds: null,
  temperatureCelsius: null,
  ingredientIds: [],
  equipmentIds: [],
  children: [],
  ...over,
});

describe('StepsSection', () => {
  const system = jest.spyOn(unitSystem, 'useUnitSystem');

  /** The criteria: numbered from 1, nested marked as meanwhile with 2a numbers, 180 as 356°F. */
  it('numbers main steps, marks nested ones as meanwhile, and converts the temperature', async () => {
    system.mockReturnValue('imperial');
    await render(
      <StepsSection
        ingredients={[]}
        equipment={[]}
        steps={[
          step({ id: 'a', body: 'Heat the oven', temperatureCelsius: 180, durationSeconds: 600 }),
          step({
            id: 'b',
            body: 'Roast',
            children: [
              step({ id: 'c', body: 'Chop the dill' }),
              step({ id: 'd', body: 'Boil the eggs' }),
            ],
          }),
        ]}
      />,
    );
    expect(screen.getByText('Step 1')).toBeTruthy();
    expect(screen.getByText('10 min · 356°F')).toBeTruthy();
    expect(screen.getByText('Meanwhile')).toBeTruthy();
    expect(screen.getByText('Step 2a, during step 2')).toBeTruthy();
    expect(screen.getByText('Step 2b, during step 2')).toBeTruthy();
  });

  it('reads each step as one element with its number, body, timing and note', async () => {
    system.mockReturnValue('metric');
    await render(
      <StepsSection
        ingredients={[]}
        equipment={[]}
        steps={[step({ id: 'a', body: 'Heat the oven', temperatureCelsius: 180, note: 'Fan off' })]}
      />,
    );
    expect(screen.getByLabelText('Step 1. Heat the oven. 180°C. Fan off')).toBeTruthy();
  });

  it('says so when there are no steps', async () => {
    system.mockReturnValue('metric');
    await render(<StepsSection steps={[]} ingredients={[]} equipment={[]} />);
    expect(screen.getByText('No steps yet.')).toBeTruthy();
  });
});
