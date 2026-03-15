import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Svg, Path, Circle, Line } from 'react-native-svg';
import { useTheme } from '@/theme/ThemeContext';
import { colors as brandColors, mono } from '@/theme/tokens';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const active = brandColors.copper;
  const inactive = 'rgba(181,188,196,0.5)';
  const color = focused ? active : inactive;
  const sw = focused ? 2.5 : 1.5;

  const icons: Record<string, React.ReactNode> = {
    explore: (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw}>
        <Circle cx={12} cy={12} r={10} />
        <Line x1={2} y1={12} x2={22} y2={12} />
        <Path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </Svg>
    ),
    discover: (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw}>
        <Circle cx={11} cy={11} r={8} />
        <Line x1={21} y1={21} x2={16.65} y2={16.65} />
      </Svg>
    ),
    create: (
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={11} fill={brandColors.copper} />
        <Line x1={12} y1={7} x2={12} y2={17} stroke="#ffffff" strokeWidth={2} strokeLinecap="square" />
        <Line x1={7} y1={12} x2={17} y2={12} stroke="#ffffff" strokeWidth={2} strokeLinecap="square" />
      </Svg>
    ),
    saved: (
      <Svg width={20} height={20} viewBox="0 0 24 24" stroke={color} strokeWidth={sw} fill={focused ? color : 'none'}>
        <Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </Svg>
    ),
    journal: (
      <Svg width={20} height={20} viewBox="0 0 24 24" stroke={color} strokeWidth={sw} fill={focused ? color : 'none'}>
        <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <Circle cx={12} cy={7} r={4} />
      </Svg>
    ),
  };

  return <View style={styles.iconWrap} accessibilityElementsHidden>{icons[name]}</View>;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        lazy: true,
        tabBarStyle: {
          backgroundColor: brandColors.black,
          borderTopWidth: 3,
          borderTopColor: brandColors.copper,
          paddingTop: 10,
          paddingBottom: insets.bottom || 8,
          height: 62 + (insets.bottom || 8),
        },
        tabBarLabelStyle: {
          fontFamily: mono,
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 1,
          textTransform: 'uppercase',
          marginTop: 4,
        },
        tabBarActiveTintColor: brandColors.copper,
        tabBarInactiveTintColor: 'rgba(181,188,196,0.5)',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explore',
          tabBarAccessibilityLabel: 'Explore tab',
          tabBarIcon: ({ focused }) => <TabIcon name="explore" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarAccessibilityLabel: 'Discover tab',
          tabBarIcon: ({ focused }) => <TabIcon name="discover" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Log',
          tabBarAccessibilityLabel: 'Log new entry tab',
          tabBarIcon: ({ focused }) => <TabIcon name="create" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          title: 'Bookmark',
          tabBarAccessibilityLabel: 'Bookmarks tab',
          tabBarIcon: ({ focused }) => <TabIcon name="saved" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Journal',
          tabBarAccessibilityLabel: 'Journal tab',
          tabBarIcon: ({ focused }) => <TabIcon name="journal" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 22,
  },
});
