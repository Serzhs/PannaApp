import type { Meta, StoryObj } from '@storybook/react-native';

import { Button } from './Button';

const meta = {
  title: 'Button',
  component: Button,
  args: { label: 'Save recipe', variant: 'primary', loading: false, disabled: false },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost', 'danger'] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Ghost: Story = { args: { variant: 'ghost' } };
export const Danger: Story = { args: { variant: 'danger', label: 'Delete recipe' } };
export const Disabled: Story = { args: { disabled: true } };
export const Loading: Story = { args: { loading: true } };
export const DangerLoading: Story = { args: { variant: 'danger', loading: true } };
