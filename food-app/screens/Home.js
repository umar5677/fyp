// food-app/screens/Home.js
import React, { useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  FlatList, Dimensions, Animated, SafeAreaView, Platform, StatusBar, TouchableOpacity,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../utils/api';
import { useTheme } from '../context/ThemeContext';
import useCalorieBLE from '../hooks/useCalorieBLE';

// Import Components
import SummaryCard from '../components/SummaryCard';
import PredictedGlucoseCard from '../components/PredictedGlucoseCard';
import MiniGlucoseChart from '../components/MiniGlucoseChart';
import CalorieBurnt from '../components/CalorieBurnt';
import ProviderAnswerCard from '../components/ProviderAnswerCard';
import AskProviderCard from '../components/AskProviderCard';
import BleDeviceCard from '../components/BleDeviceCard';

const { width } = Dimensions.get('window');
const HEADER_SCROLL_DISTANCE = 70;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

export default function Home({ route }) {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const navigation = useNavigation();
    
    // States and Refs
    const { connectionStatus, startScan, disconnectDevice } = useCalorieBLE();
    const { isProvider } = route.params || {};
    const [userName, setUserName] = useState('User');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);
    const [qnaCount, setQnaCount] = useState(0);
    const [isPremiumUser, setIsPremiumUser] = useState(false);
    const [summary, setSummary] = useState(null);
    const [isLoadingSummary, setIsLoadingSummary] = useState(true);
    const [exerciseSummary, setExerciseSummary] = useState({ Day: [], Week: [], Month: [] });

    // Animation Values
    const scrollY = useRef(new Animated.Value(0)).current;
    const scrollX = useRef(new Animated.Value(0)).current;
    const slidesCount = 2;
    const slideWidth = width - 40;

    // Data Loading
    const loadData = useCallback(async () => {
        setIsLoadingSummary(true); 
        try {
            // --- FIX IS HERE: Define precise start and end of the current day ---
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);

            const [profileRes, calorieRes, notificationsData, qnaRes, exerciseRes] = await Promise.all([
                api.getProfile(),
                // Use the new start/end dates for the calorie history fetch
                api.getHistory([1], 'day', startOfDay.toISOString(), endOfDay.toISOString()),
                api.getNotifications(), 
                isProvider ? api.getProviderQuestions() : api.getQnaStatus(),
                api.getExerciseSummary() 
            ]);
            
            if (profileRes.user?.first_name) setUserName(profileRes.user.first_name);
            setHasUnread(notificationsData && notificationsData.length > 0);
            
            if (isProvider) {
                setQnaCount(qnaRes.length);
            } else {
                setQnaCount(qnaRes.questions_remaining || 0);
                setIsPremiumUser(qnaRes.is_premium || false);
            }
            
            setExerciseSummary(exerciseRes);
            const food = (calorieRes || []).reduce((acc, log) => acc + (Number(log.amount) || 0), 0);
            const goal = profileRes.user?.calorieGoal || 2100;
            
            setSummary({
                goal: Math.round(goal),
                food: Math.round(food),
            });
        } catch (error) {
            console.error("Failed to load home screen data:", error);
            setSummary({ goal: 2100, food: 0 });
            setIsPremiumUser(false);
        } finally {
            setIsLoadingSummary(false); 
        }
    }, [isProvider]);
    
    useFocusEffect(useCallback(() => {
        loadData();
    }, [loadData]));

    const onRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await loadData();
        setIsRefreshing(false);
    }, [loadData]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return `Good Morning, ${userName}!`;
        if (hour < 18) return `Good Afternoon, ${userName}!`;
        return `Good Evening, ${userName}!`;
    };
    
    // Animated Styles
    const stickyHeaderOpacity = scrollY.interpolate({
        inputRange: [0, HEADER_SCROLL_DISTANCE],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });
    const heroHeaderOpacity = scrollY.interpolate({
        inputRange: [0, HEADER_SCROLL_DISTANCE / 2],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle={colors.primary === '#F97316' ? 'dark-content' : 'light-content'} />
            
            <Animated.View style={[styles.stickyHeaderContainer, { opacity: stickyHeaderOpacity }]}>
                <View style={styles.stickyHeaderContent}>
                    <Text style={styles.stickyHeaderText}>{userName}</Text>
                    <TouchableOpacity style={styles.notificationButton} onPress={() => navigation.navigate('Notifications')}>
                        <Ionicons name="notifications-outline" size={24} color={colors.icon} />
                        {hasUnread && <View style={styles.notificationDot} />}
                    </TouchableOpacity>
                </View>
            </Animated.View>
            
            <AnimatedFlatList
                data={[{ key: 'content' }]}
                keyExtractor={item => item.key}
                onRefresh={onRefresh}
                refreshing={isRefreshing}
                scrollEventThrottle={16}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                ListHeaderComponent={
                    <View style={styles.container}>
                        <Animated.View style={[styles.header, { opacity: heroHeaderOpacity }]}>
                            <View>
                                <Text style={styles.greetingText}>{getGreeting()}</Text>
                            </View>
                            <TouchableOpacity style={styles.notificationButton} onPress={() => navigation.navigate('Notifications')}>
                                <Ionicons name="notifications-outline" size={26} color={colors.icon} />
                                {hasUnread && <View style={styles.notificationDot} />}
                            </TouchableOpacity>
                        </Animated.View>
                        
                        <ScrollView
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            snapToInterval={slideWidth + 10} 
                            decelerationRate="fast"
                            contentContainerStyle={styles.swiperContainer}
                            onScroll={Animated.event(
                                [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                                { useNativeDriver: false }
                            )}
                            scrollEventThrottle={16}
                        >
                            <View style={styles.slide}>
                                <SummaryCard summary={summary} isLoading={isLoadingSummary} onPress={() => navigation.navigate('LogCalorieSugarModal')} />
                            </View>
                            <View style={styles.slide}>
                                <PredictedGlucoseCard isPremium={isPremiumUser} />
                            </View>
                        </ScrollView>

                        <View style={styles.dotsContainer}>
                            {[...Array(slidesCount)].map((_, i) => {
                                const inputRange = [(i - 1) * (slideWidth + 10), i * (slideWidth + 10), (i + 1) * (slideWidth + 10)];
                                const scale = scrollX.interpolate({ inputRange, outputRange: [0.8, 1.4, 0.8], extrapolate: 'clamp' });
                                const opacity = scrollX.interpolate({ inputRange, outputRange: [0.5, 1, 0.5], extrapolate: 'clamp' });
                                return <Animated.View key={`dot-${i}`} style={[styles.dot, { opacity, transform: [{ scale }] }]} />;
                            })}
                        </View>
                        
                        <BleDeviceCard 
                            status={connectionStatus} 
                            onScanPress={startScan} 
                            onDisconnectPress={disconnectDevice} 
                        />
                        
                        <MiniGlucoseChart />
                        
                        {isProvider ? (
                            <ProviderAnswerCard 
                                pendingCount={qnaCount}
                                onNavigate={() => navigation.navigate('Dashboard', { screen: 'ProviderQuestionListScreen' })}
                            />
                        ) : (
                            <AskProviderCard 
                                questionsRemaining={qnaCount}
                                isPremium={isPremiumUser}
                                onNavigate={() => navigation.navigate('AskQuestion')}
                            />
                        )}

                        <CalorieBurnt calorieData={exerciseSummary} isLoading={isLoadingSummary} onRefresh={loadData} />
                    </View>
                }
                contentContainerStyle={{ paddingBottom: 50 }}
            />
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    stickyHeaderContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        backgroundColor: colors.card,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 5,
    },
    stickyHeaderContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        height: 60,
    },
    stickyHeaderText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    container: { paddingHorizontal: 20 },
    header: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 10,
        marginBottom: 10,
        minHeight: 60,
    },
    greetingText: { fontSize: 24, fontWeight: 'bold', color: colors.text, maxWidth: '85%' },
    notificationButton: { 
        padding: 8, 
        backgroundColor: colors.card, 
        borderRadius: 20, 
        elevation: 2, 
        shadowColor: '#000', 
        shadowOpacity: 0.1, 
        shadowRadius: 5,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border
    },
    notificationDot: {
        position: 'absolute',
        top: 6,
        right: 8,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FF3B30',
        borderWidth: 1,
        borderColor: colors.card
    },
    swiperContainer: { paddingVertical: 5 },
    slide: { width: width - 40, height: 250, paddingRight: 10, },
    dotsContainer: { flexDirection: 'row', justifyContent: 'center', marginVertical: 10 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginHorizontal: 4 },
});