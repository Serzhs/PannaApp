import type { RecipeDetail } from '@panna/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { toggleExcluded, type CookRecord } from '../../store';

import { CheckView } from './CheckView';

import * as unitSystem from '@/features/units/useUnitSystem';

const base = {
  note: null,
  durationSeconds: null,
  ingredientIds: [],
  equipmentIds: [],
  imageKey: null,
};
const recipe: RecipeDetail = {
  id: '4b6c1d2e-0000-4000-8000-000000000001',
  title: 'Soup',
  description: null,
  status: 'ready',
  coverImageKey: null,
  servings: 4,
  totalTimeMinutes: null,
  createdAt: '2026-09-16T12:00:00.000Z',
  updatedAt: '2026-09-16T12:00:00.000Z',
  cookCount: 0,
  lastCookedAt: null,
  ingredients: [
    { id: 'beet', position: 0, name: 'beetroot', note: null, amount: 500, unit: 'g' },
    { id: 'dill', position: 1, name: 'dill', note: null, amount: null, unit: null },
  ],
  equipment: [{ id: 'e1', position: 0, name: 'blender', note: null, optional: false }],
  steps: [
    {
      id: 'a',
      position: 0,
      body: 'Boil',
      ...base,
      durationSeconds: 1200,
      ingredientIds: ['beet'],
      children: [],
    },
    {
      id: 'b',
      position: 1,
      body: 'Garnish',
      ...base,
      durationSeconds: 120,
      ingredientIds: ['dill'],
      children: [],
    },
  ],
};

function Harness({ onStart }: { readonly onStart: (record: CookRecord) => void }) {
  const [record, setRecord] = useState<CookRecord>({
    recipe,
    startedAt: '2026-09-22T10:00:00.000Z',
    phase: 'check',
    excluded: [],
    currentStepId: 'a',
    done: [],
    timer: null,
  });
  return (
    <CheckView
      record={record}
      onToggle={(id) => {
        setRecord(toggleExcluded(record, id));
      }}
      onStart={() => {
        onStart(record);
      }}
    />
  );
}

describe('CheckView', () => {
  beforeAll(() => {
    jest.spyOn(unitSystem, 'useUnitSystem').mockReturnValue('metric');
  });

  /** The criterion: all ticked to start, the summary follows an untick, Start carries the exclusions. */
  it('starts with everything ticked, says what unticking skips, and starts without it', async () => {
    const onStart = jest.fn();
    await render(<Harness onStart={onStart} />);
    expect(screen.getByRole('checkbox', { name: '500 g beetroot' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'dill' })).toBeChecked();
    expect(screen.getByText('blender')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Start cooking' })).toBeTruthy();
    expect(screen.queryByText(/will be skipped/)).toBeNull();

    await fireEvent.press(screen.getByRole('checkbox', { name: 'dill' }));
    expect(screen.getByRole('checkbox', { name: 'dill' })).not.toBeChecked();
    expect(screen.getByText('1 step will be skipped · about 20 min')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Start without 1 ingredient' }));
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ excluded: ['dill'] }));
  });
});
