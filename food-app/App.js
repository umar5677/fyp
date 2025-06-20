// App.js (in project root)
import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';

import LoginScreen from './screens/Login';
import AppTabs from './components/AppTabs'; 
import LogBloodSugarScreen from './screens/LogBloodSugarScreen';
import LogCalorieSugarScreen from './screens/LogCalorieSugarScreen';

const Stack = createStackNavigator();

const AuthLoadingScreen = ({ navigation }) => {
  useEffect(() => {
    const bootstrapAsync = async () => {
      let userToken;
      try {
        userToken = await SecureStore.getItemAsync('accessToken');
      } catch (e) {
        console.error("Failed to restore token", e);
      }
      navigation.replace(userToken ? 'MainApp' : 'Login');
    };

    bootstrapAsync();
  }, []);

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
};

export default function App() {
  return (
    <SafeAreaProvider> 
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="AuthLoading"
          id="RootStack"
          screenOptions={{ headerShown: false }} 
        >
          <Stack.Screen name="AuthLoading" component={AuthLoadingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="MainApp" component={AppTabs} />
          <Stack.Screen name="LogBloodSugarModal" component={LogBloodSugarScreen} options={{ presentation: 'transparentModal' }} />
          <Stack.Screen name="LogCalorieSugarModal" component={LogCalorieSugarScreen} options={{ presentation: 'transparentModal' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F2F5'
  }
});