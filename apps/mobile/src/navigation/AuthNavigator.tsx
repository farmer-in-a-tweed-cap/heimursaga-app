import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import {
  LoginScreen,
  SignupScreen,
  ForgotPasswordScreen,
} from '../screens/auth';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
};

const Stack = createStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#ffffff',
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '600',
          color: '#1C1C1E',
        },
        headerTintColor: '#007AFF',
        cardStyle: {
          backgroundColor: '#ffffff',
        },
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Signup"
        component={SignupScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{
          title: 'Reset Password',
          headerBackTitleVisible: false,
        }}
      />
    </Stack.Navigator>
  );
};