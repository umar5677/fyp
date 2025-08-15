// screens/Leaderboard.js
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, TouchableOpacity, RefreshControl, Alert, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { useTheme } from '../context/ThemeContext';
import { api } from '../utils/api';
import { Calendar } from 'react-native-calendars';
import moment from 'moment';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar } from '../components/Avatar';

// Reusable Utility Components
const SegmentedControl = ({ selectedOption, onSelect, colors }) => {
    const styles = getStyles(colors);
    return (
        <View style={styles.segmentedControlContainer}>
            {['Day', 'Week', 'Month'].map(option => (
                <TouchableOpacity key={option} style={[styles.segment, selectedOption === option && styles.segmentActive]} onPress={() => onSelect(option)}>
                    <Text style={[styles.segmentText, selectedOption === option && styles.segmentTextActive]}>{option}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
};
const DateNavigator = ({ date, onDateChange, period, onOpenCalendar, colors, isFutureDisabled }) => {
    const styles = getStyles(colors);
    const formatDate = () => {
        if (period === 'Day') return moment(date).format('ddd, MMM D, YYYY');
        if (period === 'Week') { const start = moment(date).startOf('isoWeek').format('MMM D'); const end = moment(date).endOf('isoWeek').format('MMM D'); return `${start} - ${end}`; }
        if (period === 'Month') return moment(date).format('MMMM YYYY'); return '';
    };
    return (
        <View style={styles.dateNavigatorContainer}>
            <TouchableOpacity onPress={() => onDateChange(-1)} style={styles.arrowButton}><Ionicons name="chevron-back" size={26} color={colors.text} /></TouchableOpacity>
            <TouchableOpacity onPress={onOpenCalendar}><Text style={styles.dateNavigatorText}>{formatDate()}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => onDateChange(1)} style={styles.arrowButton} disabled={isFutureDisabled}><Ionicons name="chevron-forward" size={26} color={isFutureDisabled ? colors.border : colors.text} /></TouchableOpacity>
        </View>
    );
};
const CalendarModal = ({ isVisible, onClose, onDayPress, initialDate, colors }) => {
    const styles = getStyles(colors); const today = new Date().toISOString().split('T')[0];
    const calendarTheme = { calendarBackground: colors.card, textSectionTitleColor: colors.textSecondary, dayTextColor: colors.text, todayTextColor: colors.primary, selectedDayBackgroundColor: colors.primary, selectedDayTextColor: '#FFFFFF', monthTextColor: colors.text, indicatorColor: colors.primary, arrowColor: colors.primary, 'stylesheet.calendar.header': { week: { marginTop: 5, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border } } };
    return (<Modal visible={isVisible} transparent={true} animationType="fade"><TouchableOpacity style={styles.calendarBackdrop} onPress={onClose} activeOpacity={1}><View style={[styles.calendarModalContainer, { backgroundColor: colors.card }]}><Calendar current={moment(initialDate).format('YYYY-MM-DD')} maxDate={today} onDayPress={(day) => { const newDate = new Date(day.timestamp); newDate.setMinutes(newDate.getMinutes() + newDate.getTimezoneOffset()); onDayPress(newDate); }} theme={calendarTheme} /></View></TouchableOpacity></Modal>);
};


// UI Components
const PodiumItem = ({ user, rank, delay }) => {
    const { colors } = useTheme(); const styles = getStyles(colors);
    const size = rank === 1 ? 90 : 70;
    const medalIcon = rank === 1 ? 'crown' : rank === 2 ? 'medal' : 'trophy';
    const medalColor = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : '#CD7F32';
    return (
        <Animatable.View animation="bounceIn" duration={800} delay={delay} style={[styles.podiumItem, { marginTop: rank === 1 ? 0 : 20 }]}>
            <View style={styles.podiumAvatarContainer}>
                <Avatar source={user.avatar} name={user.name} size={size} />
                <MaterialCommunityIcons name={medalIcon} size={30} color={medalColor} style={styles.podiumMedal} />
            </View>
            <Text style={styles.podiumName} numberOfLines={1}>{user.name}</Text>
            <Text style={styles.podiumCalories}>{user.calories} kcal</Text>
        </Animatable.View>
    );
};

const Podium = ({ topThree }) => {
    const styles = getStyles({}).podiumContainer;
    const rank2 = topThree.find((u, i) => i === 1);
    const rank1 = topThree.find((u, i) => i === 0);
    const rank3 = topThree.find((u, i) => i === 2);
    return (
        <View style={styles}>
            {rank2 && <PodiumItem user={rank2} rank={2} delay={200} />}
            {rank1 && <PodiumItem user={rank1} rank={1} delay={100} />}
            {rank3 && <PodiumItem user={rank3} rank={3} delay={300} />}
        </View>
    );
};

const UserRankCard = ({ user, rank, colors }) => {
    const styles = getStyles(colors);
    return (
        <Animatable.View animation="fadeInUp" duration={500} delay={500} style={styles.userRankCard}>
            <Text style={styles.userRankText}>{rank > 0 ? rank : '--'}</Text>
            <View style={styles.avatarWrapper}>
                {/* Use the user's name for the Avatar fallback */}
                <Avatar source={user.avatar} name={user.name} size={48} />
            </View>
            {/* Display the user's actual name */}
            <Text style={styles.name} numberOfLines={1}>{user.name}</Text>
            <View style={styles.caloriesBox}><Text style={styles.caloriesText}>{user.calories || 0} kcal</Text></View>
        </Animatable.View>
    );
}

const LeaderboardItem = ({ item, rank, currentUserID, colors }) => {
    const styles = getStyles(colors);
    return (
        <View style={styles.listItem}>
            <View style={styles.rankCol}><Text style={styles.rankText}>{rank}</Text></View>
            <View style={styles.avatarWrapper}>
                <Avatar source={item.avatar} name={item.name} size={48} />
            </View>
            {/* The logic to check for the current user is now removed from here */}
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            <View style={styles.caloriesBox}><Text style={styles.caloriesText}>{item.calories} kcal</Text></View>
        </View>
    );
};

export default function LeaderboardScreen() {
    const { colors, theme } = useTheme(); const styles = getStyles(colors); const insets = useSafeAreaInsets();
    const [users, setUsers] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [period, setPeriod] = useState('Day');
    const [displayDate, setDisplayDate] = useState(new Date());
    const [isCalendarVisible, setIsCalendarVisible] = useState(false);

    const fetchLeaderboard = useCallback(async (fetchPeriod, fetchDate) => {
        if (!isRefreshing) setIsLoading(true);
        try {
            const [profileRes, leaderboardUsers] = await Promise.all([
                api.getProfile(),
                api.getLeaderboard(fetchPeriod, fetchDate)
            ]);
            setCurrentUser(profileRes.user); setUsers(leaderboardUsers);
        } catch (error) { console.error('Error fetching leaderboard data:', error); Alert.alert("Error", "Could not load leaderboard data.");
        } finally { setIsLoading(false); setIsRefreshing(false); }
    }, [isRefreshing]);

    useFocusEffect(useCallback(() => { fetchLeaderboard(period, displayDate); }, [period, displayDate]));
    
    const onRefresh = useCallback(() => {
        setIsRefreshing(true);
    }, []);
    
    const isFutureNavigationDisabled = moment(displayDate).endOf(period.toLowerCase()).isSameOrAfter(moment(), 'day');
    
    const changeDate = (amount) => {
        if (amount > 0 && isFutureNavigationDisabled) return;
        const newDate = moment(displayDate);
        if (period === 'Day') newDate.add(amount, 'days'); else if (period === 'Week') newDate.add(amount, 'weeks'); else if (period === 'Month') newDate.add(amount, 'months');
        setDisplayDate(newDate.toDate());
    };
    
    const onDaySelectFromCalendar = (date) => { setDisplayDate(date); setIsCalendarVisible(false); };
    
    const topThree = users.slice(0, 3);
    // Find the current user's data within the leaderboard list.
    const currentUserInList = users.find(u => u.userID === currentUser?.userID);
    const currentUserRank = currentUserInList ? users.findIndex(u => u.userID === currentUser?.userID) + 1 : 0;
    
    // Create the data for the user's own rank card. Use their profile data as a fallback.
    const currentUserDataForCard = currentUserInList || { 
        avatar: currentUser?.pfpUrl, 
        name: `${currentUser?.first_name || ''} ${currentUser?.last_name || ''}`.trim(), 
        calories: 0 
    };

    // Filter out the current user from the main list if they appear outside the top 3.
    const remainingUsers = users.slice(3).filter(u => u.userID !== currentUser?.userID);
    
    return (
        <SafeAreaView style={styles.container}>
            <CalendarModal isVisible={isCalendarVisible} onClose={() => setIsCalendarVisible(false)} onDayPress={onDaySelectFromCalendar} initialDate={displayDate} colors={colors} />
            
            <FlatList
                data={remainingUsers}
                keyExtractor={(item) => item.userID.toString()}
                renderItem={({ item, index }) => <LeaderboardItem item={item} rank={index + 4} currentUserID={currentUser?.userID} colors={colors}/>}
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                ListHeaderComponent={
                    <>
                        <LinearGradient colors={theme === 'dark' ? ['#1E293B', '#111827'] : [colors.primary, '#F9A825']} style={[styles.header, { paddingTop: insets.top }]}>
                            <Text style={styles.headerTitle}>🏆 Leaderboard</Text>
                            <DateNavigator date={displayDate} onDateChange={changeDate} period={period} onOpenCalendar={() => setIsCalendarVisible(true)} colors={{ ...colors, text: '#FFF', border: 'rgba(255,255,255,0.3)' }} isFutureDisabled={isFutureNavigationDisabled} />
                            <SegmentedControl options={['Day', 'Week', 'Month']} selectedOption={period} onSelect={setPeriod} colors={{ ...colors, background: 'rgba(0,0,0,0.2)', card: '#fff', textSecondary: '#FDE68A', primary: '#1E293B' }} />
                        </LinearGradient>

                        {isLoading && !isRefreshing ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={colors.primary} />
                            </View>
                        ) : users.length > 0 ? (
                            <>
                                <Podium topThree={topThree} />
                                <View style={styles.listContainer}>
                                    <UserRankCard user={currentUserDataForCard} rank={currentUserRank} colors={colors} />
                                    {remainingUsers.length > 0 && <Text style={styles.listTitle}>All Rankings</Text>}
                                </View>
                            </>
                        ) : (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="trophy-outline" size={60} color={colors.textSecondary} />
                                <Text style={styles.emptyText}>No rankings found.</Text>
                                <Text style={styles.emptySubText}>There is no exercise data logged for this period.</Text>
                            </View>
                        )}
                    </>
                }
            />
        </SafeAreaView>
    );
}

// Styles
const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
    header: { paddingBottom: 20 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFF', textAlign: 'center', marginVertical: 10, textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 2 },
    segmentedControlContainer: { flexDirection: 'row', borderRadius: 12, overflow: 'hidden', padding: 4, marginHorizontal: 16 },
    segment: { flex: 1, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
    segmentActive: { backgroundColor: '#fff', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5 },
    segmentText: { fontWeight: '600', color: '#FDE68A', fontSize: 14 },
    segmentTextActive: { color: '#1E293B', fontWeight: 'bold' },
    dateNavigatorContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 10, paddingHorizontal: 16 },
    arrowButton: { padding: 8, borderRadius: 16 },
    dateNavigatorText: { fontSize: 16, fontWeight: 'bold', color: '#FFF' },
    podiumContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', paddingHorizontal: 16, marginTop: -30, marginBottom: 20, },
    podiumItem: { alignItems: 'center', flex: 1 },
    podiumAvatarContainer: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4, },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 10,
        backgroundColor: colors.card,
        borderRadius: 90, // Large enough to cover the biggest avatar
    },
    podiumMedal: { position: 'absolute', bottom: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 15, padding: 2 },
    podiumName: { fontWeight: 'bold', color: colors.text, marginTop: 8, fontSize: 14, textAlign: 'center' },
    podiumCalories: { color: colors.primary, fontWeight: 'bold', fontSize: 13, marginTop: 2 },
    listContainer: { paddingHorizontal: 16 },
    listTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginTop: 16, marginBottom: 8 },
    userRankCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, padding: 12, marginVertical: 6, borderWidth: 1, borderColor: colors.primary },
    userRankText: { fontSize: 16, fontWeight: 'bold', color: colors.text, width: 40, textAlign: 'center' },
    listItem: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: colors.card, borderRadius: 12, marginVertical: 6 },
    rankCol: { width: 40, alignItems: 'center' },
    rankText: { fontSize: 16, fontWeight: 'bold', color: colors.textSecondary },
    avatarWrapper: { marginHorizontal: 12, },
    name: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text, },
    caloriesBox: { backgroundColor: colors.background, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    caloriesText: { fontWeight: 'bold', color: colors.text, fontSize: 14 },
    emptyContainer: { alignItems: 'center', paddingTop: '20%', paddingHorizontal: 20 },
    emptyText: { marginTop: 16, color: colors.text, fontSize: 18, fontWeight: '600' },
    emptySubText: { marginTop: 8, color: colors.textSecondary, textAlign: 'center' },
    calendarBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    calendarModalContainer: { width: 350, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, overflow: 'hidden' },
});