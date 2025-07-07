// App.js (in project root)
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import FlashMessage from "react-native-flash-message";

// Import all screens
import LoginScreen from './screens/Login';
import AppTabs from './components/AppTabs';
import LogBloodSugarScreen from './screens/LogBloodSugarScreen';
import LogCalorieSugarScreen from './screens/LogCalorieSugarScreen';
import AiFoodScanScreen from './screens/AiFoodScanScreen';
import NotificationScreen from './screens/Notifications';
import AlertsScreen from './screens/Alerts';          
import RemindersScreen from './screens/Reminders';

const Stack = createStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          id="RootStack"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen
            name="Login"
            component={LoginScreen}
          />
          <Stack.Screen
            name="MainApp"
            component={AppTabs}
          />
          <Stack.Screen
            name="LogBloodSugarModal"
            component={LogBloodSugarScreen}
            options={{ presentation: 'transparentModal' }}
          />
          <Stack.Screen
            name="LogCalorieSugarModal"
            component={LogCalorieSugarScreen}
            options={{ presentation: 'transparentModal' }}
          />
          <Stack.Screen
            name="AiFoodScan"
            component={AiFoodScanScreen}
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name="Notifications"
            component={NotificationScreen}
            options={{ presentation: 'modal' }}
          />
           <Stack.Screen
            name="Alerts"
            component={AlertsScreen}
            options={{ presentation: 'modal' }}
          />
           <Stack.Screen
            name="Reminders"
            component={RemindersScreen}
            options={{ presentation: 'modal' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      <FlashMessage position="top" />
    </SafeAreaProvider>
  );
}