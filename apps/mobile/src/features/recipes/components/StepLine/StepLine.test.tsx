import { fireEvent, render, screen } from '@testing-library/react-native';

import { StepLine } from './StepLine';

import * as unitSystem from '@/features/units/useUnitSystem';

// The temperature field reads the unit system from the session; there is none in a test.
beforeAll(() => {
  jest.spyOn(unitSystem, 'useUnitSystem').mockReturnValue('metric');
});

describe('StepLine', () => {
  const line = {
    key: 'a',
    body: 'Heat the oven',
    note: '',
    durationSeconds: 600,
    temperature: '180',
    ingredientIds: [],
    equipmentIds: [],
  };

  it('offers the instruction, note, time and temperature', async () => {
    await render(<StepLine line={line} onChange={jest.fn()} ingredients={[]} equipment={[]} />);
    expect(screen.getByLabelText('Instruction')).toHaveProp('value', 'Heat the oven');
    expect(screen.getByLabelText('Note')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Time, 10 min' })).toBeTruthy();
    expect(screen.getByLabelText(/Temperature/)).toHaveProp('value', '180');
  });

  it('reports a change with the rest of the line intact', async () => {
    const onChange = jest.fn();
    await render(<StepLine line={line} onChange={onChange} ingredients={[]} equipment={[]} />);
    await fireEvent.changeText(screen.getByLabelText('Instruction'), 'Heat the oven well');
    expect(onChange).toHaveBeenCalledWith({ ...line, body: 'Heat the oven well' });
  });

  it('shows a body error in words', async () => {
    await render(
      <StepLine
        line={{ ...line, body: '' }}
        errors={{ body: true }}
        onChange={jest.fn()}
        ingredients={[]}
        equipment={[]}
      />,
    );
    expect(screen.getByLabelText('Instruction, Write what to do.')).toBeTruthy();
  });
});
