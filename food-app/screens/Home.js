import React, { useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  FlatList, Dimensions, Animated, SafeAreaView, Platform, StatusBar, TouchableOpacity,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../utils/api';
import { useTheme } from '../context/ThemeContext';

import SummaryCard from '../components/SummaryCard';
import PredictedGlucoseCard from '../components/PredictedGlucoseCard';
import MiniGlucoseChart from '../components/MiniGlucoseChart'; 
import CalorieBurnt from '../components/CalorieBurnt';
import ProviderAnswerCard from '../components/ProviderAnswerCard';
import AskProviderCard from '../components/AskProviderCard';

const { width } = Dimensions.get('window');

export default function Home({ route }) {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const navigation = useNavigation();
    
    const { isProvider, userId } = route.params || {};

    const [userName, setUserName] = useState('User');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);
    const [qnaCount, setQnaCount] = useState(0);
    const [isPremiumUser, setIsPremiumUser] = useState(false);
    const [summary, setSummary] = useState(null);
    const [isLoadingSummary, setIsLoadingSummary] = useState(true);

    const scrollX = useRef(new Animated.Value(0)).current;
    const slidesCount = 2;
    const slideWidth = width - 40;

    const loadData = useCallback(async () => {
        setIsLoadingSummary(true); // Control loading state from here
        try {
            const [profileRes, calorieRes, notificationsData, qnaRes] = await Promise.all([
                api.getProfile(),
                api.getHistory([1], 'day', new Date().toISOString()),
                AsyncStorage.getItem('notifications'),
                isProvider ? api.getProviderQuestions() : api.getQnaStatus(),
            ]);
            
            // Set user name
            if (profileRes.user?.first_name) {
                setUserName(profileRes.user.first_name);
            }

            // Set notifications
            if (notificationsData) {
                setHasUnread(JSON.parse(notificationsData).length > 0);
            } else {
                setHasUnread(false);
            }

            // Set Q&A related state
            if (isProvider) {
                setQnaCount(qnaRes.length);
            } else {
                setQnaCount(qnaRes.questions_remaining || 0);
                setIsPremiumUser(qnaRes.is_premium || false);
            }

            // Set summary card data
            const food = calorieRes.reduce((acc, log) => acc + (Number(log.amount) || 0), 0);
            const goal = profileRes.user?.calorieGoal || 2100;
            setSummary({
                goal: Math.round(goal),
                food: Math.round(food),
                exercise: 0,
            });

        } catch (error) {
            console.error("Failed to load home screen data:", error);
            // Provide a fallback state in case of error
            setSummary({ goal: 2100, food: 0, exercise: 0 });
            setIsPremiumUser(false);
        } finally {
            setIsLoadingSummary(false); // End loading
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
        const today = new Date();
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
                            </View>
                            <TouchableOpacity style={styles.notificationButton} onPress={() => navigation.navigate('Notifications')}>
                                <Ionicons name="notifications-outline" size={26} color={colors.icon} />
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
                                <View style={styles.slide}>
                                    <SummaryCard summary={summary} isLoading={isLoadingSummary} />
                                </View>
                                <View style={styles.slide}>
                                    <PredictedGlucoseCard isPremium={isPremiumUser} />
                                </View>
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
                        
                        {isProvider ? (
                            <ProviderAnswerCard 
                                pendingCount={qnaCount}
                                onNavigate={() => navigation.navigate('ProviderQuestionListScreen')}
                            />
                        ) : (
                            <AskProviderCard 
                                questionsRemaining={qnaCount}
                                isPremium={isPremiumUser}
                                onNavigate={() => navigation.navigate('AskQuestion')}
                            />
                        )}

                        <CalorieBurnt />
                    </View>
                }
                contentContainerStyle={{ paddingBottom: 50 }}
            />
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 10 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    greetingText: { fontSize: 22, fontWeight: 'bold', color: colors.text },
    notificationButton: { padding: 8, backgroundColor: colors.card, borderRadius: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
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
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginHorizontal: 4 },
});