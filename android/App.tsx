import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AppListScreen from './src/screens/AppListScreen';
import UsageStatsScreen from './src/screens/UsageStatsScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const PURPLE = '#6E62E5';
const GRAY = '#B7B4D6';

function TabIcon({ focused, type }: { focused: boolean; type: 'home' | 'stats' | 'settings' }) {
  if (type === 'settings') {
    return (
      <View style={styles.iconWrap}>
        <Text style={{ fontSize: 22, color: focused ? PURPLE : GRAY }}>⚙</Text>
      </View>
    );
  }
  const source = type === 'home' ? require('./src/assets/tab_home.png') : require('./src/assets/tab_stats.png');
  return (
    <View style={styles.iconWrap}>
      <Image
        source={source}
        style={[styles.iconImg, { tintColor: focused ? PURPLE : GRAY }]}
        resizeMode="contain"
      />
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: PURPLE,
          tabBarInactiveTintColor: GRAY,
          tabBarStyle: styles.tabBar,
          tabBarItemStyle: styles.tabItem,
          tabBarLabelStyle: styles.tabLabel,
          tabBarBackground: () => <View style={styles.tabBarBg} />,
        }}
      >
        <Tab.Screen
          name="홈"
          component={AppListScreen}
          options={{
            tabBarIcon: ({ focused }) => <TabIcon focused={focused} type="home" />,
          }}
        />
        <Tab.Screen
          name="사용기록"
          component={UsageStatsScreen}
          options={{
            tabBarIcon: ({ focused }) => <TabIcon focused={focused} type="stats" />,
          }}
        />
        <Tab.Screen
          name="설정"
          component={SettingsScreen}
          options={{
            tabBarIcon: ({ focused }) => <TabIcon focused={focused} type="settings" />,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 12,
    height: 80,
    borderRadius: 38,
    borderTopWidth: 0,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    backgroundColor: 'transparent',
  },
  tabBarBg: {
    flex: 1,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  tabItem: {
    paddingTop: 12,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  iconWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconImg: {
    width: 26,
    height: 26,
  },
});
