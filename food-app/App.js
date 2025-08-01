// App.js (in project root)

import { enableScreens } from 'react-native-screens';
enableScreens();

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text, StyleSheet } from 'react-native';
import FlashMessage from "react-native-flash-message";
import * as Notifications from 'expo-notifications';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import ProviderHistoryScreen from './screens/ProviderHistoryScreen';
import BookmarkedPostsScreen from './screens/BookmarkedPostsScreen';
import MyPostsScreen from './screens/MyPostsScreen';

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
import ProfileSetupScreen from './screens/ProfileSetup';
import EditProfileScreen from './screens/EditProfile'; 
import ChangePasswordScreen from './screens/ChangePassword';
import AddPostScreen from './screens/AddPostScreen';
import PostDetailScreen from './screens/PostDetailScreen';
import EditPostScreen from './screens/EditPostScreen';
import AuthLoadingScreen from './screens/AuthLoadingScreen';

// Import Q&A feature screens and components
import ProviderTabs from './components/ProviderTabs';
import AskQuestionScreen from './screens/AskQuestionScreen';
import ProviderAnswerScreen from './screens/ProviderAnswerScreen';

const Stack = createStackNavigator();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const AppNavigator = () => {
  const { colors } = useTheme();

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="AuthLoading"
        id="RootStack"
        screenOptions={{ headerShown: false }}
        
      >
        <Stack.Screen name="AuthLoading" component={AuthLoadingScreen} />
        {/* Core Auth and User Screens */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen 
                    name="ForgotPassword" 
                    component={ForgotPasswordScreen}
                    options={{ 
                        headerShown: true,
                        title: 'Forgot Password',
                        headerStyle: { backgroundColor: colors.card }, // Ensure it's themable
                        headerTintColor: colors.text,
                     }} 
                />

        <Stack.Screen 
          name="MyPosts" 
          component={MyPostsScreen} 
          options={{ 
              headerShown: true,
              headerTitle: 'My Posts',
              headerStyle: { backgroundColor: colors.card },
              headerTintColor: colors.text,
          }} 
        />
        
        <Stack.Screen 
          name="BookmarkedPosts" 
          component={BookmarkedPostsScreen} 
          options={{ 
              headerShown: true,
              headerTitle: 'My Bookmarks',
              headerStyle: { backgroundColor: colors.card },
              headerTintColor: colors.text,
          }} 
        />
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
        <Stack.Screen name="MainApp" component={AppTabs} />
        <Stack.Screen name="ProviderApp" component={ProviderTabs} />
        <Stack.Screen 
          name="EditProfile" 
          component={EditProfileScreen} 
          options={{
              headerShown: true,
              headerTitle: 'Edit Profile',
              headerStyle: { backgroundColor: colors.card },
              headerTintColor: colors.text,
          }} 
        />
      
        {/* General Modal Screens */}
        <Stack.Screen name="LogBloodSugarModal" component={LogBloodSugarScreen} options={{ presentation: 'transparentModal' }} />
        <Stack.Screen name="LogCalorieSugarModal" component={LogCalorieSugarScreen} options={{ presentation: 'transparentModal' }} />
        <Stack.Screen name="AiFoodScan" component={AiFoodScanScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Notifications" component={NotificationScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Alerts" component={AlertsScreen} options={{ presentation: 'modal' }} />
        <Stack.Screen 
            name="ChangePassword" 
            component={ChangePasswordScreen} 
            options={{ 
                headerShown: true, 
                headerTitle: 'Change Password',
                headerStyle: { backgroundColor: colors.card },
                headerTintColor: colors.text,
            }} 
        />
        <Stack.Screen name="Reminders" component={RemindersScreen} options={{ presentation: 'modal' }} />

        {/* Q&A Feature Screens with styled headers */}
        <Stack.Screen 
            name="AskQuestion" 
            component={AskQuestionScreen} 
            options={{ 
                presentation: 'modal',
                headerShown: true,
                headerTitle: 'Ask a Question',
                headerStyle: { backgroundColor: colors.card },
                headerTintColor: colors.text,
            }} 
        />

        <Stack.Screen
            name="EditPost"
            component={EditPostScreen}
            options={{
                headerShown: true,
                headerStyle: { backgroundColor: colors.card },
                headerTintColor: colors.text,
            }}
        />

        <Stack.Screen
                    name="AddPost"
                    component={AddPostScreen}
                    options={{
                        headerShown: true,
                        title: 'Create New Post',
                        headerStyle: { backgroundColor: colors.card },
                        headerTintColor: colors.text,
                    }}
                />
                <Stack.Screen
                    name="PostDetail"
                    component={PostDetailScreen}
                    options={{
                        headerShown: true,
                        title: 'Post',
                        headerStyle: { backgroundColor: colors.card },
                        headerTintColor: colors.text,
                    }}
                />
        <Stack.Screen 
            name="ProviderAnswerScreen" 
            component={ProviderAnswerScreen} 
            options={{ 
                headerShown: true,
                headerTitle: 'Answer Question',
                headerStyle: { backgroundColor: colors.card },
                headerTintColor: colors.text,
            }} 
        />

        <Stack.Screen 
            name="ProviderHistory" 
            component={ProviderHistoryScreen} 
            options={{ 
                headerShown: true,
                headerTitle: 'Answer History',
                headerStyle: { backgroundColor: colors.card },
                headerTintColor: colors.text,
            }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};


// A flag to ensure the font override only happens once
let fontOverrideApplied = false;

export default function App() {
  let [fontsLoaded, fontError] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold,
  });

  if (fontsLoaded && !fontError && !fontOverrideApplied) {
    const oldRender = Text.render;
    Text.render = function (...args) {
      const origin = oldRender.call(this, ...args);
      const style = StyleSheet.flatten(origin.props.style);
      if (style && style.fontFamily) { return origin; }
      let fontFamily = 'Inter_400Regular';
      if (style?.fontWeight === '500') fontFamily = 'Inter_500Medium';
      if (style?.fontWeight === '600' || style?.fontWeight === 'semibold') fontFamily = 'Inter_600SemiBold';
      if (style?.fontWeight === 'bold' || style?.fontWeight === '700') fontFamily = 'Inter_700Bold';
      return React.cloneElement(origin, { style: { ...style, fontFamily } });
    };
    fontOverrideApplied = true;
  }

  useEffect(() => {
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped!', response.notification.request.content.data);
    });
    return () => responseSubscription.remove();
  }, []);

  if (!fontsLoaded && !fontError) {
    return null; 
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AppNavigator />
        <FlashMessage position="top" />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}