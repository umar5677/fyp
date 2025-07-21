import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Alert, StyleSheet,
  TouchableOpacity, ActivityIndicator, Platform, KeyboardAvoidingView
} from 'react-native';
import { api } from '../utils/api';
import { useTheme } from '../context/ThemeContext';

const getStyles = (colors) => StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: colors.background,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 8,
      marginLeft: 4,
    },
    input: {
      backgroundColor: colors.card,
      paddingHorizontal: 15,
      paddingVertical: Platform.OS === 'ios' ? 16 : 14,
      borderRadius: 12,
      fontSize: 16,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.text,
    },
    button: {
      marginTop: 30,
      backgroundColor: colors.primary,
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

export default function ChangePasswordScreen({ navigation }) {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      // Update navigation header style based on theme
      navigation.setOptions({
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
      });
    }, [colors, navigation]);

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
                placeholderTextColor={colors.textSecondary}
            />
            
            <Text style={styles.label}>New Password</Text>
            <TextInput
                style={styles.input}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Must be at least 8 characters"
                placeholderTextColor={colors.textSecondary}
            />
            
            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput
                style={styles.input}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your new password"
                placeholderTextColor={colors.textSecondary}
            />

            {loading ? (
                <ActivityIndicator size="large" color={colors.primary} style={{marginTop: 30}} />
            ) : (
                <TouchableOpacity onPress={handlePasswordChange} style={styles.button}>
                    <Text style={styles.buttonText}>Change Password</Text>
                </TouchableOpacity>
            )}
        </KeyboardAvoidingView>
    );
}