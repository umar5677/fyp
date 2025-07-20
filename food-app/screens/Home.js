// food-app/screens/Home.js
import React, { useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  FlatList, Dimensions, Animated, SafeAreaView, Platform, StatusBar,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage
import { api } from '../utils/api';

import SummaryCard from '../components/SummaryCard';
import PredictedGlucoseCard from '../components/PredictedGlucoseCard';
import MiniGlucoseChart from '../components/MiniGlucoseChart'; 
import CalorieBurnt from '../components/CalorieBurnt';

const { width } = Dimensions.get('window');

export default function Home() {
    const today = new Date();
    const todayString = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
    const navigation = useNavigation();

    const [userName, setUserName] = useState('User');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [hasUnread, setHasUnread] = useState(false); // New state for notification dot

    const scrollX = useRef(new Animated.Value(0)).current;
    const slidesCount = 2;
    const slideWidth = width - 40;

    const loadData = async () => {
        try {
            // Fetch profile and check notifications in parallel
            const [profileRes, notificationsData] = await Promise.all([
                api.getProfile(),
                AsyncStorage.getItem('notifications')
            ]);
            
            if (profileRes.user?.first_name) {
                setUserName(profileRes.user.first_name);
            }

            // Check if there are any notifications to show the dot
            if (notificationsData) {
                const notifications = JSON.parse(notificationsData);
                setHasUnread(notifications.length > 0);
            } else {
                setHasUnread(false);
            }

        } catch (error) {
            console.error("Failed to load home screen data:", error);
        }
    };
    
    // useFocusEffect will run every time the tab is focused
    useFocusEffect(useCallback(() => {
        loadData();
    }, []));

    const onRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await loadData();
        setIsRefreshing(false);
    }, []);

    const getGreeting = () => {
        const hour = today.getHours();
        if (hour < 12) return `Good Morning, ${userName}!`;
        if (hour < 18) return `Good Afternoon, ${userName}!`;
        return `Good Evening, ${userName}!`;
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <FlatList
                data={[]}
                keyExtractor={() => 'singleton'}
                renderItem={null}
                onRefresh={onRefresh}
                refreshing={isRefreshing}
                ListHeaderComponent={
                    <View style={styles.container}>
                        <View style={styles.header}>
                            <View>
                                <Text style={styles.greetingText}>{getGreeting()}</Text>
                                <Text style={styles.dateText}>Today, {todayString}</Text>
                            </View>
                            <TouchableOpacity style={styles.notificationButton} onPress={() => navigation.navigate('Notifications')}>
                                <Ionicons name="notifications-outline" size={26} color="#333" />
                                {hasUnread && <View style={styles.notificationDot} />}
                            </TouchableOpacity>
                        </View>
                        
                        <View>
                             <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                snapToInterval={slideWidth}
                                decelerationRate="fast"
                                contentContainerStyle={styles.swiperContainer}
                                onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
                                scrollEventThrottle={16}
                            >
                                <View style={styles.slide}><SummaryCard /></View>
                                <View style={styles.slide}><PredictedGlucoseCard /></View>
                            </ScrollView>

                            <View style={styles.dotsContainer}>
                                {[...Array(slidesCount)].map((_, i) => {
                                    const inputRange = [(i - 1) * slideWidth, i * slideWidth, (i + 1) * slideWidth];
                                    const scale = scrollX.interpolate({ inputRange, outputRange: [0.8, 1.4, 0.8], extrapolate: 'clamp' });
                                    const opacity = scrollX.interpolate({ inputRange, outputRange: [0.5, 1, 0.5], extrapolate: 'clamp' });
                                    return <Animated.View key={`dot-${i}`} style={[styles.dot, { opacity, transform: [{ scale }] }]} />;
                                })}
                            </View>
                        </View>
                        
                        <MiniGlucoseChart />
                        <CalorieBurnt />
                    </View>
                }
                contentContainerStyle={{ paddingBottom: 50 }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F4F6F8' },
    container: { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 10 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    greetingText: { fontSize: 22, fontWeight: 'bold', color: '#1E1E2D' },
    dateText: { fontSize: 14, color: '#667', marginTop: 4 },
    notificationButton: { padding: 8, backgroundColor: '#FFF', borderRadius: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
    notificationDot: {
        position: 'absolute',
        top: 6,
        right: 8,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FF3B30',
        borderWidth: 1,
        borderColor: '#FFF'
    },
    swiperContainer: { paddingVertical: 10 },
    slide: { width: width - 40, height: 250, paddingRight: 10 },
    dotsContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 0, marginBottom: 20 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#007AFF', marginHorizontal: 4 },
});