import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import * as Animatable from 'react-native-animatable';

const BleDeviceCard = ({ status, onRetryScan }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    const getStatusInfo = () => {
        switch (status) {
            case 'Connected':
                return { color: '#4CAF50', text: 'Receiving live data from your device.', icon: 'bluetooth', showLoader: true, showButton: false, buttonText: '' };
            case 'Scanning...':
            case 'Initializing...':
                return { color: '#FF9800', text: 'Searching for your GlucoBites tracker...', icon: 'bluetooth-searching', showLoader: true, showButton: false, buttonText: '' };
            case 'Connecting...':
            case 'Discovering...':
                return { color: '#FF9800', text: 'Connecting to your device...', icon: 'bluetooth-connect', showLoader: true, showButton: false, buttonText: '' };
            case 'Disconnected':
            case 'Device Not Found':
            case 'Error Connecting':
            case 'Scan Error':
                 return { color: '#F44336', text: 'Device not found. Please ensure it is on and nearby.', icon: 'alert-circle-outline', showLoader: false, showButton: true, buttonText: 'Retry Scan' };
            case 'Permissions Disabled':
                 return { color: '#F44336', text: 'Bluetooth/Location permissions are required.', icon: 'alert-circle-outline', showLoader: false, showButton: true, buttonText: 'Grant Permissions & Scan' };
             case 'Bluetooth Off':
                 return { color: colors.textSecondary, text: 'Please turn on Bluetooth to connect.', icon: 'bluetooth-outline', showLoader: false, showButton: false, buttonText: '' };
            default:
                return { color: colors.textSecondary, text: 'Preparing to connect...', icon: 'bluetooth-outline', showLoader: false, showButton: false, buttonText: '' };
        }
    };

    const { color, text, icon, showLoader, showButton, buttonText } = getStatusInfo();

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <Ionicons name="watch-outline" size={24} color={colors.primary} />
                <Text style={styles.title}>Device Connection</Text>
            </View>

            <View style={styles.content}>
                {showLoader && status !== 'Connected' ? (
                    <ActivityIndicator size="small" color={color} style={styles.icon} />
                ) : (
                    <Animatable.View 
                        animation={status === 'Connected' ? "pulse" : undefined}
                        easing="ease-in-out" 
                        iterationCount="infinite"
                    >
                        <Ionicons name={icon} size={28} color={color} style={styles.icon} />
                    </Animatable.View>
                )}
                <Text style={[styles.statusText, { color }]}>{text}</Text>
            </View>

            {showButton && (
                <TouchableOpacity style={styles.button} onPress={onRetryScan}>
                    <Text style={styles.buttonText}>{buttonText}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const getStyles = (colors) => StyleSheet.create({
    card: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        marginVertical: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 5,
        borderWidth: 1,
        borderColor: colors.border,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
        paddingBottom: 12,
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 10,
        color: colors.text,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        marginBottom: 16,
    },
    icon: {
        marginRight: 12,
    },
    statusText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        lineHeight: 22,
    },
    button: {
        backgroundColor: colors.primary,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default BleDeviceCard;