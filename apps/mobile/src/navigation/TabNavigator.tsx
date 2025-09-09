import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, StyleSheet, View, Image, TouchableOpacity } from 'react-native';
// Temporarily using emoji icons while we debug icon library issues
import { ExploreScreen } from '../screens/ExploreScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { useAuth } from '../hooks';

export type TabParamList = {
  Explore: undefined;
  Journal: undefined;
  Bookmarks: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const TabIcon: React.FC<{ name: string; focused: boolean }> = ({ name, focused }) => {
  const color = focused ? '#AC6D46' : '#8E8E93';
  
  // Simple text-based icons that will definitely work
  let iconText = '';
  switch (name) {
    case 'explore':
      iconText = '🌍';
      break;
    case 'journal':
      iconText = '📖';
      break;
    case 'bookmarks':
      iconText = '🔖';
      break;
    default:
      iconText = '🌍';
  }

  return (
    <Text style={{ fontSize: 20, color }}>
      {iconText}
    </Text>
  );
};

const UserAvatar: React.FC = () => {
  const { user } = useAuth();
  
  return (
    <TouchableOpacity style={styles.avatarButton}>
      {user?.picture ? (
        <Image
          source={{ uri: user.picture }}
          style={styles.avatar}
        />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>
            {user?.username?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const LogEntryButton: React.FC = () => {
  return (
    <TouchableOpacity style={styles.logButton}>
      <Text style={{ fontSize: 20, color: '#FFFFFF' }}>✏️</Text>
    </TouchableOpacity>
  );
};

const TabLabel: React.FC<{ title: string; focused: boolean }> = ({ title, focused }) => (
  <Text style={[styles.label, focused && styles.labelFocused]}>
    {title}
  </Text>
);

export const TabNavigator: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState('Explore');

  const renderScreen = () => {
    switch (activeTab) {
      case 'Explore':
        return <ExploreScreen />;
      case 'Journal':
        return <HomeScreen />; // TODO: Replace with JournalScreen
      case 'Bookmarks':
        return <HomeScreen />; // TODO: Replace with BookmarksScreen
      default:
        return <ExploreScreen />;
    }
  };

  return (
    <View style={styles.container}>
      {/* Screen Content */}
      <View style={styles.screenContainer}>
        {renderScreen()}
      </View>
      
      {/* Custom Bottom Navigation */}
      <View style={styles.bottomNav}>
        <UserAvatar />
        
        <View style={styles.centerTabs}>
          {['Explore', 'Journal', 'Bookmarks'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={styles.tab}
              onPress={() => setActiveTab(tab)}
            >
              <TabIcon name={tab.toLowerCase()} focused={activeTab === tab} />
              <TabLabel title={tab} focused={activeTab === tab} />
            </TouchableOpacity>
          ))}
        </View>
        
        <LogEntryButton />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  screenContainer: {
    flex: 1,
  },

  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    height: 84,
  },

  centerTabs: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-evenly',
    marginHorizontal: 16,
  },

  tab: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  
  label: {
    fontSize: 12,
    marginTop: 4,
    color: '#8E8E93',
  },
  
  labelFocused: {
    color: '#AC6D46',
    fontWeight: '600',
  },

  avatarButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },

  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#AC6D46',
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },

  logButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#AC6D46',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});