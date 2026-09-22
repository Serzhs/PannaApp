import { render, screen } from '@testing-library/react-native';

import type { StepDraft } from '../../steps';

import { FlowChart } from './FlowChart';

const step = (key: string, body: string, during: string | null = null): StepDraft => ({
  key,
  body,
  note: '',
  durationSeconds: null,
  ingredientIds: [],
  equipmentIds: [],
  during,
  imageKey: null,
});

describe('FlowChart', () => {
  /** The criterion: one element per main step, naming what runs during it. */
  it('reads each main step as one element with its parallel steps', async () => {
    await render(
      <FlowChart
        steps={[
          step('a', 'Heat the oven'),
          step('b', 'Roast the beetroot'),
          step('c', 'Chop the dill', 'b'),
          step('d', 'Boil the eggs', 'b'),
        ]}
      />,
    );
    expect(screen.getByLabelText('Step 1, Heat the oven')).toBeTruthy();
    expect(
      screen.getByLabelText(
        'Step 2, Roast the beetroot, meanwhile 2a Chop the dill, 2b Boil the eggs',
      ),
    ).toBeTruthy();
    expect(screen.getByText('2b')).toBeTruthy();
  });

  it('draws no branch for a step with nothing running during it', async () => {
    await render(<FlowChart steps={[step('a', 'Heat'), step('b', 'Serve')]} />);
    expect(screen.queryByText(/^\d[a-z]$/)).toBeNull();
    expect(screen.getByLabelText('Step 2, Serve')).toBeTruthy();
  });
});
