import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { Screen, Input, Button } from '../../components/ui';
import { useAuth } from '../../hooks';
import { validation, validateField, validationRules } from '../../utils/validation';
import type { ILoginPayload } from '@repo/types';

interface LoginFormData {
  login: string;
  password: string;
}

interface LoginScreenProps {
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { login, isLoading, error, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<LoginFormData>({
    defaultValues: {
      login: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      clearError();
      
      // Sanitize inputs
      const sanitizedData: ILoginPayload = {
        login: validation.sanitizeInput(data.login.trim()),
        password: data.password, // Don't sanitize password
      };

      await login(sanitizedData);
      
      // Navigation will be handled by the app's auth state change
    } catch (err) {
      // Error is handled by the auth store and displayed via error state
      console.error('Login error:', err);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleSignUp = () => {
    navigation.navigate('Signup');
  };

  return (
    <Screen scrollable keyboardAvoiding>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue your journey</Text>
        </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="login"
            rules={{
              validate: (value) => validateField(value, validationRules.loginEmail),
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email or Username"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.login?.message}
                placeholder="Enter your email or username"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            rules={{
              validate: (value) => validateField(value, validationRules.loginPassword),
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
                placeholder="Enter your password"
                secureTextEntry
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword(!showPassword)}
                rightIcon={
                  <Text style={styles.passwordToggle}>
                    {showPassword ? '🙈' : '👁️'}
                  </Text>
                }
                autoComplete="password"
                textContentType="password"
              />
            )}
          />

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          <TouchableOpacity
            style={styles.forgotPasswordButton}
            onPress={handleForgotPassword}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <Button
            title="Sign In"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            style={styles.loginButton}
          />

          <View style={styles.signupContainer}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={handleSignUp}>
              <Text style={styles.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  
  form: {
    width: '100%',
  },
  
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  
  forgotPasswordText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  
  loginButton: {
    marginBottom: 24,
  },
  
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  signupText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  
  signupLink: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  
  passwordToggle: {
    fontSize: 16,
  },
});