// components/AppTabs.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Adjust import paths for screens (go up one level, then into screens)
import Home from '../screens/Home';
import Calendar from '../screens/Calendar';
import Stats from '../screens/Stats';
import Profile from '../screens/Profile';

// Import SpeedDialButton from the SAME 'components' folder
import SpeedDialButton from './SpeedDialButton';

const Tab = createBottomTabNavigator();

const ACTIVE_COLOR = '#007AFF';
const INACTIVE_COLOR = '#8e8e93';
const TAB_BAR_BACKGROUND = Platform.OS === 'ios' ? '#F7F7F7' : '#FFFFFF';
const BORDER_COLOR = '#D1D1D6';

const DummyAddScreen = () => null;

const AppTabs = ({ navigation }) => {
  // The 'navigation' prop is passed from App.js (the root StackNavigator)
  // and will be passed to SpeedDialButton

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: TAB_BAR_BACKGROUND,
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 30 : 5,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: BORDER_COLOR,
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
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="CalendarTab"
        component={Calendar}
        options={{
          title: 'Calendar',
          tabBarLabel: 'Calendar',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? "calendar" : "calendar-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AddActionTab"
        component={DummyAddScreen}
        options={{
          tabBarLabel: '',
          // Pass the parent stack's navigation to SpeedDialButton
          tabBarButton: () => (<SpeedDialButton navigation={navigation} />),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="StatsTab"
        component={Stats}
        options={{
          title: 'Stats',
          tabBarLabel: 'Stats',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? "bar-chart" : "bar-chart-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={Profile}
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default AppTabs;