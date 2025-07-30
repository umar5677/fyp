import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, Alert,
    TouchableOpacity, ActivityIndicator, Modal, FlatList,
    Platform,
    SafeAreaView
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showMessage } from "react-native-flash-message";
import * as Notifications from 'expo-notifications';

import { api } from '../utils/api';
import { useTheme } from '../context/ThemeContext';
import LogBloodSugarModal from '../components/LogBloodSugarModal';
import useDeviceSyncBLE from '../hooks/useDeviceSyncBLE'; 

const THRESHOLD_KEYS = ['lowThreshold', 'highFastingThreshold', 'highPostMealThreshold', 'veryHighThreshold'];

const STATUS_COLORS = {
    normal: '#4CAF50', high: '#FF9800', veryHigh: '#F44336', low: '#2196F3', default: '#6C757D',
};

const getBloodSugarStatus = (amount, tag, thresholds) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return { level: 'N/A', color: STATUS_COLORS.default, isAlert: false };
    if (numAmount >= thresholds.veryHighThreshold) return { level: 'Very High', color: STATUS_COLORS.veryHigh, isAlert: true };
    if (numAmount < thresholds.lowThreshold) return { level: 'Low', color: STATUS_COLORS.low, isAlert: true };
    const isFastingContext = tag === 'Fasting' || tag === 'Pre-Meal';
    if (isFastingContext) {
        if (numAmount >= thresholds.highFastingThreshold) return { level: 'High', color: STATUS_COLORS.high, isAlert: true };
        if (numAmount >= thresholds.lowThreshold) return { level: 'Normal', color: STATUS_COLORS.normal, isAlert: false };
    } else if (tag === 'Post-Meal') {
        if (numAmount >= thresholds.highPostMealThreshold) return { level: 'High', color: STATUS_COLORS.high, isAlert: true };
        if (numAmount >= thresholds.lowThreshold) return { level: 'Normal', color: STATUS_COLORS.normal, isAlert: false };
    }
    return { level: 'Check Tag', color: STATUS_COLORS.default, isAlert: false };
};


const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { 
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
        paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 20 : 10, paddingBottom: 5,
    },
    headerTitle: { fontSize: 32, fontWeight: 'bold', color: colors.text },
    doneButton: { padding: 5 },
    lastReadingCard: { 
        backgroundColor: colors.card, paddingVertical: 15, paddingHorizontal: 20,
        borderRadius: 16, marginHorizontal: 16, marginVertical: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, 
        shadowRadius: 5, elevation: 3, alignItems: 'center'
    },
    cardTitle: { fontSize: 16, fontWeight: '600', color: colors.textSecondary },
    lastReadingTag: { textTransform: 'uppercase', fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
    lastReadingValue: { fontSize: 42, fontWeight: 'bold', color: colors.text },
    lastReadingUnit: { fontSize: 22, fontWeight: '500', color: colors.textSecondary },
    lastReadingStatusContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    lastReadingDate: { marginTop: 10, fontSize: 14, color: colors.textSecondary, alignItems: 'center' },
    listTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginHorizontal: 16, marginTop: 12, marginBottom: 6 },
    controlsContainer: { paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    segmentedControlContainer: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: 10, overflow: 'hidden', marginTop: 12 },
    segment: { flex: 1, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
    segmentActive: { backgroundColor: colors.card, borderRadius: 8, margin: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 3 },
    segmentText: { fontWeight: '600', color: colors.textSecondary, fontSize: 14 },
    segmentTextActive: { color: '#42A5F5', fontWeight: 'bold' },
    dateNavigatorContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 5, marginBottom: 8 },
    arrowButton: { padding: 8 },
    dateNavigatorText: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    dateHeaderText: { fontSize: 15, fontWeight: 'bold', color: colors.text, marginHorizontal: 16, marginTop: 16, marginBottom: 4 },
    emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
    emptyText: { fontSize: 20, fontWeight: '600', color: '#ADB5BD', marginTop: 16 },
    emptySubtext: { fontSize: 15, color: '#CED4DA', marginTop: 8, textAlign: 'center' },
    logItemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, marginVertical: 6, marginHorizontal: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
    logItemIconContainer: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    logItemDataContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
    logItemValueText: { fontSize: 22, fontWeight: 'bold', color: colors.text },
    logItemUnitText: { fontSize: 14, color: colors.textSecondary },
    tagBadge: { backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    tagBadgeText: { color: '#1E88E5', fontWeight: '600', fontSize: 12 },
    logItemTimeText: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
    statusContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', marginTop: 4 },
    statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
    statusText: { fontSize: 14, fontWeight: '500' },
    calendarBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
    calendarModalContainer: { position: 'absolute', top: '25%', left: '5%', right: '5%', borderRadius: 16, elevation: 10, overflow: 'hidden'},
});

