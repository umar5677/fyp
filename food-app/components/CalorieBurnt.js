// fyp/food-app/components/CalorieBurnt.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { Calendar } from 'react-native-calendars';
import moment from 'moment';
import { LinearGradient } from 'expo-linear-gradient';

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
    const changeDate = (amount) => onDateChange(amount);
    const formatDate = () => {
        if (period === 'Day') return moment(date).format('ddd, MMM D, YYYY');
        if (period === 'Week') {
            const startOfWeek = moment(date).startOf('week').format('MMM D');
            const endOfWeek = moment(date).endOf('week').format('MMM D');
            return `${startOfWeek} - ${endOfWeek}, ${moment(date).format('YYYY')}`;
        }
        if (period === 'Month') return moment(date).format('MMMM YYYY');
        return '';
    };

    return (
        <View style={styles.dateNavigatorContainer}>
            <TouchableOpacity onPress={() => changeDate(-1)} style={styles.arrowButton}>
                <Ionicons name="chevron-back" size={26} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onOpenCalendar}><Text style={styles.dateNavigatorText}>{formatDate()}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => changeDate(1)} style={styles.arrowButton} disabled={isFutureDisabled}>
                <Ionicons name="chevron-forward" size={26} color={isFutureDisabled ? colors.border : colors.text} />
            </TouchableOpacity>
        </View>
    );
};

