// screens/Notifications.js
import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { api } from '../utils/api'; 
import { useTheme } from '../context/ThemeContext';

export default function NotificationsScreen({ navigation }) {
    const { colors } = useTheme(); 
    const styles = getStyles(colors);

    const [notifications, setNotifications] = useState([]);

    const loadNotifications = async () => {
        try {
            // Use the central api utility to fetch notifications
            const data = await api.getNotifications();
            setNotifications(data);
        } catch (err) {
            console.error("Error loading notifications:", err);
            Alert.alert("Error", "Could not load notifications from the server.");
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadNotifications();
        }, [])
    );

    const clearNotifications = async () => {
        Alert.alert(
            "Clear Notifications",
            "Are you sure you want to delete all notifications?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Clear All",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            // Use the central api utility to delete notifications
                            await api.clearNotifications();
                            setNotifications([]); // Clear the state on success
                        } catch (err) {
                            console.error("Failed to clear notifications:", err);
                            Alert.alert("Error", "Could not clear notifications.");
                        }
                    },
                },
            ]
        );
    };

    const renderItem = ({ item, index }) => {
        const isAlert = item.type === 'alert';
        return (
          <Animatable.View animation="fadeInUp" duration={400} delay={index * 50}>
            <View style={[styles.notificationCard, isAlert && styles.alertBackground]}>
                <View style={[styles.iconContainer, isAlert && styles.alertIconContainer]}>
                    <Ionicons
                        name={isAlert ? 'warning-outline' : 'notifications-outline'}
                        size={24}
                        color={isAlert ? '#D32F2F' : colors.primary}
                    />
                </View>
                <View style={styles.notificationContent}>
                    <Text style={styles.message}>{item.message}</Text>
                    <Text style={styles.timestamp}>
                        {new Date(item.timestamp).toLocaleString()}
                    </Text>
                </View>
            </View>
          </Animatable.View>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                 <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Notifications</Text>
                {notifications.length > 0 ? (
                    <TouchableOpacity onPress={clearNotifications}>
                        <Text style={styles.clearBtn}>Clear All</Text>
                    </TouchableOpacity>
                ) : <View style={{width: 60}} />}
            </View>
            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="notifications-off-outline" size={80} color={colors.textSecondary} />
                        <Text style={styles.emptyText}>You have no notifications</Text>
                        <Text style={styles.emptySubtext}>Alerts from your glucose logs and reminders will appear here.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const getStyles = (colors) => StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card },
    backButton: { padding: 5 },
    title: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
    clearBtn: { color: colors.logoutText, fontWeight: '600', fontSize: 16 },
    listContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
    notificationCard: { flexDirection: 'row', backgroundColor: colors.card, padding: 16, borderRadius: 12, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    alertBackground: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' },
    iconContainer: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 16, backgroundColor: 'rgba(0, 122, 255, 0.1)' },
    alertIconContainer: { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
    notificationContent: { flex: 1 },
    message: { fontSize: 16, fontWeight: '500', color: colors.text, lineHeight: 22 },
    timestamp: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: '40%' },
    emptyText: { marginTop: 16, color: colors.text, fontSize: 18, fontWeight: '600' },
    emptySubtext: { marginTop: 8, color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
});