const LogItem = ({ item, onPress, index, thresholds, colors }) => {
  const styles = getStyles(colors);
  const date = new Date(item.date);
  const formattedTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const status = getBloodSugarStatus(item.amount, item.tag, thresholds);
  
  return (
    <Animatable.View animation="fadeInUp" duration={400} delay={index * 50}>
      <TouchableOpacity style={styles.logItemCard} onPress={onPress} activeOpacity={0.7}>
        <View style={[styles.logItemIconContainer, { backgroundColor: status.color }]}>
          <MaterialCommunityIcons name="diabetes" size={24} color="white" />
        </View>
        <View style={styles.logItemDataContainer}>
          <Text style={styles.logItemValueText}>{item.amount}</Text>
          <Text style={styles.logItemUnitText}>mg/dL</Text>
          {item.tag && <View style={styles.tagBadge}><Text style={styles.tagBadgeText}>{item.tag}</Text></View>}
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.level}</Text>
          </View>
        </View>
        <Text style={styles.logItemTimeText}>{formattedTime}</Text>
      </TouchableOpacity>
    </Animatable.View>
  );
};

const SegmentedControl = ({ options, selectedOption, onSelect, colors }) => {
    const styles = getStyles(colors);
    return (
        <View style={styles.segmentedControlContainer}>
            {options.map(option => (
                <TouchableOpacity key={option} style={[styles.segment, selectedOption === option && styles.segmentActive]} onPress={() => onSelect(option)}>
                    <Text style={[styles.segmentText, selectedOption === option && styles.segmentTextActive]}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
};

const DateNavigator = ({ date, onDateChange, period, onOpenCalendar, colors }) => {
    const styles = getStyles(colors);
    const changeDate = (amount) => {
        const newDate = new Date(date);
        if (period === 'day') newDate.setDate(newDate.getDate() + amount);
        else if (period === 'week') newDate.setDate(newDate.getDate() + (amount * 7));
        else if (period === 'month') newDate.setMonth(newDate.getMonth() + amount);
        onDateChange(newDate);
    };

    const formatDate = () => {
        if (period === 'day') return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
        if (period === 'week') {
            const start = new Date(date); start.setDate(date.getDate() - date.getDay());
            const end = new Date(start); end.setDate(start.getDate() + 6);
            return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }
        if (period === 'month') return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        return '';
    };

    return (
        <View style={styles.dateNavigatorContainer}>
            <TouchableOpacity onPress={() => changeDate(-1)} style={styles.arrowButton}>
                <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onOpenCalendar}>
                <Text style={styles.dateNavigatorText}>{formatDate()}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => changeDate(1)} style={styles.arrowButton}>
                <Ionicons name="chevron-forward" size={24} color={colors.text} />
            </TouchableOpacity>
        </View>
    );
};

const CalendarModal = ({ isVisible, onClose, onDayPress, initialDate, colors }) => {
    const styles = getStyles(colors);
    const today = new Date().toISOString().split('T')[0];
    const calendarTheme = {
        calendarBackground: colors.card,
        textSectionTitleColor: colors.textSecondary,
        dayTextColor: colors.text,
        todayTextColor: colors.primary,
        selectedDayBackgroundColor: colors.primary,
        selectedDayTextColor: '#FFFFFF',
        monthTextColor: colors.text,
        indicatorColor: colors.primary,
        arrowColor: colors.primary,
        'stylesheet.calendar.header': { week: { marginTop: 5, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border } }
    };
    return (
        <Modal visible={isVisible} transparent={true} animationType="fade">
            <TouchableOpacity style={styles.calendarBackdrop} onPress={onClose} />
            <View style={[styles.calendarModalContainer, { backgroundColor: colors.card }]}>
                <Calendar 
                    current={initialDate.toISOString().split('T')[0]} 
                    maxDate={today} 
                    onDayPress={(day) => { 
                        const newDate = new Date(day.timestamp); 
                        newDate.setMinutes(newDate.getMinutes() + newDate.getTimezoneOffset()); 
                        onDayPress(newDate); 
                        onClose(); 
                    }} 
                    theme={calendarTheme}
                />
            </View>
        </Modal>
    );
};

export default function LogBloodSugarScreen({ navigation }) {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const { getDeviceSyncData } = useDeviceSyncBLE();

    const [history, setHistory] = useState([]);
    const [lastReading, setLastReading] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingLastReading, setIsLoadingLastReading] = useState(true);
    const [selectedLog, setSelectedLog] = useState(null);
    const [timePeriod, setTimePeriod] = useState('day');
    const [displayDate, setDisplayDate] = useState(new Date());
    const [isCalendarVisible, setIsCalendarVisible] = useState(false);
    const [thresholds, setThresholds] = useState({
        lowThreshold: 70, highFastingThreshold: 100,
        highPostMealThreshold: 140, veryHighThreshold: 180
    });

    const loadDependencies = async () => {
        setIsLoading(true);
        setIsLoadingLastReading(true);
        try {
            const historyData = api.getHistory([3], timePeriod, displayDate.toISOString());
            const lastReadingData = api.getHistory([3], 'all', null, 1);
            const thresholdData = AsyncStorage.multiGet(THRESHOLD_KEYS);

            const [historyResult, lastReadingResult, thresholdResult] = await Promise.all([historyData, lastReadingData, thresholdData]);

            setHistory(historyResult);
            setLastReading(lastReadingResult.length > 0 ? lastReadingResult[0] : null);

            const loadedThresholds = { ...thresholds };
            thresholdResult.forEach(([key, value]) => {
                if (value !== null) loadedThresholds[key] = parseFloat(value);
            });
            setThresholds(loadedThresholds);
        } catch (error) {
            Alert.alert("Error", "Could not load screen data.");
            console.error(error);
        } finally {
            setIsLoading(false);
            setIsLoadingLastReading(false);
        }
    };

    useFocusEffect(useCallback(() => {
        loadDependencies();
    }, [timePeriod, displayDate]));

    const createPersistentAlert = async (status, amount) => {
    if (!status.isAlert) return; 

    try {
        const newNotification = { 
            message: `${status.level} Glucose Detected: ${amount} mg/dL`, 
            type: 'alert' 
        };

        await api.addNotification(newNotification);

        await Notifications.scheduleNotificationAsync({
            content: {
                title: "Abnormal Glucose Reading",
                body: newNotification.message,
            },
            trigger: null, // deliver immediately
        });
        
        const existingNotifications = await AsyncStorage.getItem('notifications');
        const notifications = existingNotifications ? JSON.parse(existingNotifications) : [];
        notifications.unshift({ ...newNotification, id: Date.now().toString() }); // Add a temp id for local use
        await AsyncStorage.setItem('notifications', JSON.stringify(notifications));

    } catch (error) { 
        console.error("Failed to create and save persistent alert:", error); 
    }
};
    
    const handleSave = async (logId, amount, date, tag) => {
        try {
            const status = getBloodSugarStatus(amount, tag, thresholds);
            
            if (logId) {
                await api.updateLog(logId, { amount, tag });
                showMessage({ message: "Log Updated", description: `Reading changed to ${amount} mg/dL.`, type: "info" });
            } else {
                await api.addLog({ amount, type: 3, date: date.toISOString(), tag });
                if (!status.isAlert) {
                     showMessage({ message: "Log Saved", description: `Your reading of ${amount} mg/dL is within normal range.`, type: "success", icon: "success" });
                }
            }
            await createPersistentAlert(status, amount);
        } catch (e) { Alert.alert('Error', 'An unexpected error occurred while saving.'); }
        loadDependencies();
    };
    
    const handleDelete = async (logId) => {
        try { await api.deleteLog(logId); }
        catch (e) { Alert.alert('Error', 'An unexpected error occurred while deleting.'); }
        loadDependencies();
    };

    const handleScan = async (imageUri) => {
        try {
            const manipulated = await manipulateAsync(imageUri, [{ resize: { width: 1080 } }], { compress: 0.9, format: SaveFormat.JPEG, base64: true });
            const result = await api.scanImage(manipulated.base64);
            const number = result.bloodsugar || result.number;
            if (number) {
                Alert.alert('Scan Successful', `Detected: ${number}`);
                return String(number);
            } else { Alert.alert('Scan Failed', result.message || 'Could not find a number.'); }
        } catch (error) { Alert.alert('Scan Error', 'An error occurred while scanning the image.'); }
        return null;
    };
    
    const handleHistoryPress = (item) => { 
        setSelectedLog(item);
    };

    const handleAddNew = (showModalCallback) => {
        setSelectedLog({});
        showModalCallback();
    };
    
    const handleSyncDevice = async () => {
        showMessage({ message: "Syncing with device...", type: "info", icon: "info" });
        try {
            const data = await getDeviceSyncData();
            
            showMessage({ message: "Sync successful, logging data...", type: "default", icon: "info", duration: 1500 });

            await Promise.all([
                api.addLog({
                    amount: data.glucose,
                    type: 3, 
                    date: data.date.toISOString(),
                    tag: data.tag
                }),
                api.addLog({
                    amount: data.calories,
                    type: 1, 
                    date: data.date.toISOString(),
                    foodName: `Synced Meal (${data.tag})` 
                })
            ]);
            
            const status = getBloodSugarStatus(data.glucose, data.tag, thresholds);
            await createPersistentAlert(status, data.glucose);

            showMessage({ message: "Logs Added Successfully!", type: "success", icon: "success" });
            loadDependencies();
            return data; 

        } catch (error) {
            Alert.alert("Sync Failed", error.message);
            return null;
        }
    };

    const clearSelectedLog = () => {
        setSelectedLog(null);
    };
    
    const renderLastReadingContent = () => {
        if (isLoadingLastReading) return <ActivityIndicator color={colors.primary} style={{ paddingVertical: 20 }}/>;
        if (lastReading) {
            const status = getBloodSugarStatus(lastReading.amount, lastReading.tag, thresholds);
            return (
                <>
                    {lastReading.tag && (<Text style={[styles.lastReadingTag, { color: status.color }]}>{lastReading.tag}</Text>)}
                    <Text style={styles.lastReadingValue}>{lastReading.amount}<Text style={styles.lastReadingUnit}> mg/dL</Text></Text>
                    <View style={styles.lastReadingStatusContainer}>
                        <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                        <Text style={[styles.statusText, { color: status.color, fontSize: 16, fontWeight: '600' }]}>{status.level}</Text>
                    </View>
                    <Text style={styles.lastReadingDate}>
                        <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />{' '}{new Date(lastReading.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                        <Text>{'  ·  '}</Text>
                        <Ionicons name="time-outline" size={14} color={colors.textSecondary} />{' '}{new Date(lastReading.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </>
            );
        }
        return <Text style={styles.emptySubtext}>No readings yet. Tap to add one!</Text>;
    };

    const renderLogListItem = ({ item, index }) => {
        const currentItemDate = new Date(item.date).toDateString();
        const prevItemDate = index > 0 ? new Date(history[index - 1].date).toDateString() : null;
        const showDateHeader = currentItemDate !== prevItemDate;
        return (
            <>
                {showDateHeader && (
                    <Animatable.View animation="fadeIn" duration={400}>
                        <Text style={styles.dateHeaderText}>{new Date(item.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
                    </Animatable.View>
                )}
                <LogItem item={item} onPress={() => handleHistoryPress(item)} index={index} thresholds={thresholds} colors={colors} />
            </>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <CalendarModal isVisible={isCalendarVisible} onClose={() => setIsCalendarVisible(false)} onDayPress={setDisplayDate} initialDate={displayDate} colors={colors}/>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Blood Sugar</Text>
                <TouchableOpacity style={styles.doneButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="close-circle" size={32} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.lastReadingCard} onPress={() => handleHistoryPress(lastReading || {})} disabled={isLoadingLastReading} activeOpacity={0.7}>
                <Text style={styles.cardTitle}>Last Reading</Text>
                {renderLastReadingContent()}
            </TouchableOpacity>
            <View style={styles.controlsContainer}>
                <DateNavigator date={displayDate} onDateChange={setDisplayDate} period={timePeriod} onOpenCalendar={() => setIsCalendarVisible(true)} colors={colors} />
                <SegmentedControl options={['day', 'week', 'month']} selectedOption={timePeriod} onSelect={(p) => { setTimePeriod(p); setDisplayDate(new Date()); }} colors={colors} />
            </View>
            <FlatList
                data={history}
                keyExtractor={(item) => item.logID.toString()}
                renderItem={renderLogListItem}
                ListHeaderComponent={<Text style={styles.listTitle}>History</Text>}
                ListEmptyComponent={
                    <Animatable.View animation="fadeIn" delay={300} style={styles.emptyContainer}>
                        {isLoading ? <ActivityIndicator color={colors.primary} /> : (
                            <><MaterialCommunityIcons name="clipboard-text-off-outline" size={60} color="#CED4DA" /><Text style={styles.emptyText}>Nothing Logged Yet</Text></>
                        )}
                    </Animatable.View>
                }
                contentContainerStyle={{ paddingBottom: 120 }}
                onRefresh={loadDependencies}
                refreshing={isLoading}
            />
            
            <LogBloodSugarModal 
                log={selectedLog}
                onSave={handleSave}
                onDelete={handleDelete}
                onScan={handleScan}
                onAddNew={handleAddNew}
                onSyncDevice={handleSyncDevice}
                clearSelectedLog={clearSelectedLog}
            />
        </SafeAreaView>
    );
};