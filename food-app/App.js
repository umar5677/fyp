// App.js (in project root)
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text, StyleSheet } from 'react-native';
import FlashMessage from "react-native-flash-message";
import * as Notifications from 'expo-notifications';

// Font Imports
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

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

// --- NOTIFICATION HANDLER CONFIGURATION ---
// This tells the app how to behave when a notification is received while the app is in the foreground.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false, // You can set this to true if you manage badge counts
  }),
});

// A flag to ensure the font override only happens once
let fontOverrideApplied = false;

export default function App() {
  // Load custom fonts
  let [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // --- GLOBAL FONT OVERRIDE LOGIC (SAFE VERSION) ---
  if (fontsLoaded && !fontError && !fontOverrideApplied) {
    const oldRender = Text.render;
    Text.render = function (...args) {
      const origin = oldRender.call(this, ...args);
      const style = StyleSheet.flatten(origin.props.style);

      // If a fontFamily is already set (e.g., for an icon font), do not override it.
      if (style && style.fontFamily) {
        return origin;
      }

      // Apply our Inter font based on fontWeight.
      let fontFamily = 'Inter_400Regular'; // Default
      if (style?.fontWeight === '500') fontFamily = 'Inter_500Medium';
      if (style?.fontWeight === '600' || style?.fontWeight === 'semibold') fontFamily = 'Inter_600SemiBold';
      if (style?.fontWeight === 'bold' || style?.fontWeight === '700') fontFamily = 'Inter_700Bold';
      
      const newStyle = { ...style, fontFamily };

      return React.cloneElement(origin, { style: newStyle });
    };
    fontOverrideApplied = true; // Set the flag to prevent re-applying
  }

  // Optional: Listen for notification responses (e.g., when a user taps a notification)
  useEffect(() => {
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped!', response.notification.request.content.data);
      // Here you could add navigation logic based on the notification data
    });

    return () => {
      responseSubscription.remove();
    };
  }, []);

  // Wait for fonts to load before rendering the app
  if (!fontsLoaded && !fontError) {
    return null; // Or return a loading indicator
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          id="RootStack"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="MainApp" component={AppTabs} />
          
          {/* Modal Screens */}
          <Stack.Screen name="LogBloodSugarModal" component={LogBloodSugarScreen} options={{ presentation: 'transparentModal' }} />
          <Stack.Screen name="LogCalorieSugarModal" component={LogCalorieSugarScreen} options={{ presentation: 'transparentModal' }} />
          <Stack.Screen name="AiFoodScan" component={AiFoodScanScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="Notifications" component={NotificationScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="Alerts" component={AlertsScreen} options={{ presentation: 'modal' }} />
          <Stack.Screen name="Reminders" component={RemindersScreen} options={{ presentation: 'modal' }} />
        </Stack.Navigator>
      </NavigationContainer>
      
      {/* FlashMessage must be last and outside NavigationContainer */}
      <FlashMessage position="top" />
    </SafeAreaProvider>
  );
}