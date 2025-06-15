// components/AppTabs.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const { userId } = route.params;
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: Platform.OS === 'ios' ? '#F7F7F7' : '#FFFFFF',
          height: 45 + insets.bottom, 
          paddingBottom: insets.bottom,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: '#D1D1D6',
        },
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={Home}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused, color, size }) => <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="CalendarTab"
        component={Calendar}
        options={{
          tabBarLabel: 'Calendar',
          tabBarIcon: ({ focused, color, size }) => <Ionicons name={focused ? "calendar" : "calendar-outline"} size={size} color={color} />,
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
        name="StatsTab"
        component={Stats}
        options={{
          tabBarLabel: 'Stats',
          tabBarIcon: ({ focused, color, size }) => <Ionicons name={focused ? "bar-chart" : "bar-chart-outline"} size={size} color={color} />,
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