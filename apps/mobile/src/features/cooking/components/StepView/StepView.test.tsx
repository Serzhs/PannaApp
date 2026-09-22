import type { RecipeDetail } from '@panna/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { StepView } from './StepView';

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
  notes: [],
  ingredients: [{ id: 'i1', position: 0, name: 'beetroot', note: null, amount: 500, unit: 'g' }],
  equipment: [{ id: 'e1', position: 0, name: 'blender', note: null, optional: false }],
  steps: [
    {
      id: 'b',
      position: 0,
      body: 'Roast the beetroot',
      ...base,
      durationSeconds: 3600,
      ingredientIds: ['i1'],
      equipmentIds: ['e1'],
      imageKey: 'a'.repeat(32),
      children: [{ id: 'b1', position: 0, body: 'Chop the dill', ...base }],
    },
  ],
};

function must<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('missing fixture');
  return value;
}

describe('StepView', () => {
  beforeAll(() => {
    jest.spyOn(unitSystem, 'useUnitSystem').mockReturnValue('metric');
  });

  /** The criterion: the step as one tappable element, its links, its meanwhile rows, the photo button. */
  it('reads the step as one Done target with its links and meanwhile rows', async () => {
    const onDone = jest.fn();
    const onToggle = jest.fn();
    await render(
      <StepView
        recipe={recipe}
        step={must(recipe.steps[0])}
        number={2}
        total={5}
        done={[]}
        onDone={onDone}
        onToggleMeanwhile={onToggle}
        onShowPhoto={jest.fn()}
      />,
    );
    const card = screen.getByRole('button', { name: 'Step 2 of 5. Roast the beetroot' });
    expect(card).toHaveProp('accessibilityHint', 'Tap to mark this step done');
    expect(screen.getByText('Uses 500 g beetroot')).toBeTruthy();
    expect(screen.getByText('Needs blender')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'How it should look' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'a. Chop the dill' }));
    expect(onToggle).toHaveBeenCalledWith('b1');
    await fireEvent.press(card);
    expect(onDone).toHaveBeenCalled();
  });

  /** 0013: an excluded ingredient is still named, marked as gone without. */
  it('marks an excluded ingredient in the uses line instead of dropping it', async () => {
    await render(
      <StepView
        recipe={recipe}
        step={must(recipe.steps[0])}
        number={1}
        total={1}
        done={[]}
        excluded={['i1']}
        onDone={jest.fn()}
        onToggleMeanwhile={jest.fn()}
        onShowPhoto={jest.fn()}
      />,
    );
    expect(screen.getByText('Uses beetroot (going without)')).toBeTruthy();
  });

  /** 0015: the cook's notes on this step, under the author's, and a way to add one. */
  it('shows the notes on this step and adds one', async () => {
    const onAddNote = jest.fn(() => Promise.resolve());
    await render(
      <StepView
        recipe={recipe}
        step={must(recipe.steps[0])}
        number={1}
        total={1}
        done={[]}
        onDone={jest.fn()}
        onToggleMeanwhile={jest.fn()}
        onShowPhoto={jest.fn()}
        notes={[
          {
            id: 'n1',
            stepId: 'b',
            cookId: null,
            body: 'Turn it twice',
            createdAt: '2026-09-14T16:00:00.000Z',
          },
        ]}
        onAddNote={onAddNote}
      />,
    );
    expect(screen.getByText('Turn it twice')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Add a note' }));
    await fireEvent.changeText(screen.getByLabelText('Note'), 'And a third time');
    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(onAddNote).toHaveBeenCalledWith('And a third time');
    });
  });
});
