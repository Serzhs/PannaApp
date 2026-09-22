import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { TimerBlock } from './TimerBlock';

describe('TimerBlock', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('offers to start with the step time, and reports the tap', async () => {
    const onStart = jest.fn();
    await render(
      <TimerBlock
        state={{ kind: 'idle', seconds: 1200 }}
        onStart={onStart}
        onStop={jest.fn()}
        onEnded={jest.fn()}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Start timer, 20 min' }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('counts down from the end time and says so when it reaches it', async () => {
    const start = 1_000_000;
    let clock = start;
    const onEnded = jest.fn();
    await render(
      <TimerBlock
        state={{ kind: 'running', endsAt: start + 65_000, silent: true }}
        onStart={jest.fn()}
        onStop={jest.fn()}
        onEnded={onEnded}
        now={() => clock}
      />,
    );
    expect(screen.getByText('01:05')).toBeTruthy();
    expect(screen.getByText(/Notifications are off/)).toBeTruthy();
    clock = start + 65_000;
    await act(async () => {
      jest.advanceTimersByTime(1000);
      await Promise.resolve();
    });
    expect(screen.getByText('00:00')).toBeTruthy();
    expect(onEnded).toHaveBeenCalled();
  });

  it("says whose timer is running when it is another step's", async () => {
    await render(
      <TimerBlock
        state={{ kind: 'elsewhere', stepNumber: 2, endsAt: Date.now() + 250_000 }}
        onStart={jest.fn()}
        onStop={jest.fn()}
        onEnded={jest.fn()}
      />,
    );
    expect(screen.getByText(/Timer running for step 2/)).toBeTruthy();
  });
});
