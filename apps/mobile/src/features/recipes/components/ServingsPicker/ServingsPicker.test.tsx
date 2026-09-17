import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { ServingsPicker } from './ServingsPicker';

function Harness({ initial = '' }: { readonly initial?: string }) {
  const [value, setValue] = useState(initial);
  return <ServingsPicker value={value} onChangeText={setValue} />;
}

describe('ServingsPicker', () => {
  /** The criterion: a tap picks a number, Other opens the field. */
  it('picks a number with one tap, and opens a field for Other', async () => {
    await render(<Harness />);
    await fireEvent.press(screen.getByRole('radio', { name: '4' }));
    expect(screen.getByRole('radio', { name: '4' })).toBeChecked();
    expect(screen.queryByLabelText('Servings')).toBeNull();
    await fireEvent.press(screen.getByRole('radio', { name: 'Other' }));
    expect(screen.getByRole('radio', { name: 'Other' })).toBeChecked();
    await fireEvent.changeText(screen.getByLabelText('Servings'), '12');
    expect(screen.getByLabelText('Servings')).toHaveProp('value', '12');
  });

  it('opens on Other, field filled, for a value that is not in the row', async () => {
    await render(<Harness initial="3" />);
    expect(screen.getByRole('radio', { name: 'Other' })).toBeChecked();
    expect(screen.getByLabelText('Servings')).toHaveProp('value', '3');
  });

  it('opens on the number for a value that is in the row', async () => {
    await render(<Harness initial="2" />);
    expect(screen.getByRole('radio', { name: '2' })).toBeChecked();
    expect(screen.queryByLabelText('Servings')).toBeNull();
  });
});
