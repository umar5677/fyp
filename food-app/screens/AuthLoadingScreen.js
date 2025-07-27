// fyp/food-app/screens/AuthLoadingScreen.js
import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from '@react-navigation/native';
import { api } from '../utils/api';
import { useTheme } from '../context/ThemeContext';

const AuthLoadingScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  useEffect(() => {
    const bootstrapAsync = async () => {
      let refreshToken;
      try {
        refreshToken = await SecureStore.getItemAsync('refreshToken');
      } catch (e) {
        navigation.replace('Login');
        return;
      }

      if (!refreshToken) {
        navigation.replace('Login');
        return;
      }

      try {
        const responseData = await api.getProfile(); 
        
        const user = responseData.user;
        
        if (!user) {
            throw new Error("User data not found in profile response.");
        }
        
        if (user.isProvider) {
          // A provider doesn't have a regular user setup flow
          navigation.replace('ProviderApp');
        } else if (user.hasProfileSetup) { 
          // If profile setup IS complete, go to the MainApp
          navigation.replace('MainApp', {
            isProvider: user.isProvider,
            userId: user.userID,
          });
        } else {
          // If profile setup is NOT complete, go to ProfileSetup
          navigation.replace('ProfileSetup');
        }

      } catch (error) {
        // If getting the profile fails, the session is invalid. Go to Login.
        console.error("Auth check failed:", error.message);
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        navigation.replace('Login');
      }
    };

    bootstrapAsync();
  }, [navigation]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color="#F97316" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AuthLoadingScreen;