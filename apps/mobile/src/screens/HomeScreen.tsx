import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen, Button } from '../components/ui';
import { useAuth } from '../hooks';

export const HomeScreen: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to Heimursaga</Text>
          <Text style={styles.subtitle}>
            Hello, {user?.username || user?.email}!
          </Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.comingSoon}>
            📱 Mobile app features coming soon!
          </Text>
          <Text style={styles.description}>
            • Create journal entries with photos
          </Text>
          <Text style={styles.description}>
            • Explore waypoints on the map
          </Text>
          <Text style={styles.description}>
            • Connect with other travelers
          </Text>
          <Text style={styles.description}>
            • View user profiles and trips
          </Text>
        </View>

        <View style={styles.actions}>
          <Button
            title="Logout"
            onPress={handleLogout}
            variant="outline"
            style={styles.logoutButton}
          />
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  
  header: {
    alignItems: 'center',
    paddingTop: 60,
  },
  
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 8,
    textAlign: 'center',
  },
  
  subtitle: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '500',
    textAlign: 'center',
  },
  
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  
  comingSoon: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 32,
  },
  
  description: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 12,
    lineHeight: 24,
  },
  
  actions: {
    paddingBottom: 40,
  },
  
  logoutButton: {
    marginTop: 16,
  },
});