import React, { useState } from 'react';
import {
    View, Text, TextInput, StyleSheet, Alert, ActivityIndicator,
    TouchableOpacity, ScrollView, SafeAreaView,
    KeyboardAvoidingView, Platform
} from 'react-native';
import { api } from '../utils/api';
import { useTheme } from '../context/ThemeContext';

const ForgotPasswordScreen = ({ navigation }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState(1);

    const handleRequestReset = async () => {
        if (!email.trim().includes('@')) {
            Alert.alert('Invalid Email', 'Please enter a valid email address.');
            return;
        }
        setIsLoading(true);
        try {
            const response = await api.requestPasswordReset(email.trim());
            Alert.alert('Check Your Email', response.message);
            setStep(2);
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmReset = async () => {
        if (newPassword.length < 8) {
            Alert.alert('Password Too Short', 'New password must be at least 8 characters long.');
            return;
        }
        setIsLoading(true);
        try {
            const response = await api.confirmPasswordReset({
                email: email.trim(),
                code,
                newPassword
            });
            Alert.alert('Success!', response.message, [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardAvoidingContainer}
            >
                <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                    <Text style={styles.title}>Reset Password</Text>
                    
                    {step === 1 ? (
                        <View>
                            <Text style={styles.instructions}>Enter your account's email address to receive a password reset code.</Text>
                            <TextInput style={styles.input} placeholder="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={colors.textSecondary}/>
                            <TouchableOpacity style={styles.button} onPress={handleRequestReset} disabled={isLoading}>
                                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Reset Code</Text>}
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View>
                            <Text style={styles.instructions}>A reset code was sent to <Text style={{fontWeight: 'bold'}}>{email}</Text>. Enter the code and a new password below.</Text>
                             <TextInput style={styles.input} placeholder="6-Digit Code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} placeholderTextColor={colors.textSecondary}/>
                             <TextInput style={styles.input} placeholder="New Password (min. 8 characters)" value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholderTextColor={colors.textSecondary}/>
                            <TouchableOpacity style={styles.button} onPress={handleConfirmReset} disabled={isLoading}>
                                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Set New Password</Text>}
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setStep(1)}>
                                <Text style={styles.linkText}>Use a different email address</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const getStyles = (colors) => StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    keyboardAvoidingContainer: {
        flex: 1,
    },
    container: { flexGrow: 1, justifyContent: 'center', padding: 20 },
    title: { fontSize: 28, fontWeight: 'bold', color: colors.text, textAlign: 'center', marginBottom: 20 },
    instructions: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 30, lineHeight: 22 },
    input: {
      backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
      borderRadius: 10, padding: 15, fontSize: 16,
      color: colors.text, marginBottom: 15,
    },
    button: { backgroundColor: colors.primary, padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 10 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    linkText: { color: colors.primary, textAlign: 'center', marginTop: 25, fontWeight: '600' }
});

export default ForgotPasswordScreen;