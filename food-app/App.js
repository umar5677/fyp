// App.js (in project root)
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text, StyleSheet } from 'react-native'; // Import Text and StyleSheet

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

const Stack = createStackNavigator();

// A flag to ensure the override only happens once
let fontOverrideApplied = false;

export default function App() {
  // Load fonts
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

      // --- THE CRITICAL FIX ---
      // If a fontFamily is already set (e.g., for an icon font),
      // do not override it. Return the original component untouched.
      if (style && style.fontFamily) {
        return origin;
      }

      // If no fontFamily is set, apply our Inter font based on fontWeight.
      let fontFamily = 'Inter_400Regular'; // Default
      if (style?.fontWeight === '500') fontFamily = 'Inter_500Medium';
      if (style?.fontWeight === '600' || style?.fontWeight === 'semibold') fontFamily = 'Inter_600SemiBold';
      if (style?.fontWeight === 'bold' || style?.fontWeight === '700') fontFamily = 'Inter_700Bold';
      
      const newStyle = { ...style, fontFamily };

      return React.cloneElement(origin, { style: newStyle });
    };
    fontOverrideApplied = true; // Set the flag
  }

  // Wait for fonts to load before rendering the app
  if (!fontsLoaded && !fontError) {
    return null;
  }

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
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}