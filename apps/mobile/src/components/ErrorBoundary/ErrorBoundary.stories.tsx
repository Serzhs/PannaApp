import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { ErrorBoundary } from './ErrorBoundary';

function Broken(): React.JSX.Element {
  throw new Error('The recipe could not be loaded');
}

const meta = {
  title: 'ErrorBoundary',
  component: ErrorBoundary,
} satisfies Meta<typeof ErrorBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The only state worth looking at: the recovery screen a render error lands on. */
export const Recovering: Story = {
  args: {
    children: <Broken />,
  },
};
