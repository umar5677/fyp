// screens/ChangePassword.js
import React, { useState } from 'react';
import {
  View, Text, TextInput, Alert, StyleSheet,
  TouchableOpacity, ActivityIndicator, Platform
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native';
import { api } from '../utils/api';

export default function ChangePasswordScreen({ navigation }) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handlePasswordChange = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields.');
            return;
        }
        
        if (newPassword.length < 8) {
            Alert.alert('Password Too Short', 'Your new password must be at least 8 characters long.');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Error', 'New passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            await api.changePassword({
                currentPassword,
                newPassword,
            });

            Alert.alert('Success', 'Your password has been changed successfully.', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);

        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to change password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <Text style={styles.label}>Current Password</Text>
            <TextInput
                style={styles.input}
                secureTextEntry
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter your current password"
            />
            
            <Text style={styles.label}>New Password</Text>
            <TextInput
                style={styles.input}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Must be at least 8 characters"
            />
            
            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput
                style={styles.input}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your new password"
            />

            {loading ? (
                <ActivityIndicator size="large" color="#007AFF" style={{marginTop: 30}} />
            ) : (
                <TouchableOpacity onPress={handlePasswordChange} style={styles.button}>
                    <Text style={styles.buttonText}>Change Password</Text>
                </TouchableOpacity>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#F9FAFB',
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: '#374151',
      marginBottom: 8,
      marginLeft: 4,
    },
    input: {
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 15,
      paddingVertical: Platform.OS === 'ios' ? 16 : 14,
      borderRadius: 12,
      fontSize: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      color: '#111827',
    },
    button: {
      marginTop: 30,
      backgroundColor: '#007AFF',
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    buttonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 16,
    },
});