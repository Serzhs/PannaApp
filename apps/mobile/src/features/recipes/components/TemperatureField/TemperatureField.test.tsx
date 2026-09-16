import { render, screen } from '@testing-library/react-native';

import { TemperatureField } from './TemperatureField';

import * as unitSystem from '@/features/units/useUnitSystem';

describe('TemperatureField', () => {
  const system = jest.spyOn(unitSystem, 'useUnitSystem');

  it("is labelled in the author's own unit", async () => {
    system.mockReturnValue('imperial');
    const view = await render(<TemperatureField value="350" onChangeText={jest.fn()} />);
    expect(screen.getByLabelText('Temperature (°F)')).toBeTruthy();
    system.mockReturnValue('metric');
    await view.rerender(<TemperatureField value="180" onChangeText={jest.fn()} />);
    expect(screen.getByLabelText('Temperature (°C)')).toBeTruthy();
  });
});
