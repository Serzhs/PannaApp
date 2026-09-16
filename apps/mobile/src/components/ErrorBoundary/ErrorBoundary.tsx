import { Component, type ErrorInfo, type ReactNode } from 'react';
import { View } from 'react-native';

import { styles } from './ErrorBoundary.styles';

import { Button } from '@/components/Button';
import { Text } from '@/components/Text';
import { i18n } from '@/i18n';

interface Props {
  readonly children: ReactNode;
}

interface State {
  readonly error: Error | null;
}

/** A render error without this is a white screen the user can only escape by killing the app. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled render error', error, info.componentStack);
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.screen} accessibilityRole="alert">
        <Text variant="title" accessibilityRole="header">
          {i18n.t('common:errorBoundary.title')}
        </Text>
        <Text variant="body" color="textSecondary" style={styles.message}>
          {error.message}
        </Text>
        <Button
          label={i18n.t('common:errorBoundary.action')}
          variant="secondary"
          onPress={() => {
            this.setState({ error: null });
          }}
        />
      </View>
    );
  }
}
