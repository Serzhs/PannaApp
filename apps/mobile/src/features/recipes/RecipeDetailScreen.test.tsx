import type { RecipeDetail } from '@panna/shared';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert, Share } from 'react-native';

import { RecipeDetailScreen } from './RecipeDetailScreen';

import * as history from '@/features/cooking/history';
import { clearCook } from '@/features/cooking/store';
import * as unitSystem from '@/features/units/useUnitSystem';
import * as online from '@/query/useIsOnline';

const mockMutate = jest.fn();
const mockAddNote = jest.fn();
const mockShare = jest.fn();
const mockUnshare = jest.fn();
let mockDetail: RecipeDetail;

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => true,
  }),
}));
jest.mock('./queries', () => ({
  useRecipe: () => ({ data: mockDetail, isPending: false, isError: false, refetch: jest.fn() }),
  useUpdateRecipe: () => ({ mutate: mockMutate, isPending: false, isError: false, error: null }),
  useDeleteRecipe: () => ({ mockMutate: jest.fn(), isPending: false, isError: false }),
  useAddNote: () => ({ mutateAsync: mockAddNote, isPending: false }),
  useShareRecipe: () => ({ mutate: mockShare, isPending: false }),
  useUnshareRecipe: () => ({ mutate: mockUnshare, isPending: false }),
}));

const recipe = (status: RecipeDetail['status']): RecipeDetail => ({
  id: '4b6c1d2e-0000-4000-8000-000000000001',
  title: 'Cold beetroot soup',
  description: null,
  status,
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
  ingredients: [],
  equipment: [],
  steps: [],
});

