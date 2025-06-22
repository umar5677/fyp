// App.js (in project root)
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Import all screens
import LoginScreen from './screens/Login';
import AppTabs from './components/AppTabs'; 
import LogBloodSugarScreen from './screens/LogBloodSugarScreen';
import LogCalorieSugarScreen from './screens/LogCalorieSugarScreen';

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
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}