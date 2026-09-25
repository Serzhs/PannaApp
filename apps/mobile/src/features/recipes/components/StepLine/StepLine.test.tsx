import { fireEvent, render, screen } from '@testing-library/react-native';

import type { StepDraft } from '../../steps';

import { StepLine } from './StepLine';

describe('StepLine', () => {
  const line: StepDraft = {
    key: 'a',
    body: 'Heat the oven',
    note: '',
    durationSeconds: 600,
    ingredientIds: [],
    equipmentIds: [],
    during: null,
    imageKey: null,
  };

  it('offers the instruction and the time, and keeps the note behind a button', async () => {
    await render(<StepLine line={line} onChange={jest.fn()} ingredients={[]} equipment={[]} />);
    expect(screen.getByLabelText('Instruction')).toHaveProp('value', 'Heat the oven');
    expect(screen.getByRole('button', { name: 'Time, 10 min' })).toBeTruthy();
    expect(screen.queryByLabelText('Note')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Add a note' }));
    expect(screen.getByLabelText('Note')).toBeTruthy();
  });

  it('shows an existing note straight away', async () => {
    await render(
      <StepLine
        line={{ ...line, note: 'Fan off' }}
        onChange={jest.fn()}
        ingredients={[]}
        equipment={[]}
      />,
    );
    expect(screen.getByLabelText('Note')).toHaveProp('value', 'Fan off');
    expect(screen.queryByRole('button', { name: 'Add a note' })).toBeNull();
  });

  it('reports a change with the rest of the line intact', async () => {
    const onChange = jest.fn();
    await render(<StepLine line={line} onChange={onChange} ingredients={[]} equipment={[]} />);
    await fireEvent.changeText(screen.getByLabelText('Instruction'), 'Heat the pan');
    expect(onChange).toHaveBeenCalledWith({ ...line, body: 'Heat the pan' });
  });

  it('shows the instruction error under its field', async () => {
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

  /** 0030: the common steps on a fresh step only, gone once there is text, and one fills the field. */
  it('offers the common steps on a fresh step until there is an instruction', async () => {
    const onChange = jest.fn();
    await render(
      <StepLine
        line={{ ...line, body: '' }}
        onChange={onChange}
        ingredients={[]}
        equipment={[]}
        fresh
      />,
    );
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Heat the pan' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ body: 'Heat the pan' }));
    await screen.unmount();

    await render(
      <StepLine
        line={{ ...line, body: 'Heat' }}
        onChange={onChange}
        ingredients={[]}
        equipment={[]}
        fresh
      />,
    );
    expect(screen.queryByRole('checkbox', { name: 'Heat the pan' })).toBeNull();
    await screen.unmount();

    await render(
      <StepLine line={{ ...line, body: '' }} onChange={onChange} ingredients={[]} equipment={[]} />,
    );
    expect(screen.queryByRole('checkbox', { name: 'Heat the pan' })).toBeNull();
  });
});
