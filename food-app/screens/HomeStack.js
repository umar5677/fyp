// This is use to group home screen and view full glucose chart so that can switch between the home page and the chart
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from './Home';
import FullGlucoseChart from './FullGlucoseChart';

const Stack = createNativeStackNavigator();

export default function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={Home} />
      <Stack.Screen name="FullGlucoseChart" component={FullGlucoseChart} />
    </Stack.Navigator>
  );
}