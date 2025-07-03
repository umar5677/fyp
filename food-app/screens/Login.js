import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import * as SecureStore from 'expo-secure-store';

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
      const response = await fetch(YOUR_AWS_LOGIN_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const responseData = await response.json();

      if (response.ok) {
        if (responseData.accessToken && responseData.refreshToken) {
          await SecureStore.setItemAsync('accessToken', responseData.accessToken);
          await SecureStore.setItemAsync('refreshToken', responseData.refreshToken);
        } else {
          Alert.alert('Login Error', 'No tokens received.');
          return;
        }
        //Alert.alert('Login Success', responseData.message || 'Successfully logged in!');
        navigation.replace('MainApp', {
          userId: responseData.userId,
          userEmail: responseData.email,
        });
      } else {
        Alert.alert('Login Failed', responseData.message || `Error: ${response.status}`);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Network Error', 'Unable to connect to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('../assets/GlucoBites.png')} style={styles.logo} />
      <Text style={styles.welcome}>Welcome to <Text style={styles.appName}>GlucoBites</Text></Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {isLoading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : (
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginText}>Login</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.signupText}>
        Don’t have an account?{' '}
        <Text style={styles.signupLink} onPress={() => navigation.navigate('Signup')}>
          Sign up
        </Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    alignItems: 'center',
    padding: 20,
    paddingTop: 80,
  },
  logo: {
    width: 300,
    height: 300,
    resizeMode: 'contain',
    marginTop: 20,
  },
  appTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#3B3B3B',
    marginBottom: 10,
  },
  welcome: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
  },
  appName: {
    fontSize: 26, 
    fontWeight: 'bold',
    color: '#000',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  loginButton: {
    width: '100%',
    backgroundColor: '#00AEEF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  loginText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  signupText: {
    color: '#333',
    fontSize: 14,
  },
  signupLink: {
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
});

export default Login;