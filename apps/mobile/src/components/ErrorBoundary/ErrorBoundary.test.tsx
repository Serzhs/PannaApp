import { fireEvent, render, screen } from '@testing-library/react-native';

import { ErrorBoundary } from './ErrorBoundary';

import { Text } from '@/components/Text';

function Broken(): React.JSX.Element {
  throw new Error('Kaboom');
}

describe('ErrorBoundary', () => {
  // The boundary logs the error it caught, which would otherwise fill the test output.
  let logged: jest.SpyInstance;
  beforeEach(() => {
    logged = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => {
    logged.mockRestore();
  });

  it('renders its children when nothing throws', async () => {
    await render(
      <ErrorBoundary>
        <Text>Recipes</Text>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Recipes')).toBeTruthy();
  });

  /** 0001 criterion 24, which could not be checked on a simulator: a render error must
   * land on a recovery screen rather than a blank app. */
  it('shows a recovery screen instead of a blank app when a child throws', async () => {
    await render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('header', { name: 'Something went wrong' })).toBeTruthy();
    expect(screen.getByText('Kaboom')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
  });

  it('clears the error when Try again is pressed', async () => {
    function Flaky({ fail }: { readonly fail: boolean }): React.JSX.Element {
      if (fail) throw new Error('Kaboom');
      return <Text>Recipes</Text>;
    }

    const view = await render(
      <ErrorBoundary>
        <Flaky fail />
      </ErrorBoundary>,
    );
    // The child has to stop throwing before the retry, or the boundary catches again.
    await view.rerender(
      <ErrorBoundary>
        <Flaky fail={false} />
      </ErrorBoundary>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('Recipes')).toBeTruthy();
  });
});
