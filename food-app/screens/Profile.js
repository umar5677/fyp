// screens/Profile.js
import React from 'react';
// --- THIS IS THE FIX ---
// Import 'Platform' from 'react-native' to use it.
import { View, Text, StyleSheet, Button, Platform, Alert } from 'react-native';
// --- END OF FIX ---
import * as SecureStore from 'expo-secure-store';

const Profile = ({ navigation }) => {
  const handleLogout = async () => {
    try {
        // Delete the tokens from secure storage to log the user out
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
        
        // Navigate the user back to the Login screen, replacing the current
        // navigation stack so they cannot press "back" to get into the app.
        navigation.getParent('RootStack').replace('Login');
        
    } catch (error) {
        console.error("Error during logout:", error);
        Alert.alert("Logout Failed", "An error occurred while logging out. Please try closing the app.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Profile Screen</Text>
      <View style={styles.buttonContainer}>
        <Button 
          title="Logout" 
          onPress={handleLogout} 
          color={Platform.OS === 'ios' ? '#FF3B30' : undefined}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#F0F2F5',
    padding: 20,
  },
  text: { 
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  buttonContainer: {
      width: '80%',
      ...Platform.select({
          ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.22,
              shadowRadius: 2.22,
          },
          android: {
              elevation: 3,
          },
      }),
  }
});

export default Profile;