describe('RecipeDetailScreen status control', () => {
  const isOnline = jest.spyOn(online, 'useIsOnline');

  beforeAll(() => {
    jest.spyOn(unitSystem, 'useUnitSystem').mockReturnValue('metric');
  });

  beforeEach(() => {
    mockMutate.mockReset();
    isOnline.mockReturnValue(true);
  });

  /** The criterion: mark ready sends `ready`, and the reverse sends `draft`. */
  it('offers to mark a draft ready, and sends the status', async () => {
    mockDetail = recipe('draft');
    await render(<RecipeDetailScreen recipeId={mockDetail.id} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Mark as ready' }));
    expect(mockMutate).toHaveBeenCalledWith({ status: 'ready' });
  });

  /** 0027: once ready, a recipe is only ever edited, never put back. */
  it('offers nothing to a ready recipe in place of the status button', async () => {
    mockDetail = recipe('ready');
    await render(<RecipeDetailScreen recipeId={mockDetail.id} />);
    expect(screen.queryByRole('button', { name: /Mark as ready|Back to draft/ })).toBeNull();
  });

  it('sends nothing offline and says so', async () => {
    mockDetail = recipe('draft');
    isOnline.mockReturnValue(false);
    await render(<RecipeDetailScreen recipeId={mockDetail.id} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Mark as ready' }));
    expect(mockMutate).not.toHaveBeenCalled();
    expect(screen.getByText(/You are offline/)).toBeTruthy();
  });

  /** 0012: Cook for a recipe with steps, Continue when a cook is in progress, nothing without steps. */
  it('offers to cook, or to continue, only when there are steps', async () => {
    const base = {
      note: null,
      durationSeconds: null,
      ingredientIds: [],
      equipmentIds: [],
      imageKey: null,
    };
    const withSteps: RecipeDetail = {
      ...recipe('ready'),
      steps: [{ id: 'a', position: 0, body: 'Boil', ...base, children: [] }],
    };
    mockDetail = withSteps;
    await render(<RecipeDetailScreen recipeId={mockDetail.id} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Cook' }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/recipes/[id]/cook',
      params: { id: mockDetail.id },
    });
    await screen.unmount();

    mockDetail = withSteps;
    await render(<RecipeDetailScreen recipeId={mockDetail.id} />);
    expect(screen.getByRole('button', { name: 'Continue cooking' })).toBeTruthy();
    clearCook(mockDetail.id);
    await screen.unmount();

    mockDetail = { ...recipe('ready'), steps: [] };
    await render(<RecipeDetailScreen recipeId={mockDetail.id} />);
    expect(screen.queryByRole('button', { name: /Cook|Continue cooking/ })).toBeNull();
  });

  /** 0014: the made line from the detail, a queued cook counted, nothing when never made. */
  it('says how often and how recently it was made, counting a cook not yet sent', async () => {
    const queued = jest.spyOn(history, 'queuedCooks').mockReturnValue([]);
    mockDetail = { ...recipe('ready'), cookCount: 6, lastCookedAt: '2026-01-12T18:00:00.000Z' };
    await render(<RecipeDetailScreen recipeId={mockDetail.id} />);
    expect(screen.getByText(/^Made 6 times · last on .*2026$/)).toBeTruthy();
    await screen.unmount();

    queued.mockReturnValue([
      {
        id: 'q',
        recipeId: mockDetail.id,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        excluded: [],
      },
    ]);
    mockDetail = recipe('ready');
    await render(<RecipeDetailScreen recipeId={mockDetail.id} />);
    expect(screen.getByText('Made once · today')).toBeTruthy();
    await screen.unmount();

    queued.mockReturnValue([]);
    await render(<RecipeDetailScreen recipeId={mockDetail.id} />);
    expect(screen.queryByText(/^Made /)).toBeNull();
    queued.mockRestore();
  });

  /** 0015: notes with dates and step references, and one added on Save. */
  it('lists the notes and adds one', async () => {
    mockAddNote.mockResolvedValue(undefined);
    mockDetail = {
      ...recipe('ready'),
      steps: [
        {
          id: 's1',
          position: 0,
          body: 'Boil',
          note: null,
          durationSeconds: null,
          ingredientIds: [],
          equipmentIds: [],
          imageKey: null,
          children: [],
        },
      ],
      notes: [
        {
          id: 'n1',
          stepId: 's1',
          cookId: null,
          body: 'Small ones take 35 min',
          createdAt: '2026-09-14T16:00:00.000Z',
        },
      ],
    };
    await render(<RecipeDetailScreen recipeId={mockDetail.id} />);
    expect(screen.getByRole('header', { name: 'Your notes' })).toBeTruthy();
    expect(screen.getByText(/On step 1/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Add a note' }));
    await fireEvent.changeText(screen.getByLabelText('Note'), 'Lemon at the end');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(mockAddNote).toHaveBeenCalledWith({ body: 'Lemon at the end' });
    });
  });

  /** 0017: Share on a ready recipe opens the sheet with the link; nothing on a draft; Stop sharing asks. */
  it('shares a ready recipe through the platform sheet, and stops sharing after asking', async () => {
    const sheet = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    mockShare.mockImplementation(
      (_body: unknown, options: { onSuccess: (link: unknown) => void }) => {
        options.onSuccess({ token: 'abcdefghijkl', url: 'panna://shared/abcdefghijkl?api=x' });
      },
    );
    mockDetail = { ...recipe('ready'), shareToken: 'abcdefghijkl' };
    await render(<RecipeDetailScreen recipeId={mockDetail.id} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Share' }));
    expect(sheet).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'panna://shared/abcdefghijkl?api=x' }),
    );
    expect(screen.getByText('Shared by link')).toBeTruthy();

    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await fireEvent.press(screen.getByRole('button', { name: 'Stop sharing' }));
    expect(mockUnshare).not.toHaveBeenCalled();
    const buttons = alert.mock.calls.at(-1)?.[2];
    await act(() => {
      buttons?.find((b) => b.text === 'Stop sharing')?.onPress?.();
    });
    expect(mockUnshare).toHaveBeenCalled();
    alert.mockRestore();
    sheet.mockRestore();
    await screen.unmount();

    mockDetail = recipe('draft');
    await render(<RecipeDetailScreen recipeId={mockDetail.id} />);
    expect(screen.queryByRole('button', { name: 'Share' })).toBeNull();
  });
});
