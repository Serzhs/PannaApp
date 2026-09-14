import type { Meta, StoryObj } from '@storybook/react-native';

import { Stack } from './Stack';

import { Text } from '@/components/Text';

const meta = {
  title: 'Stack',
  component: Stack,
  args: {
    gap: 'space3',
    direction: 'column',
    children: (
      <>
        <Text>Peel the carrots</Text>
        <Text>Heat the oven</Text>
        <Text>Season the pork</Text>
      </>
    ),
  },
  argTypes: {
    direction: { control: 'select', options: ['column', 'row'] },
    gap: {
      control: 'select',
      options: ['space0', 'space1', 'space2', 'space3', 'space4', 'space6'],
    },
  },
} satisfies Meta<typeof Stack>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Vertical: Story = {};
export const Horizontal: Story = { args: { direction: 'row' } };
export const NoGap: Story = { args: { gap: 'space0' } };
export const WideGap: Story = { args: { gap: 'space6' } };
