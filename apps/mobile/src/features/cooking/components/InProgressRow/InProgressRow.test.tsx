import type { RecipeDetail } from '@panna/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { CookRecord } from '../../store';

import { InProgressRow } from './InProgressRow';

const base = {
  note: null,
  durationSeconds: null,
  ingredientIds: [],
  equipmentIds: [],
  imageKey: null,
};
const recipe: RecipeDetail = {
  id: '4b6c1d2e-0000-4000-8000-000000000001',
  title: 'Cold beetroot soup',
  description: null,
  status: 'ready',
  coverImageKey: null,
  servings: 4,
  totalTimeMinutes: null,
  createdAt: '2026-09-16T12:00:00.000Z',
  updatedAt: '2026-09-16T12:00:00.000Z',
  cookCount: 0,
  lastCookedAt: null,
  ingredients: [],
  equipment: [],
  steps: [
    { id: 'a', position: 0, body: 'Boil', ...base, children: [] },
    { id: 'b', position: 1, body: 'Roast', ...base, children: [] },
    { id: 'c', position: 2, body: 'Blend', ...base, children: [] },
  ],
};
const record: CookRecord = {
  recipe,
  startedAt: '2026-09-22T10:00:00.000Z',
  phase: 'cooking',
  excluded: [],
  currentStepId: 'b',
  done: ['a'],
  timer: null,
};

describe('InProgressRow', () => {
  it('names the recipe and how far it has got', async () => {
    const onPress = jest.fn();
    await render(<InProgressRow record={record} onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Cold beetroot soup, Step 2 of 3' }));
    expect(onPress).toHaveBeenCalledWith(record);
  });
});
