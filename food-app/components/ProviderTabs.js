// fyp/food-app/components/ProviderTabs.js

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ProviderQuestionListScreen from '../screens/ProviderQuestionListScreen';
import CommunityScreen from '../screens/Community';
import ProfileScreen from '../screens/Profile';

const Tab = createBottomTabNavigator();

export default function ProviderTabs() {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.card,
                    height: 45 + insets.bottom,
                    paddingBottom: insets.bottom,
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: colors.border,
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textSecondary,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;
                    if (route.name === 'Dashboard') {
                        iconName = focused ? 'medkit' : 'medkit-outline';
                    } else if (route.name === 'Community') {
                        iconName = focused ? 'people' : 'people-outline';
                    } else if (route.name === 'Profile') {
                        iconName = focused ? 'person-circle' : 'person-circle-outline';
                    }
                    return <Ionicons name={iconName} size={size} color={color} />;
                },
            })}
        >
            <Tab.Screen 
                name="Dashboard" 
                component={ProviderQuestionListScreen} 
                options={{ title: 'Questions' }}
            />
            <Tab.Screen 
                name="Community" 
                component={CommunityScreen} 
            />
            <Tab.Screen 
                name="Profile" 
                component={ProfileScreen} 
            />
        </Tab.Navigator>
    );
}