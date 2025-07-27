import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  Platform
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { api } from '../utils/api'; // Correctly import the centralized api utility

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
            const responseData = await api.login({
                email: email.trim(),
                password
            });

            if (responseData.accessToken && responseData.refreshToken) {
                await SecureStore.setItemAsync('accessToken', responseData.accessToken);
                await SecureStore.setItemAsync('refreshToken', responseData.refreshToken);
            } else {
                Alert.alert('Login Error', 'No tokens were received from the server.');
                setIsLoading(false);
                return;
            }

            // Navigation logic that handles both regular users and providers
            if (responseData.isProvider) {
                navigation.replace('ProviderApp');
            } else if (!responseData.hasProfileSetup) {
                navigation.replace('ProfileSetup');
            } else {
                navigation.replace('MainApp', {
                    isProvider: responseData.isProvider,
                    userId: responseData.userId
                });
            }

        } catch (error) {
            console.error('Login screen error:', error);
            // The `error.message` will contain whatever the server responded with.
             if (error.message.includes('verify your email')) {
                 Alert.alert('Email Not Verified', 'Please verify your email address before logging in.');
            } else if (error.message.toLowerCase().includes('invalid')) {
                Alert.alert('Login Failed', 'Invalid email or password.');
            } else {
                Alert.alert('Network Error', 'Unable to connect to the server. Please check your network connection.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.keyboardAvoidingContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
            >
                <Image source={require('../assets/GlucoBites.png')} style={styles.logo} />
                <Text style={styles.welcome}>Welcome to <Text style={styles.appName}>GlucoBites</Text></Text>

                <View style={styles.formContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholderTextColor="#888"
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        placeholderTextColor="#888"
                    />
                    {isLoading ? (
                        <ActivityIndicator size="large" color="#F97316" style={{ marginVertical: 18 }} />
                    ) : (
                        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                            <Text style={styles.loginText}>Login</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* The "Sign Up" text is replaced with a single "Forgot Password?" touchable */}
                <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                    <Text style={styles.signupLink}>
                        Forgot Password?
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    keyboardAvoidingContainer: {
        flex: 1,
    },
    container: {
        flexGrow: 1,
        backgroundColor: '#F8F8F8',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    logo: {
        width: 250,
        height: 250,
        resizeMode: 'contain',
        marginBottom: 10,
    },
    welcome: {
        fontSize: 18,
        color: '#333',
        marginBottom: 20,
        textAlign: 'center',
    },
    appName: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#000',
    },
    formContainer: {
        width: '100%',
        alignItems: 'center',
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
        color: '#000',
    },
    loginButton: {
        width: '100%',
        backgroundColor: '#F97316',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 5,
        // Adjusted marginBottom to create space for the forgot password link
        marginBottom: 25,
    },
    loginText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    // This style is now used by the new TouchableOpacity
    signupLink: {
        color: '#F97316',
        fontWeight: 'bold',
        fontSize: 14,
    },
});

export default Login;