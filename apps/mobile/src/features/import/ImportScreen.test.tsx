import type { RecipeDetail } from '@panna/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';

import { ImportScreen } from './ImportScreen';

import * as api from '@/features/recipes/recipes.api';
import * as online from '@/query/useIsOnline';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: mockReplace,
    back: jest.fn(),
    canGoBack: () => true,
  }),
}));
const created: RecipeDetail = {
  id: '4b6c1d2e-0000-4000-8000-000000000001',
  title: 'Soup',
  description: null,
  status: 'draft',
  coverImageKey: null,
  servings: 4,
  totalTimeMinutes: null,
  createdAt: '2026-09-22T12:00:00.000Z',
  updatedAt: '2026-09-22T12:00:00.000Z',
  ingredients: [{ id: 'beet', position: 0, name: 'beetroot', note: null, amount: 500, unit: 'g' }],
  equipment: [{ id: 'pot', position: 0, name: 'pot', note: null, optional: false }],
  steps: [],
  cookCount: 0,
  lastCookedAt: null,
  notes: [],
};

const DOC = JSON.stringify({
  schemaVersion: 1,
  title: 'Soup',
  servings: 4,
  ingredients: [{ name: 'beetroot', amount: 500, unit: 'g' }],
  equipment: [{ name: 'pot' }],
  steps: [
    {
      body: 'Boil',
      minutes: 45,
      ingredients: ['Beetroot'],
      equipment: ['pot'],
      meanwhile: [{ body: 'Chop' }],
    },
  ],
});

/** A real client, so the mutation has somewhere to put the detail it gets back. */
function renderScreen() {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <ImportScreen />
    </QueryClientProvider>,
  );
}

describe('ImportScreen', () => {
  const isOnline = jest.spyOn(online, 'useIsOnline');
  const create = jest.spyOn(api, 'createRecipe');
  const update = jest.spyOn(api, 'updateRecipe');

  beforeEach(() => {
    isOnline.mockReturnValue(true);
    create.mockReset();
    update.mockReset();
    mockReplace.mockReset();
  });

  it('puts the prompt on the clipboard and says so', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Copy prompt' }));
    await waitFor(() => {
      expect(screen.getByText('Copied. Paste it into your AI, with the recipe.')).toBeTruthy();
    });
    expect(jest.mocked(Clipboard.setStringAsync).mock.calls.at(-1)?.[0]).toContain(
      '"schemaVersion": 1',
    );
  });

  /** The criterion: create with the lists, then the steps with links mapped to the created ids. */
  it('creates the recipe, writes the steps with mapped links, and offers to open it', async () => {
    create.mockResolvedValue(created);
    update.mockResolvedValue(created);
    await renderScreen();
    await fireEvent.changeText(
      screen.getByLabelText('Paste the answer here'),
      `Sure!\n\`\`\`json\n${DOC}\n\`\`\``,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Import' }));
    await waitFor(() => {
      expect(screen.getByRole('header', { name: 'Imported as a draft' })).toBeTruthy();
    });
    expect(create).toHaveBeenCalledWith({
      title: 'Soup',
      servings: 4,
      ingredients: [{ name: 'beetroot', note: null, amount: 500, unit: 'g' }],
      equipment: [{ name: 'pot', note: null, optional: false }],
    });
    expect(update).toHaveBeenCalledWith(created.id, {
      steps: [
        {
          body: 'Boil',
          note: null,
          durationSeconds: 2700,
          ingredientIds: ['beet'],
          equipmentIds: ['pot'],
          children: [
            {
              body: 'Chop',
              note: null,
              durationSeconds: null,
              ingredientIds: [],
              equipmentIds: [],
            },
          ],
        },
      ],
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Check it' }));
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/recipes/[id]/edit',
      params: { id: created.id },
    });
  });

  it('refuses text with nothing to read, in words, and keeps the text offline', async () => {
    await renderScreen();
    await fireEvent.changeText(screen.getByLabelText('Paste the answer here'), 'no recipe here');
    await fireEvent.press(screen.getByRole('button', { name: 'Import' }));
    expect(screen.getByLabelText(/^Paste the answer here, No recipe found/)).toBeTruthy();
    expect(create).not.toHaveBeenCalled();

    isOnline.mockReturnValue(false);
    await fireEvent.changeText(screen.getByLabelText(/^Paste the answer here/), DOC);
    await fireEvent.press(screen.getByRole('button', { name: 'Import' }));
    expect(screen.getByText(/You are offline/)).toBeTruthy();
    expect(screen.getByLabelText(/^Paste the answer here/)).toHaveProp('value', DOC);
  });
});
