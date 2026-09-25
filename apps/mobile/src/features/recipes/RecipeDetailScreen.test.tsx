import type { RecipeDetail } from '@panna/shared';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ActionSheetIOS, Alert, Share } from 'react-native';

import { RecipeDetailScreen } from './RecipeDetailScreen';

import * as history from '@/features/cooking/history';
import { clearCook } from '@/features/cooking/store';
import * as unitSystem from '@/features/units/useUnitSystem';
import * as online from '@/query/useIsOnline';

const mockMutate = jest.fn();
const mockShare = jest.fn();
const mockUnshare = jest.fn();
let mockDetail: RecipeDetail;

const mockPush = jest.fn();
// The header's actions are what the screen sets on it; the test renders them itself.
let mockHeaderRight: (() => React.ReactNode) | undefined;
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => true,
  }),
  Stack: {
    Screen: ({ options }: { options: { headerRight?: () => React.ReactNode } }) => {
      mockHeaderRight = options.headerRight;
      return null;
    },
  },
}));

/** Opens the three-dots sheet and presses the action with that label. */
async function chooseFromMenu(label: string): Promise<void> {
  const sheet = jest
    .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
    .mockImplementation((options, callback) => {
      const index = options.options.indexOf(label);
      if (index < 0) throw new Error(`no ${label} in ${options.options.join(', ')}`);
      callback(index);
    });
  await fireEvent.press(screen.getByRole('button', { name: 'More' }));
  sheet.mockRestore();
}
async function menuLabels(): Promise<string[]> {
  let labels: string[] = [];
  const sheet = jest
    .spyOn(ActionSheetIOS, 'showActionSheetWithOptions')
    .mockImplementation((options) => {
      labels = options.options;
    });
  await fireEvent.press(screen.getByRole('button', { name: 'More' }));
  sheet.mockRestore();
  return labels;
}
function Header(): React.JSX.Element | null {
  return <>{mockHeaderRight?.()}</>;
}
jest.mock('./queries', () => ({
  useRecipe: () => ({ data: mockDetail, isPending: false, isError: false, refetch: jest.fn() }),
  useUpdateRecipe: () => ({ mutate: mockMutate, isPending: false, isError: false, error: null }),
  useDeleteRecipe: () => ({ mockMutate: jest.fn(), isPending: false, isError: false }),
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

  /** The criterion (0029): the body has no action buttons; the menu holds Edit, Delete and, for a draft, Mark as ready. */
  it('keeps the actions in the three-dots menu, and marks a draft ready from there', async () => {
    mockDetail = recipe('draft');
    await render(
      <>
        <RecipeDetailScreen recipeId={mockDetail.id} />
        <Header />
      </>,
    );
    expect(
      screen.queryByRole('button', {
        name: /^(Edit|Delete|Share|Stop sharing|Mark as ready|Add a note)$/,
      }),
    ).toBeNull();
    expect(await menuLabels()).toEqual(['Edit', 'Mark as ready', 'Delete', 'Cancel']);
    await chooseFromMenu('Mark as ready');
    expect(mockMutate).toHaveBeenCalledWith({ status: 'ready' });
    await chooseFromMenu('Edit');
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/recipes/[id]/edit',
      params: { id: mockDetail.id },
    });
  });

  /** 0027: once ready, a recipe is only ever edited, never put back; 0029: Delete still asks. */
  it('offers a ready recipe Edit and Delete only, and Delete asks first', async () => {
    mockDetail = recipe('ready');
    await render(
      <>
        <RecipeDetailScreen recipeId={mockDetail.id} />
        <Header />
      </>,
    );
    expect(await menuLabels()).toEqual(['Edit', 'Delete', 'Cancel']);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await chooseFromMenu('Delete');
    await waitFor(() => {
      expect(alert).toHaveBeenCalledWith(
        'Delete this recipe?',
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });
    alert.mockRestore();
  });

  it('sends nothing offline and says so', async () => {
    mockDetail = recipe('draft');
    isOnline.mockReturnValue(false);
    await render(
      <>
        <RecipeDetailScreen recipeId={mockDetail.id} />
        <Header />
      </>,
    );
    await chooseFromMenu('Mark as ready');
    expect(mockMutate).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText(/You are offline/)).toBeTruthy();
    });
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

  /** 0014: the made line from the detail, a queued cook counted, nothing when never made. 0029: it opens History. */
  it('says how often and how recently it was made, counting a cook not yet sent', async () => {
    const queued = jest.spyOn(history, 'queuedCooks').mockReturnValue([]);
    mockDetail = { ...recipe('ready'), cookCount: 6, lastCookedAt: '2026-01-12T18:00:00.000Z' };
    await render(<RecipeDetailScreen recipeId={mockDetail.id} />);
    await fireEvent.press(screen.getByRole('link', { name: /^Made 6 times · last on .*2026$/ }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/recipes/[id]/history',
      params: { id: mockDetail.id },
    });
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
    expect(screen.getByRole('link', { name: 'Made once · today' })).toBeTruthy();
    await screen.unmount();

    queued.mockReturnValue([]);
    await render(<RecipeDetailScreen recipeId={mockDetail.id} />);
    expect(screen.queryByText(/^Made /)).toBeNull();
    queued.mockRestore();
  });

  /** 0015: notes with dates and step references; 0029: read here, written elsewhere. */
  it('lists the notes and offers no way to add one', async () => {
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
    expect(screen.queryByRole('button', { name: 'Add a note' })).toBeNull();
  });

  /** 0017 and 0029: the share icon opens the sheet with the link; a draft has no icon; Stop sharing is in the menu and asks. */
  it('shares from the header icon, and stops sharing from the menu after asking', async () => {
    const sheet = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    mockShare.mockImplementation(
      (_body: unknown, options: { onSuccess: (link: unknown) => void }) => {
        options.onSuccess({ token: 'abcdefghijkl', url: 'panna://shared/abcdefghijkl?api=x' });
      },
    );
    mockDetail = { ...recipe('ready'), shareToken: 'abcdefghijkl' };
    await render(
      <>
        <RecipeDetailScreen recipeId={mockDetail.id} />
        <Header />
      </>,
    );
    // Shared already, so the icon says so; pressing it shares the same link again.
    await fireEvent.press(screen.getByRole('button', { name: 'Shared by link' }));
    expect(sheet).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'panna://shared/abcdefghijkl?api=x' }),
    );
    expect(await menuLabels()).toEqual(['Edit', 'Stop sharing', 'Delete', 'Cancel']);

    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await chooseFromMenu('Stop sharing');
    await waitFor(() => {
      expect(alert).toHaveBeenCalled();
    });
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
    await render(
      <>
        <RecipeDetailScreen recipeId={mockDetail.id} />
        <Header />
      </>,
    );
    expect(screen.queryByRole('button', { name: /Share/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'More' })).toBeTruthy();
  });
});
