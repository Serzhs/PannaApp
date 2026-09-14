import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { Text } from './Text';

const meta = {
  title: 'Text',
  component: Text,
  args: { children: 'Roast the pork for forty minutes', variant: 'body', color: 'textPrimary' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['display', 'title', 'heading', 'body', 'bodyStrong', 'caption', 'label'],
    },
    color: {
      control: 'select',
      options: ['textPrimary', 'textSecondary', 'textDisabled', 'accent', 'danger'],
    },
  },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Body: Story = {};
export const Display: Story = { args: { variant: 'display', children: 'Panna' } };
export const Title: Story = { args: { variant: 'title', children: 'Slow roast pork' } };
export const Heading: Story = { args: { variant: 'heading', children: 'Ingredients' } };
export const BodyStrong: Story = { args: { variant: 'bodyStrong' } };
export const Caption: Story = { args: { variant: 'caption', color: 'textSecondary' } };
export const Label: Story = { args: { variant: 'label', color: 'textSecondary' } };
