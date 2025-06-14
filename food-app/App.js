// App.js (in project root)
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import LoginScreen from './screens/Login';
import AppTabs from './components/AppTabs'; // Assuming AppTabs is in components
import LogBloodSugarScreen from './screens/LogBloodSugarScreen'; // Import the new screen
// Import other modal screens if you have them, e.g., for calorie/sugar
import LogCalorieSugarScreen from './screens/LogCalorieSugarScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        id="RootStack"
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MainApp"
          component={AppTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="LogBloodSugarModal" // Route name for this modal
          component={LogBloodSugarScreen}
          options={{
            presentation: 'modal', // Opens as a modal
            headerShown: false,    // The screen has its own title and close button
            // title: 'Log Blood Sugar', // Or set title in the screen itself
          }}
        />
        
        <Stack.Screen
          name="LogCalorieSugarModal"
          component={LogCalorieSugarScreen}
          options={{ 
            presentation: 'modal',
            headerShown: false,
          }}
        />
       
      </Stack.Navigator>
    </NavigationContainer>
  );
}