import type { Equipment, Ingredient } from '@panna/shared';
import { render, screen } from '@testing-library/react-native';

import { NeedsSection } from './NeedsSection';

import * as unitSystem from '@/features/units/useUnitSystem';

const ingredient = (over: Partial<Ingredient>): Ingredient => ({
  id: 'i',
  position: 0,
  name: 'Beetroot',
  note: null,
  amount: null,
  unit: null,
  ...over,
});

const equipment = (over: Partial<Equipment>): Equipment => ({
  id: 'e',
  position: 0,
  name: 'Grater',
  note: null,
  optional: false,
  ...over,
});

describe('NeedsSection', () => {
  const system = jest.spyOn(unitSystem, 'useUnitSystem');

  afterEach(() => {
    system.mockReset();
  });

  /** The criterion: 250 ml reads as about 1 cup for an imperial reader, 250 ml for a metric one. */
  it("shows amounts in the reader's unit system, marked approximate when converted", async () => {
    system.mockReturnValue('imperial');
    const view = await render(
      <NeedsSection
        ingredients={[ingredient({ id: 'k', name: 'Kefir', amount: 250, unit: 'ml' })]}
        equipment={[]}
      />,
    );
    expect(screen.getByText('about 1 cup Kefir')).toBeTruthy();

    system.mockReturnValue('metric');
    await view.rerender(
      <NeedsSection
        ingredients={[ingredient({ id: 'k', name: 'Kefir', amount: 250, unit: 'ml' })]}
        equipment={[]}
      />,
    );
    expect(screen.getByText('250 ml Kefir')).toBeTruthy();
  });

  it('shows a bare count and an unmeasured ingredient plainly', async () => {
    system.mockReturnValue('metric');
    await render(
      <NeedsSection
        ingredients={[
          ingredient({ id: 'a', name: 'eggs', amount: 2 }),
          ingredient({ id: 'b', name: 'salt' }),
        ]}
        equipment={[]}
      />,
    );
    expect(screen.getByText('2 eggs')).toBeTruthy();
    expect(screen.getByText('salt')).toBeTruthy();
  });

  /** The criterion: one element per line, carrying amount, unit, name and note. */
  it('reads each ingredient as one element with everything in its name', async () => {
    system.mockReturnValue('metric');
    await render(
      <NeedsSection
        ingredients={[
          ingredient({ id: 'c', name: 'carrots', amount: 500, unit: 'g', note: 'not too long' }),
        ]}
        equipment={[]}
      />,
    );
    expect(screen.getByLabelText('500 g carrots, not too long')).toBeTruthy();
    expect(screen.getByText('not too long')).toBeTruthy();
  });

  it('says optional in words and names empty lists', async () => {
    system.mockReturnValue('metric');
    await render(<NeedsSection ingredients={[]} equipment={[equipment({ optional: true })]} />);
    expect(screen.getByText('Grater (optional)')).toBeTruthy();
    expect(screen.getByLabelText('Grater, optional')).toBeTruthy();
    expect(screen.getByText('No ingredients yet.')).toBeTruthy();
  });
});
