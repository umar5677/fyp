// fyp/food-app/screens/HomeStack.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from './Home';
import FullGlucoseChart from './FullGlucoseChart';

const Stack = createNativeStackNavigator();

export default function HomeStack({ route }) {
  // --- FIX: Safely access params with a fallback ---
  const { userId, isProvider } = route.params || {};

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen 
        name="HomeMain" 
        component={Home} 
        // Pass the safe params down to the final screen
        initialParams={{ userId, isProvider }}
      />
      <Stack.Screen name="FullGlucoseChart" component={FullGlucoseChart} />
    </Stack.Navigator>
  );
}