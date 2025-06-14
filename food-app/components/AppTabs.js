// components/AppTabs.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Home from '../screens/Home';
import Calendar from '../screens/Calendar';
import Stats from '../screens/Stats';
import Profile from '../screens/Profile';
import SpeedDialButton from './SpeedDialButton';

const Tab = createBottomTabNavigator();
const DummyAddScreen = () => null;

const ACTIVE_COLOR = '#007AFF';
const INACTIVE_COLOR = '#8e8e93';

const AppTabs = ({ navigation, route }) => {
  // --- The Fix Starts Here ---
  // 1. Get the userId from the route params passed from the Login screen.
  const { userId } = route.params;
  // --- The Fix Ends Here ---

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: Platform.OS === 'ios' ? '#F7F7F7' : '#FFFFFF',
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 30 : 5,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: '#D1D1D6',
        },
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        headerShown: true,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={Home}
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color, size }) => <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="CalendarTab"
        component={Calendar}
        options={{
          title: 'Calendar',
          tabBarIcon: ({ focused, color, size }) => <Ionicons name={focused ? "calendar" : "calendar-outline"} size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="AddActionTab"
        component={DummyAddScreen}
        options={{
          tabBarLabel: '',
          headerShown: false,
          // 2. Pass the 'navigation' prop and the extracted 'userId' directly
          tabBarButton: () => <SpeedDialButton navigation={navigation} userId={userId} />,
        }}
      />
      <Tab.Screen
        name="StatsTab"
        component={Stats}
        options={{
          title: 'Stats',
          tabBarIcon: ({ focused, color, size }) => <Ionicons name={focused ? "bar-chart" : "bar-chart-outline"} size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={Profile}
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color, size }) => <Ionicons name={focused ? "person" : "person-outline"} size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

export default AppTabs;