import type { RecipeDetail } from '@panna/shared';
import { ApiError } from '@panna/shared';
import { onlineManager } from '@tanstack/react-query';

import { flushCookQueue, queueFinishedCook, queuedCooks } from './history';
import type { CookRecord } from './store';

import * as session from '@/api/session';

jest.mock('expo-crypto', () => ({ randomUUID: () => '9c6f1d2e-0000-4000-8000-000000000009' }));

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
  ingredients: [
    { id: 'beet', position: 0, name: 'beetroot', note: null, amount: 500, unit: 'g' },
    { id: 'dill', position: 1, name: 'dill', note: null, amount: null, unit: null },
  ],
  equipment: [],
  steps: [{ id: 'a', position: 0, body: 'Boil', ...base, children: [] }],
  cookCount: 0,
  lastCookedAt: null,
  notes: [],
  shareToken: null,
  sourceRecipeId: null,
};
const record: CookRecord = {
  recipe,
  startedAt: '2026-09-22T10:00:00.000Z',
  phase: 'cooking',
  excluded: ['dill'],
  currentStepId: 'a',
  done: [],
  timer: null,
};

describe('the cook queue', () => {
  const call = jest.spyOn(session, 'authorizedCall');

  beforeEach(() => {
    call.mockReset();
    onlineManager.setOnline(true);
  });
  afterEach(async () => {
    call.mockResolvedValue(undefined);
    await flushCookQueue();
  });

  /** The criterion: finishing queues names, not ids; online it is sent at once and the queue empties. */
  it('queues a finished cook with the names it went without and sends it when online', async () => {
    call.mockResolvedValue(undefined);
    const cook = queueFinishedCook(record, 'Less salt', Date.parse('2026-09-22T10:45:00.000Z'));
    expect(cook.excluded).toEqual(['dill']);
    await flushCookQueue();
    expect(call).toHaveBeenCalledWith('recordCook', {
      params: { recipeId: recipe.id },
      body: {
        id: '9c6f1d2e-0000-4000-8000-000000000009',
        startedAt: '2026-09-22T10:00:00.000Z',
        finishedAt: '2026-09-22T10:45:00.000Z',
        excluded: ['dill'],
        note: 'Less salt',
      },
    });
    expect(queuedCooks()).toEqual([]);
  });

  /** The criterion: offline the record stays; a failed send stays too; the connection returning sends it. */
  it('keeps the record while offline or after a failed send, and sends it later', async () => {
    onlineManager.setOnline(false);
    queueFinishedCook(record);
    await flushCookQueue();
    expect(call).not.toHaveBeenCalled();
    expect(queuedCooks(recipe.id)).toHaveLength(1);

    onlineManager.setOnline(true);
    call.mockRejectedValueOnce(new TypeError('Network request failed'));
    await flushCookQueue();
    expect(queuedCooks(recipe.id)).toHaveLength(1);

    call.mockResolvedValue(undefined);
    await flushCookQueue();
    expect(queuedCooks(recipe.id)).toEqual([]);
  });

  /** A recipe deleted before the queue drained: the row can never land, so it is dropped, not retried forever. */
  it('drops a cook the server will never accept', async () => {
    queueFinishedCook(record);
    call.mockRejectedValueOnce(
      new ApiError(
        {
          statusCode: 404,
          error: 'Not Found',
          message: 'No such recipe',
          code: 'RECIPE_NOT_FOUND',
        },
        404,
      ),
    );
    await flushCookQueue();
    expect(queuedCooks()).toEqual([]);
  });
});
