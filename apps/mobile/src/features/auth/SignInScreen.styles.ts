import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
  },
  intro: {
    textAlign: 'center',
  },
  /** Apple specify the height; the width fills the column like the other buttons. */
  appleButton: {
    height: 44,
    width: '100%',
  },
  devNote: {
    textAlign: 'center',
  },
});
