import type { Meta, StoryObj } from '@storybook/react-native';

import { Screen } from './Screen';

import { Stack } from '@/components/Stack';
import { Text } from '@/components/Text';

const meta = {
  title: 'Screen',
  component: Screen,
  args: {
    padded: true,
    scroll: false,
    children: (
      <Stack gap="space3">
        <Text variant="title">Slow roast pork</Text>
        <Text color="textSecondary">Four hours, mostly waiting.</Text>
      </Stack>
    ),
  },
} satisfies Meta<typeof Screen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padded: Story = {};
export const FullBleed: Story = { args: { padded: false } };
export const Scrolling: Story = { args: { scroll: true } };