const CalendarModal = ({ isVisible, onClose, onDayPress, initialDate, colors }) => {
    const styles = getStyles(colors);
    const today = new Date().toISOString().split('T')[0];
    const calendarTheme = {
        calendarBackground: colors.card, textSectionTitleColor: colors.textSecondary, dayTextColor: colors.text,
        todayTextColor: colors.primary, selectedDayBackgroundColor: colors.primary, selectedDayTextColor: '#FFFFFF',
        monthTextColor: colors.text, indicatorColor: colors.primary, arrowColor: colors.primary,
        'stylesheet.calendar.header': { week: { marginTop: 5, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border } }
    };
    return (
        <Modal visible={isVisible} transparent={true} animationType="fade">
            <TouchableOpacity style={styles.calendarBackdrop} onPress={onClose} activeOpacity={1}>
                <View style={[styles.calendarModalContainer, { backgroundColor: colors.card }]}>
                    <Calendar current={moment(initialDate).format('YYYY-MM-DD')} maxDate={today}
                        onDayPress={(day) => {
                            const newDate = new Date(day.timestamp);
                            newDate.setMinutes(newDate.getMinutes() + newDate.getTimezoneOffset());
                            onDayPress(newDate);
                        }}
                        theme={calendarTheme} />
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

export default function CalorieBurnt({ calorieData, isLoading }) {
    const { colors, theme } = useTheme();
    const styles = getStyles(colors);

    // State for UI interactivity
    const [isExpanded, setIsExpanded] = useState(false);
    const [period, setPeriod] = useState('Day');
    const [displayDate, setDisplayDate] = useState(new Date());
    const [isCalendarVisible, setIsCalendarVisible] = useState(false);
    const [totalBurnt, setTotalBurnt] = useState(0);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);

    // Todays's total is always based on the 'Day' data from the API response
    const todaysTotal = (calorieData.Day && calorieData.Day.length > 0)
        ? calorieData.Day.find(d => d.date === moment().format('DD/MM/YYYY'))?.calories || 0
        : 0;
        
    const findTotalForPeriod = (currentPeriod, date, data) => {
        let foundCalories = 0;
        if (currentPeriod === 'Day') {
            const formattedDate = moment(date).format('DD/MM/YYYY');
            const dayData = data.Day.find(d => d.date === formattedDate);
            if (dayData) foundCalories = dayData.calories;
        } 
        else if (currentPeriod === 'Week') {
             const weekOfYear = `Week ${moment(date).isoWeek()}, ${moment(date).format('YYYY')}`;
            const weekData = data.Week.find(w => w.date === weekOfYear);
             if (weekData) foundCalories = weekData.calories;
        } 
        else if (currentPeriod === 'Month') {
            const formattedMonth = moment(date).format('MMMM YYYY');
            const monthData = data.Month.find(m => m.date === formattedMonth);
            if (monthData) foundCalories = monthData.calories;
        }
        return foundCalories;
    }

    // Effect to update the detailed total when dependencies change
    useEffect(() => {
        if (!isExpanded) return;
        setIsLoadingDetail(true);
        const newTotal = findTotalForPeriod(period, displayDate, calorieData);

        setTimeout(() => {
            setTotalBurnt(newTotal);
            setIsLoadingDetail(false);
        }, 300);

    }, [period, displayDate, isExpanded, calorieData]);
    
    const isFutureNavigationDisabled = moment(displayDate).endOf(period.toLowerCase()).isSameOrAfter(moment(), 'day');

    const changeDate = (amount) => {
        // Prevent moving forward if the next period is in the future
        if (amount > 0 && isFutureNavigationDisabled) {
            return; 
        }
        const newDate = moment(displayDate);
        if (period === 'Day') newDate.add(amount, 'days');
        else if (period === 'Week') newDate.add(amount, 'weeks');
        else if (period === 'Month') newDate.add(amount, 'months');
        setDisplayDate(newDate.toDate());
    };
    
    const onSelectPeriod = (newPeriod) => {
        setPeriod(newPeriod);
    };

    const onDaySelectFromCalendar = (date) => {
        setDisplayDate(date);
        setIsCalendarVisible(false);
    };

    const renderDetailedView = () => (
        <Animatable.View animation="fadeIn" duration={400} style={styles.detailsContainer}>
            <View style={styles.controlsContainer}>
                <DateNavigator 
                    date={displayDate} 
                    onDateChange={changeDate} 
                    period={period} 
                    onOpenCalendar={() => setIsCalendarVisible(true)} 
                    colors={colors}
                    isFutureDisabled={isFutureNavigationDisabled}
                />
                <SegmentedControl options={['Day', 'Week', 'Month']} selectedOption={period} onSelect={onSelectPeriod} colors={colors} />
            </View>
            <Animatable.View animation="pulse" duration={800}>
                <LinearGradient
                    colors={theme === 'dark' ? ['#2c1e10', '#1E293B'] : ['#FFF5EC', '#FFFFFF']}
                    style={styles.totalDisplayContainer}
                >
                    {isLoadingDetail ? (
                        <ActivityIndicator color={colors.primary} size="large" />
                    ) : (
                        <Animatable.View animation="fadeInUp" duration={500} key={`${totalBurnt}-${period}`} style={styles.centeredContent}>
                            <Text style={styles.totalDisplayText}>{Math.round(totalBurnt)}</Text>
                            <Text style={styles.totalDisplayLabel}>TOTAL CALORIES BURNT</Text>
                        </Animatable.View>
                    )}
                </LinearGradient>
            </Animatable.View>
        </Animatable.View>
    );

    return (
        <View style={styles.container}>
            <CalendarModal isVisible={isCalendarVisible} onClose={() => setIsCalendarVisible(false)} onDayPress={onDaySelectFromCalendar} initialDate={displayDate} colors={colors}/>
            <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} activeOpacity={0.8} style={styles.mainTouchable}>
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Ionicons name="flame-outline" size={24} color={colors.primary} />
                        <Text style={styles.title}>Calories Burnt</Text>
                    </View>
                    <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={22} color={colors.primary}/>
                </View>
                <View style={styles.content}>
                    {isLoading ? (
                        <ActivityIndicator color={colors.primary} size="large" />
                    ) : (
                        <Animatable.View animation="fadeIn" duration={600} style={styles.centeredContent}>
                            <Text style={styles.calorieValue}>{Math.round(todaysTotal)}</Text>
                            <Text style={styles.calorieLabel}>calories (Today)</Text>
                        </Animatable.View>
                    )}
                </View>
            </TouchableOpacity>
            {isExpanded && renderDetailedView()}
        </View>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: {
        backgroundColor: colors.card, borderRadius: 20, marginVertical: 10,
        shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 15, elevation: 6,
    },
    mainTouchable: { padding: 20, },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', },
    headerLeft: { flexDirection: 'row', alignItems: 'center', },
    title: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginLeft: 12, },
    content: { alignItems: 'center', justifyContent: 'center', marginTop: 20, minHeight: 80, },
    centeredContent: { alignItems: 'center', justifyContent: 'center', width: '100%' }, // Centering helper
    calorieValue: { fontSize: 48, fontWeight: 'bold', color: colors.primary, textAlign: 'center' },
    calorieLabel: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginTop: 2, fontWeight: '500' },
    // Detailed View
    detailsContainer: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 15, marginHorizontal: -20, paddingHorizontal: 20 },
    controlsContainer: { paddingBottom: 20 },
    segmentedControlContainer: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: 12, overflow: 'hidden', padding: 4 },
    segment: { flex: 1, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
    segmentActive: { backgroundColor: colors.card, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 3, },
    segmentText: { fontWeight: '600', color: colors.textSecondary, fontSize: 14 },
    segmentTextActive: { color: colors.primary, fontWeight: 'bold' },
    dateNavigatorContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 15 },
    arrowButton: { padding: 8, backgroundColor: colors.background, borderRadius: 16 },
    dateNavigatorText: { fontSize: 16, fontWeight: 'bold', color: colors.text },
    // Total Display
    totalDisplayContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 25, marginHorizontal: -4, borderRadius: 16, marginBottom: 10 },
    totalDisplayText: { fontSize: 44, fontWeight: 'bold', color: colors.primary, textAlign: 'center' },
    totalDisplayLabel: { color: colors.textSecondary, fontSize: 14, marginTop: 4, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' },
    // Calendar
    calendarBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    calendarModalContainer: { width: 350, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, overflow: 'hidden' },
});