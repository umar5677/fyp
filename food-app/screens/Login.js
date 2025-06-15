// screens/Login.js
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as SecureStore from 'expo-secure-store'; // Import the secure storage library

// BACKEND API URL that connects to your AWS DB for login
const YOUR_AWS_LOGIN_API_URL = 'http://192.168.0.120:3000/api/login';

const Login = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Please enter both email and password.');
      return;
    }

    setIsLoading(true);

    try {
      // ACTUAL FETCH CALL TO YOUR AWS BACKEND
      const response = await fetch(YOUR_AWS_LOGIN_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim(), password: password }),
      });

      const responseData = await response.json();

      if (response.ok) {
        // Login successful
        
        // --- JWT TOKEN HANDLING ---
        // Securely store both tokens received from the server
        if (responseData.accessToken && responseData.refreshToken) {
            await SecureStore.setItemAsync('accessToken', responseData.accessToken);
            await SecureStore.setItemAsync('refreshToken', responseData.refreshToken);
        } else {
            // Handle cases where tokens might not be sent, though this shouldn't happen on success
            Alert.alert('Authentication Error', 'Login successful, but no authentication token was received.');
            setIsLoading(false);
            return;
        }
        // --- END OF TOKEN HANDLING ---

        Alert.alert('Login Success', responseData.message || 'Successfully logged in!');

        // Navigate to 'MainApp'
        navigation.replace('MainApp', {
          userId: responseData.userId,
          userEmail: responseData.email,
        });

      } else {
        // Login failed - Handle specific error messages from your backend
        Alert.alert('Login Failed', responseData.message || `Server error: ${response.status}`);
      }
    } catch (error) {
      console.error('Login API request failed:', error);
      Alert.alert('Network Error', 'Could not connect to the server. Please check your internet connection or the server status.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back!</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TextInput
        style={styles.input}
        placeholder="Enter your Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {isLoading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : (
        <Button title="Login" onPress={handleLogin} />
      )}
      {/* 
        You might want to add a link to your Signup screen here.
        Example: <Button title="Don't have an account? Sign Up" onPress={() => navigation.navigate('Signup')} /> 
      */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#E6E6FA', // Lavender
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#FFFFFF',
    borderColor: '#B0C4DE', // LightSteelBlue
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
  },
});

export default Login;