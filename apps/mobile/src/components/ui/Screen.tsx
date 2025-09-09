import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
} from 'react-native';

interface ScreenProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  keyboardAvoiding?: boolean;
  safeArea?: boolean;
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  scrollable = false,
  style,
  contentContainerStyle,
  keyboardAvoiding = true,
  safeArea = true,
}) => {
  const Wrapper = safeArea ? SafeAreaView : View;
  const Content = scrollable ? ScrollView : View;
  
  const content = (
    <Content
      style={scrollable ? styles.scrollView : [styles.container, style]}
      contentContainerStyle={
        scrollable 
          ? [styles.scrollContentContainer, contentContainerStyle]
          : undefined
      }
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </Content>
  );

  if (keyboardAvoiding) {
    return (
      <Wrapper style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          {content}
        </KeyboardAvoidingView>
      </Wrapper>
    );
  }

  return (
    <Wrapper style={styles.safeArea}>
      {content}
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  
  keyboardAvoidingView: {
    flex: 1,
  },
  
  scrollView: {
    flex: 1,
  },
  
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
});