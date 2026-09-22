import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

import { PhotoField } from './PhotoField';

import * as images from '@/api/images';
import * as online from '@/query/useIsOnline';

const KEY = 'a'.repeat(32);

describe('PhotoField', () => {
  const isOnline = jest.spyOn(online, 'useIsOnline');
  const upload = jest.spyOn(images, 'uploadImage');
  const pick = jest.mocked(ImagePicker.launchImageLibraryAsync);

  beforeEach(() => {
    isOnline.mockReturnValue(true);
    upload.mockReset();
    pick.mockReset();
  });

  /** The criteria: Choose when empty, upload on pick, Change and Remove once set. */
  it('uploads what was picked and hands back the key', async () => {
    pick.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///photo.jpg', width: 10, height: 10, mimeType: 'image/jpeg' }],
    });
    upload.mockResolvedValue(KEY);
    const onChange = jest.fn();
    await render(<PhotoField label="Cover photo" value={null} onChange={onChange} />);
    expect(screen.queryByRole('button', { name: 'Remove cover photo' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Choose cover photo' }));
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(KEY);
    });
    expect(upload).toHaveBeenCalledWith(expect.objectContaining({ uri: 'file:///photo.jpg' }));
  });

  it('offers Change and Remove once a photo is set, and Remove clears it', async () => {
    const onChange = jest.fn();
    await render(<PhotoField label="Cover photo" value={KEY} onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Change cover photo' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Remove cover photo' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('does nothing when the picker is cancelled', async () => {
    pick.mockResolvedValue({ canceled: true, assets: null });
    const onChange = jest.fn();
    await render(<PhotoField label="Cover photo" value={null} onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Choose cover photo' }));
    await waitFor(() => {
      expect(pick).toHaveBeenCalled();
    });
    expect(upload).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('says so instead of picking when offline', async () => {
    isOnline.mockReturnValue(false);
    await render(<PhotoField label="Cover photo" value={null} onChange={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Choose cover photo' }));
    expect(screen.getByText(/You are offline/)).toBeTruthy();
    expect(pick).not.toHaveBeenCalled();
  });
});
