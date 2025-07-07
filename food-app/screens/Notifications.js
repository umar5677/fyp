// screens/Notifications.js
import React, { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Animatable from 'react-native-animatable';

export default function NotificationsScreen({ navigation }) {
    const [notifications, setNotifications] = useState([]);

    useFocusEffect(
        useCallback(() => {
            const loadNotifications = async () => {
                const data = await AsyncStorage.getItem('notifications');
                if (data) setNotifications(JSON.parse(data));
            };
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
                            await AsyncStorage.removeItem('notifications');
                            setNotifications([]);
                        } catch (err) {
                            console.error("Failed to clear notifications:", err);
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
                        color={isAlert ? '#D32F2F' : '#007AFF'}
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
                    <Ionicons name="chevron-back" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>Notifications</Text>
                {notifications.length > 0 ? (
                    <TouchableOpacity onPress={clearNotifications}>
                        <Text style={styles.clearBtn}>Clear All</Text>
                    </TouchableOpacity>
                ) : <View style={{width: 40}} />}
            </View>
            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="notifications-off-outline" size={80} color="#CED4DA" />
                        <Text style={styles.emptyText}>You have no notifications</Text>
                        <Text style={styles.emptySubtext}>Alerts from your glucose logs will appear here.</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FCFCFC' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    backButton: { padding: 5 },
    title: { color: '#1E1E2D', fontSize: 20, fontWeight: 'bold' },
    clearBtn: { color: '#FF3B30', fontWeight: '600', fontSize: 16 },
    listContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
    notificationCard: { flexDirection: 'row', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#F0F0F0' },
    alertBackground: { backgroundColor: '#FFF5F5', borderColor: '#FFDAD1' },
    iconContainer: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 16, backgroundColor: '#E3F2FD' },
    alertIconContainer: { backgroundColor: '#FFDAD1' },
    notificationContent: { flex: 1 },
    message: { fontSize: 16, fontWeight: '500', color: '#1E1E2D', lineHeight: 22 },
    timestamp: { fontSize: 13, color: '#888', marginTop: 4 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: '40%' },
    emptyText: { marginTop: 16, color: '#333', fontSize: 18, fontWeight: '600' },
    emptySubtext: { marginTop: 8, color: '#888', fontSize: 14, textAlign: 'center' },
});