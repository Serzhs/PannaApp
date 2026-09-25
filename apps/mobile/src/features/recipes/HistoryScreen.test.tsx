import type { Cook, RecipeDetail } from '@panna/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { HistoryScreen } from './HistoryScreen';

import * as history from '@/features/cooking/history';
import * as online from '@/query/useIsOnline';

const mockAddNote = jest.fn();
let mockDetail: RecipeDetail;
let mockCooks: Cook[];
jest.mock('./queries', () => ({
  useRecipe: () => ({ data: mockDetail, isPending: false, isError: false, refetch: jest.fn() }),
  useCookHistory: () => ({ data: mockCooks, isPending: false, isError: false, refetch: jest.fn() }),
  useAddNote: () => ({ mutateAsync: mockAddNote, isPending: false }),
}));

const RECIPE = '4b6c1d2e-0000-4000-8000-000000000001';
const FIRST = '9c6f1d2e-0000-4000-8000-000000000011';
const SECOND = '9c6f1d2e-0000-4000-8000-000000000012';
const base = {
  note: null,
  durationSeconds: null,
  ingredientIds: [],
  equipmentIds: [],
  imageKey: null,
};

describe('HistoryScreen', () => {
  beforeAll(() => {
    jest.spyOn(online, 'useIsOnline').mockReturnValue(true);
  });
  beforeEach(() => {
    mockAddNote.mockReset();
    mockDetail = {
      id: RECIPE,
      title: 'Cold beetroot soup',
      description: null,
      status: 'ready',
      coverImageKey: null,
      servings: 4,
      totalTimeMinutes: null,
      createdAt: '2026-09-16T12:00:00.000Z',
      updatedAt: '2026-09-16T12:00:00.000Z',
      cookCount: 2,
      lastCookedAt: '2026-09-14T16:40:00.000Z',
      shareToken: null,
      sourceRecipeId: null,
      ingredients: [],
      equipment: [],
      steps: [{ id: 's1', position: 0, body: 'Boil', ...base, children: [] }],
      notes: [
        {
          id: 'n1',
          stepId: null,
          cookId: SECOND,
          body: 'Less salt next time',
          createdAt: '2026-09-14T17:00:00.000Z',
        },
        {
          id: 'n2',
          stepId: 's1',
          cookId: null,
          body: 'Small ones take 35 min',
          createdAt: '2026-09-10T17:00:00.000Z',
        },
      ],
    };
    mockCooks = [
      {
        id: SECOND,
        recipeId: RECIPE,
        startedAt: '2026-09-14T15:30:00.000Z',
        finishedAt: '2026-09-14T16:40:00.000Z',
        excluded: ['spring onions'],
      },
      {
        id: FIRST,
        recipeId: RECIPE,
        startedAt: '2026-08-30T16:00:00.000Z',
        finishedAt: '2026-08-30T17:10:00.000Z',
        excluded: [],
      },
    ];
  });

  /** The criterion: cooks newest first with their notes, a pending one without Add a note, other notes last, and a note added to a cook. */
  it('lists the cooks with their notes, and adds a note to one of them', async () => {
    const queued = jest.spyOn(history, 'queuedCooks').mockReturnValue([
      {
        id: 'q',
        recipeId: RECIPE,
        startedAt: '2026-09-20T10:00:00.000Z',
        finishedAt: '2026-09-20T10:30:00.000Z',
        excluded: [],
      },
    ]);
    mockAddNote.mockResolvedValue(undefined);
    await render(<HistoryScreen recipeId={RECIPE} />);
    const headers = screen.getAllByRole('header').map((h) => h.props.children as string);
    expect(headers[0]).toMatch(/2026/);
    expect(headers.at(-1)).toBe('Other notes');
    expect(screen.getByText(/Not sent yet/)).toBeTruthy();
    expect(screen.getByText('Without spring onions')).toBeTruthy();
    expect(screen.getByText('Less salt next time')).toBeTruthy();
    expect(screen.getByText(/On step 1/)).toBeTruthy();
    // Two sent cooks get a composer; the pending one does not.
    expect(screen.getAllByRole('button', { name: 'Add a note' })).toHaveLength(2);
    const [first] = screen.getAllByRole('button', { name: 'Add a note' });
    if (first === undefined) throw new Error('no composer');
    await fireEvent.press(first);
    await fireEvent.changeText(screen.getByLabelText('Note'), 'Lemon at the end');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(mockAddNote).toHaveBeenCalledWith({ body: 'Lemon at the end', cookId: SECOND });
    });
    queued.mockRestore();
  });

  it('says nothing here yet when the recipe was never made and has no notes', async () => {
    mockCooks = [];
    mockDetail = { ...mockDetail, notes: [] };
    await render(<HistoryScreen recipeId={RECIPE} />);
    expect(screen.getByText('Nothing here yet')).toBeTruthy();
  });
});
