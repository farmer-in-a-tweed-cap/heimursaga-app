import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, mono } from '@/theme/tokens';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) {
      console.error('ErrorBoundary caught:', error, info.componentStack);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            The app encountered an unexpected error. Please try again.
          </Text>
          {__DEV__ && this.state.error && (
            <Text style={styles.debug} numberOfLines={6}>
              {this.state.error.message}
            </Text>
          )}
          <Pressable style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>TRY AGAIN</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#141109',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    fontFamily: mono,
    fontSize: 18,
    fontWeight: '700',
    color: colors.copper,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  message: {
    fontFamily: mono,
    fontSize: 14,
    color: '#c8b89a',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  debug: {
    fontFamily: mono,
    fontSize: 11,
    color: colors.red,
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.8,
  },
  button: {
    backgroundColor: colors.copper,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  buttonText: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1.5,
  },
});
