import type { Meta, StoryObj } from '@storybook/react-native-web-vite';

import { TextField } from './TextField';

const meta = {
  title: 'TextField',
  component: TextField,
  args: { label: 'Recipe title', value: '', placeholder: 'Slow roast pork' },
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const Filled: Story = { args: { value: 'Slow roast pork' } };
export const WithHelper: Story = { args: { helper: 'Shown at the top of the recipe' } };
export const WithError: Story = {
  args: { value: 'S', error: 'A title needs at least three characters' },
};
export const Secure: Story = { args: { label: 'Share code', secureTextEntry: true, value: 'abc' } };
