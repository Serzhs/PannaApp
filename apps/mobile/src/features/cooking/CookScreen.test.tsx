import type { RecipeDetail } from '@panna/shared';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as KeepAwake from 'expo-keep-awake';
import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';

import { CookScreen } from './CookScreen';
import { knuckleHintSeen, markKnuckleHintSeen, resetKnuckleHint } from './hint';
import { queuedCooks } from './history';
import {
  beginCooking,
  clearCook,
  loadCook,
  saveCook,
  setTimer,
  startCook,
  toggleExcluded,
} from './store';

import * as unitSystem from '@/features/units/useUnitSystem';

const mockReplace = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: mockReplace,
    back: mockBack,
    canGoBack: () => true,
  }),
}));
const mockAddNote = jest.fn();
jest.mock('@/features/recipes/queries', () => ({
  recipeKeys: { detail: (id: string) => ['recipes', 'detail', id] },
  useAddNote: () => ({ mutateAsync: mockAddNote, isPending: false }),
}));

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
  notes: [],
  shareToken: null,
  sourceRecipeId: null,
  ingredients: [{ id: 'dill', position: 0, name: 'dill', note: null, amount: null, unit: null }],
  equipment: [],
  steps: [
    { id: 'a', position: 0, body: 'Boil', ...base, durationSeconds: 1200, children: [] },
    { id: 'b', position: 1, body: 'Roast', ...base, durationSeconds: 600, children: [] },
    { id: 'c', position: 2, body: 'Garnish', ...base, ingredientIds: ['dill'], children: [] },
  ],
};

/** Past the check and straight onto the guide, as every 0012 test expects. */
function cookingNow(): void {
  const started = must(startCook(recipe));
  saveCook(must(beginCooking(started)));
}

function must<T>(value: T | null): T {
  if (value === null) throw new Error('expected a record');
  return value;
}

describe('CookScreen', () => {
  beforeAll(() => {
    jest.spyOn(unitSystem, 'useUnitSystem').mockReturnValue('metric');
  });
  beforeEach(() => {
    // The hint (0028) has its own test; every other one starts past it.
    markKnuckleHintSeen();
    mockReplace.mockReset();
    mockBack.mockReset();
    jest.mocked(Notifications.scheduleNotificationAsync).mockClear();
    jest.mocked(Notifications.cancelScheduledNotificationAsync).mockClear();
    jest.mocked(KeepAwake.activateKeepAwakeAsync).mockClear();
    jest.mocked(KeepAwake.deactivateKeepAwake).mockClear();
    cookingNow();
  });
  afterEach(() => {
    clearCook(recipe.id);
  });

  /** The criteria: a timer schedules the step's end and records its id; Stop cancels it. */
  it('starts a timer that schedules a notification, and stops it', async () => {
    await render(<CookScreen recipeId={recipe.id} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Start timer, 20 min' }));
    await waitFor(() => {
      expect(loadCook(recipe.id)?.timer?.notificationId).toBe('notification-1');
    });
    const request = jest.mocked(Notifications.scheduleNotificationAsync).mock.calls.at(-1)?.[0];
    expect(request?.content).toEqual({ title: 'Step 1 is done', body: 'Boil' });
    expect(request?.trigger).toEqual({ type: 'timeInterval', seconds: 1200 });
    await fireEvent.press(screen.getByRole('button', { name: 'Stop timer' }));
    await waitFor(() => {
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notification-1');
    });
    expect(loadCook(recipe.id)?.timer).toBeNull();
  });

  it("asks before replacing another step's timer, and replaces it on yes", async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    saveCook(
      setTimer(must(loadCook(recipe.id)), {
        stepId: 'b',
        endsAt: Date.now() + 500_000,
        notificationId: 'old',
      }),
    );
    await render(<CookScreen recipeId={recipe.id} />);
    expect(screen.getByText(/Timer running for step 2/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Start this timer instead' }));
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    const buttons = alert.mock.calls.at(-1)?.[2];
    const yes = buttons?.find((b) => b.text === 'Replace it');
    await act(async () => {
      yes?.onPress?.();
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('old');
      expect(loadCook(recipe.id)?.timer?.stepId).toBe('a');
    });
    alert.mockRestore();
  });

  it('moves on with Done, finishes on the last step, and keeps the screen awake meanwhile', async () => {
    const view = await render(<CookScreen recipeId={recipe.id} />);
    expect(KeepAwake.activateKeepAwakeAsync).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(loadCook(recipe.id)?.currentStepId).toBe('b');
    expect(screen.getByText('Step 2 of 3')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Finish' }));
    // 0015: Finish asks for a note first; with one, it rides in the queued cook.
    await fireEvent.changeText(screen.getByLabelText('Note'), 'Less salt');
    await fireEvent.press(screen.getByRole('button', { name: 'Save and finish' }));
    expect(queuedCooks(recipe.id).at(-1)?.note).toBe('Less salt');
    expect(loadCook(recipe.id)).toBeNull();
    // 0018: cook mode sits above the tabs, so leaving pops back to the recipe beneath.
    expect(mockBack).toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    await view.unmount();
    expect(KeepAwake.deactivateKeepAwake).toHaveBeenCalled();
  });

  /** 0013: Cook lands on the check; going without dill skips the garnish and says so. */
  it('opens on the check, and shows what is left out once cooking', async () => {
    clearCook(recipe.id);
    startCook(recipe);
    await render(<CookScreen recipeId={recipe.id} />);
    expect(screen.getByRole('header', { name: 'What you have' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'dill' }));
    expect(screen.getByText(/1 step will be skipped/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Start without 1 ingredient' }));
    expect(screen.getByText('Without: dill')).toBeTruthy();
    expect(screen.getByText('Step 1 of 2')).toBeTruthy();
    expect(loadCook(recipe.id)).toEqual(
      expect.objectContaining({ phase: 'cooking', excluded: ['dill'] }),
    );
  });

  it('keeps a record from before the check on the guide', async () => {
    saveCook(must(beginCooking(toggleExcluded(must(startCook(recipe)), 'dill'))));
    await render(<CookScreen recipeId={recipe.id} />);
    expect(screen.queryByRole('header', { name: 'What you have' })).toBeNull();
    expect(screen.getByText('Step 1 of 2')).toBeTruthy();
  });

  /** 0028: the hint once, gone on Got it, and not again; leaving without reading keeps it. */
  it('shows the knuckle hint the first time, and never after Got it', async () => {
    resetKnuckleHint();
    startCook(recipe);
    let view = await render(<CookScreen recipeId={recipe.id} />);
    expect(screen.getByRole('header', { name: 'Tap with a knuckle' })).toBeTruthy();
    expect(screen.queryByRole('header', { name: 'What you have' })).toBeNull();
    await view.unmount();
    expect(knuckleHintSeen()).toBe(false);

    view = await render(<CookScreen recipeId={recipe.id} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Got it' }));
    expect(knuckleHintSeen()).toBe(true);
    expect(screen.getByRole('header', { name: 'What you have' })).toBeTruthy();
    await view.unmount();

    await render(<CookScreen recipeId={recipe.id} />);
    expect(screen.queryByRole('header', { name: 'Tap with a knuckle' })).toBeNull();
    expect(screen.getByRole('header', { name: 'What you have' })).toBeTruthy();
    clearCook(recipe.id);
  });
});
