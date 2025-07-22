// food-app/screens/Login.js
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ActivityIndicator, TouchableOpacity, Image, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const YOUR_AWS_LOGIN_API_URL = 'http://192.168.10.120:3000/api/login';

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

            if (responseData.code === 'EMAIL_NOT_VERIFIED') {
                Alert.alert('Email Not Verified', responseData.message);
            } else if (response.ok) {
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
                
            } else {
                Alert.alert('Login Failed', responseData.message || 'Invalid email or password.');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Network Error', 'Unable to connect to the server. Please check your network connection.');
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
                    />
                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                    {isLoading ? (
                        <ActivityIndicator size="large" color="#F97316" style={{ marginVertical: 18 }} />
                    ) : (
                        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                            <Text style={styles.loginText}>Login</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <Text style={styles.signupText}>
                    Don’t have an account?{' '}
                    <Text style={styles.signupLink} onPress={() => navigation.navigate('Signup')}>
                        Sign up
                    </Text>
                </Text>
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
    },
    loginButton: {
        width: '100%',
        backgroundColor: '#F97316',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 5, 
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
        color: '#F97316',
        fontWeight: 'bold' 
    },
});

export default Login;