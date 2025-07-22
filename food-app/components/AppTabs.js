// fyp/food-app/components/AppTabs.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext'; 

import HomeStack from '../screens/HomeStack';
import Community from '../screens/Community';
import Leaderboard from '../screens/Leaderboard';
import Profile from '../screens/Profile';
import SpeedDialButton from './SpeedDialButton';

const Tab = createBottomTabNavigator();
const DummyAddScreen = () => null;

const AppTabs = ({ navigation, route }) => {
  // --- FIX: Safely access params with a fallback to an empty object ---
  const { userId, isProvider } = route.params || {};

  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const ACTIVE_COLOR = colors.primary;
  const INACTIVE_COLOR = colors.textSecondary;

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.card, 
          height: 45 + insets.bottom, 
          paddingBottom: insets.bottom,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border, 
        },
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR, 
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        // Pass the safe params down to the next navigator
        initialParams={{ userId, isProvider }} 
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused, color, size }) => <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="CommunityTab"
        component={Community}
        options={{
          tabBarLabel: 'Community',
          tabBarIcon: ({ focused, color, size }) => <Ionicons name={focused ? "people" : "people-outline" } size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="AddActionTab"
        component={DummyAddScreen}
        options={{
          tabBarLabel: '',
          tabBarButton: () => <SpeedDialButton navigation={navigation} userId={userId} />,
        }}
      />
      <Tab.Screen
        name="LeaderboardTab"
        component={Leaderboard}
        options={{
          tabBarLabel: 'Leaderboard',
          tabBarIcon: ({ focused, color, size }) => <Ionicons name={focused ? "trophy" : "trophy-outline"} size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={Profile}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused, color, size }) => <Ionicons name={focused ? "person" : "person-outline"} size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

export default AppTabs;