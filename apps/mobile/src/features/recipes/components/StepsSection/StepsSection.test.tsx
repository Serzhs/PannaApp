import type { Step } from '@panna/shared';
import { render, screen } from '@testing-library/react-native';

import { StepsSection } from './StepsSection';

import * as unitSystem from '@/features/units/useUnitSystem';

const step = (over: Partial<Step> & { id: string }): Step => ({
  position: 0,
  body: 'Do something',
  note: null,
  durationSeconds: null,
  ingredientIds: [],
  equipmentIds: [],
  children: [],
  ...over,
});

describe('StepsSection', () => {
  const system = jest.spyOn(unitSystem, 'useUnitSystem');

  /** The criteria: numbered from 1, nested marked as meanwhile with 2a numbers, 180 as 356°F. */
  it('numbers main steps and marks nested ones as meanwhile', async () => {
    system.mockReturnValue('imperial');
    await render(
      <StepsSection
        ingredients={[]}
        equipment={[]}
        steps={[
          step({ id: 'a', body: 'Heat the oven', durationSeconds: 600 }),
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
    expect(screen.getByText('10 min')).toBeTruthy();
    expect(screen.getByText('Meanwhile')).toBeTruthy();
    expect(screen.getByText('Step 2a, during step 2')).toBeTruthy();
    expect(screen.getByText('Step 2b, during step 2')).toBeTruthy();
  });

  it('reads each step as one element with its number, body, and note', async () => {
    system.mockReturnValue('metric');
    await render(
      <StepsSection
        ingredients={[]}
        equipment={[]}
        steps={[step({ id: 'a', body: 'Heat the oven', note: 'Fan off' })]}
      />,
    );
    expect(screen.getByLabelText('Step 1. Heat the oven. Fan off')).toBeTruthy();
  });

  it('shows what a step uses and needs, in the step itself, per 0010', async () => {
    system.mockReturnValue('metric');
    await render(
      <StepsSection
        ingredients={[
          { id: 'i1', position: 0, name: 'beetroot', note: null, amount: 500, unit: 'g' },
          { id: 'i2', position: 1, name: 'dill', note: null, amount: null, unit: null },
        ]}
        equipment={[{ id: 'e1', position: 0, name: 'blender', note: null, optional: false }]}
        steps={[
          step({
            id: 'a',
            body: 'Blend',
            ingredientIds: ['i1', 'i2'],
            equipmentIds: ['e1'],
            children: [step({ id: 'b', body: 'Chop', ingredientIds: ['i2'] })],
          }),
        ]}
      />,
    );
    expect(screen.getByText('Uses 500 g beetroot, dill')).toBeTruthy();
    expect(screen.getByText('Needs blender')).toBeTruthy();
    expect(
      screen.getByLabelText('Step 1. Blend. Uses 500 g beetroot, dill. Needs blender'),
    ).toBeTruthy();
    expect(screen.getByLabelText('Step 1a, during step 1. Chop. Uses dill')).toBeTruthy();
  });

  it('says so when there are no steps', async () => {
    system.mockReturnValue('metric');
    await render(<StepsSection steps={[]} ingredients={[]} equipment={[]} />);
    expect(screen.getByText('No steps yet.')).toBeTruthy();
  });
});
