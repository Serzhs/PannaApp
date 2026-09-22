import type { RecipeDetail } from '@panna/shared';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as KeepAwake from 'expo-keep-awake';
import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';

import { CookScreen } from './CookScreen';
import { clearCook, loadCook, saveCook, setTimer, startCook } from './store';

import * as unitSystem from '@/features/units/useUnitSystem';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: mockReplace,
    back: jest.fn(),
    canGoBack: () => true,
  }),
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
  ingredients: [],
  equipment: [],
  steps: [
    { id: 'a', position: 0, body: 'Boil', ...base, durationSeconds: 1200, children: [] },
    { id: 'b', position: 1, body: 'Roast', ...base, durationSeconds: 600, children: [] },
  ],
};

function must<T>(value: T | null): T {
  if (value === null) throw new Error('expected a record');
  return value;
}

describe('CookScreen', () => {
  beforeAll(() => {
    jest.spyOn(unitSystem, 'useUnitSystem').mockReturnValue('metric');
  });
  beforeEach(() => {
    mockReplace.mockReset();
    jest.mocked(Notifications.scheduleNotificationAsync).mockClear();
    jest.mocked(Notifications.cancelScheduledNotificationAsync).mockClear();
    jest.mocked(KeepAwake.activateKeepAwakeAsync).mockClear();
    jest.mocked(KeepAwake.deactivateKeepAwake).mockClear();
    startCook(recipe);
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
    expect(screen.getByText('Step 2 of 2')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Finish' }));
    expect(loadCook(recipe.id)).toBeNull();
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/recipes/[id]',
      params: { id: recipe.id },
    });
    await view.unmount();
    expect(KeepAwake.deactivateKeepAwake).toHaveBeenCalled();
  });
});
