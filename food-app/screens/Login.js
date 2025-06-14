// screens/Login.js (YOUR ACTUAL LOGIN LOGIC - ADAPT THIS)
import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';

// THIS IS YOUR BACKEND API URL that connects to your AWS DB for login
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
      // THIS IS WHERE YOU MAKE YOUR ACTUAL FETCH CALL TO YOUR AWS BACKEND
      const response = await fetch(YOUR_AWS_LOGIN_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim(), password: password }), // Send trimmed email
      });

      const responseData = await response.json(); // Always try to parse JSON

      if (response.ok) { // Check for 2xx status codes
        // Login successful
        Alert.alert('Login Success', responseData.message || 'Successfully logged in!');

        // CRUCIAL NAVIGATION STEP:
        // Navigate to 'MainApp' which will render your AppTabs
        // You might want to pass user data received from your backend
        navigation.replace('MainApp', {
          userId: responseData.userId, // Example: if your API returns userId
          userEmail: responseData.email, // Example: if your API returns email
          // token: responseData.token, // If your API returns a token for session management
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
      {/* Add Sign Up navigation if needed */}
      {/* <Button title="Don't have an account? Sign Up" onPress={() => navigation.navigate('Signup')} /> */}
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
  // Add more styles for Button, error messages, etc.
});

export default Login;