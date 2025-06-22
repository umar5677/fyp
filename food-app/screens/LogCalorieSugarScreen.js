// screens/LogCalorieSugarScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, FlatList, Modal, ActivityIndicator, SafeAreaView, useColorScheme
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Calendar } from 'react-native-calendars';

import { api } from '../utils/api';

// --- Reusable Components (Defined at the top level for stability) ---
const SegmentedControl = ({ options, selectedOption, onSelect }) => {
    return (
        <View style={styles.segmentedControlContainer}>
            {options.map(option => (
                <TouchableOpacity
                    key={option}
                    style={[styles.segment, selectedOption === option && styles.segmentActive]}
                    onPress={() => onSelect(option)}
                >
                    <Text style={[styles.segmentText, selectedOption === option && styles.segmentTextActive]}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
};

const DateNavigator = ({ date, onDateChange, period, onOpenCalendar }) => {
    const changeDate = (amount) => {
        const newDate = new Date(date);
        if (period === 'day') newDate.setDate(newDate.getDate() + amount);
        else if (period === 'week') newDate.setDate(newDate.getDate() + (amount * 7));
        else if (period === 'month') newDate.setMonth(newDate.getMonth() + amount);
        onDateChange(newDate);
    };

    const formatDate = () => {
        if (period === 'day') return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        if (period === 'week') {
            const start = new Date(date);
            start.setDate(date.getDate() - date.getDay());
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            return `${start.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} - ${end.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}`;
        }
        if (period === 'month') return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        return '';
    };

    return (
        <View style={styles.dateNavigatorContainer}>
            <TouchableOpacity onPress={() => changeDate(-1)} style={styles.arrowButton}><Ionicons name="chevron-back" size={24} color="#007AFF" /></TouchableOpacity>
            <TouchableOpacity onPress={onOpenCalendar}><Text style={styles.dateNavigatorText}>{formatDate()}</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => changeDate(1)} style={styles.arrowButton}><Ionicons name="chevron-forward" size={24} color="#007AFF" /></TouchableOpacity>
        </View>
    );
};

const CalendarModal = ({ isVisible, onClose, onDayPress, initialDate }) => {
    // --- THIS IS PART OF THE FIX ---
    const today = new Date().toISOString().split('T')[0]; // Get today's date for maxDate

    return (
        <Modal visible={isVisible} transparent={true} animationType="fade">
            <TouchableOpacity style={styles.calendarBackdrop} onPress={onClose} />
            <View style={styles.calendarModalContainer}>
                <Calendar
                    current={initialDate.toISOString().split('T')[0]}
                    maxDate={today} // Prevent selecting future dates
                    onDayPress={(day) => {
                        const selectedDate = new Date(day.year, day.month - 1, day.day);
                        onDayPress(selectedDate);
                        onClose();
                    }}
                    monthFormat={'MMMM yyyy'}
                    // --- APPLYING CONSISTENT THEME ---
                    theme={{
                        backgroundColor: '#ffffff',
                        calendarBackground: '#ffffff',
                        textSectionTitleColor: '#2d4150',
                        monthTextColor: '#111111',
                        textMonthFontWeight: 'bold',
                        dayTextColor: '#111111',
                        textDayFontWeight: '500',
                        selectedDayBackgroundColor: '#007AFF',
                        selectedDayTextColor: '#ffffff',
                        todayTextColor: '#007AFF',
                        arrowColor: '#007AFF',
                        textDisabledColor: '#d9e1e8'
                    }}
                />
            </View>
        </Modal>
    );
};

const EditCalorieSugarModal = ({ modalVisible, setModalVisible, logs, onSave, onScan }) => {
    const [calories, setCalories] = useState('');
    const [sugar, setSugar] = useState('');
    const [logDate, setLogDate] = useState(new Date()); 
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isScanning, setIsScanning] = useState(false);

    // --- THIS IS PART OF THE FIX ---
    const colorScheme = useColorScheme();
    const today = new Date();

    useEffect(() => {
        if (modalVisible && logs) {
            const calorieLog = logs.find(l => l.type === 1);
            const sugarLog = logs.find(l => l.type === 2);
            setCalories(calorieLog?.amount?.toString() || '');
            setSugar(sugarLog?.amount?.toString() || '');
            setLogDate(logs.length > 0 ? new Date(logs[0].date) : new Date());
        }
    }, [logs, modalVisible]);

    if (!logs) {
        return null;
    }

    const handleSave = async () => {
        setIsSaving(true);
        await onSave(logs, { calories, sugar }, logDate);
        setIsSaving(false);
        setModalVisible(false);
    };

    const handlePickImage = async (type) => {
        const permissions = type === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissions.granted) { Alert.alert('Permission Denied'); return; }

        const pickerResult = type === 'camera' ? await ImagePicker.launchCameraAsync() : await ImagePicker.launchImageLibraryAsync();
        if (pickerResult.canceled || !pickerResult.assets?.length) return;

        setIsScanning(true);
        const scanResult = await onScan(pickerResult.assets[0].uri);
        setIsScanning(false);
        
        if (scanResult) {
            if (scanResult.calories !== null) setCalories(scanResult.calories.toString());
            if (scanResult.sugar !== null) setSugar(scanResult.sugar.toString());
        }
    };

    return (
        <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                <TouchableOpacity style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>{logs.length > 0 ? "Edit Log" : "Log Calories & Sugar"}</Text>
                    
                    <TouchableOpacity onPress={() => setDatePickerVisibility(true)} style={styles.datePickerButton} disabled={logs.length > 0}>
                        <Ionicons name="calendar-outline" size={20} color="#333" />
                        <Text style={styles.datePickerText}>{logDate.toLocaleString()}</Text>
                    </TouchableOpacity>
                    {/* --- THIS IS THE FIX --- */}
                    <DateTimePickerModal
                        isVisible={isDatePickerVisible}
                        mode="datetime"
                        date={logDate}
                        onConfirm={(date) => { setDatePickerVisibility(false); setLogDate(date); }}
                        onCancel={() => setDatePickerVisibility(false)}
                        maximumDate={today} // Prevent future date selection
                        isDarkModeEnabled={colorScheme === 'light'} // Handle dark mode
                        display={Platform.OS === 'ios' ? 'inline' : 'default'} 
                    />
                    
                    <TextInput style={styles.modalInput} keyboardType="decimal-pad" value={calories} onChangeText={setCalories} placeholder="Calories (kcal)" placeholderTextColor="#999" />
                    <TextInput style={styles.modalInput} keyboardType="decimal-pad" value={sugar} onChangeText={setSugar} placeholder="Sugar (g)" placeholderTextColor="#999" />
                    
                    {isScanning ? <ActivityIndicator style={styles.spinner} /> : (
                        <View style={styles.scanButtonsContainer}>
                            <TouchableOpacity style={styles.scanButton} onPress={() => handlePickImage('camera')}><Ionicons name="camera-outline" size={20} color="#fff" /><Text style={styles.scanButtonText}>Scan</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.scanButton} onPress={() => handlePickImage('gallery')}><Ionicons name="image-outline" size={20} color="#fff" /><Text style={styles.scanButtonText}>Upload</Text></TouchableOpacity>
                        </View>
                    )}

                    <View style={styles.modalActions}>
                        <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.modalButtonText}>Cancel</Text></TouchableOpacity>
                        <TouchableOpacity onPress={handleSave} disabled={isSaving}><Text style={[styles.modalButtonText, { fontWeight: 'bold' }]}>Save</Text></TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};


// --- Main Screen Component ---
export default function LogCalorieSugarScreen({ navigation }) {
    const [history, setHistory] = useState([]);
    const [groupedHistory, setGroupedHistory] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingLogs, setEditingLogs] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [timePeriod, setTimePeriod] = useState('day');
    const [displayDate, setDisplayDate] = useState(new Date());
    const [isCalendarVisible, setIsCalendarVisible] = useState(false);

    const loadData = async (period, date) => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            const data = await api.getHistory([1, 2], period, date.toISOString());
            setHistory(data);
            
            const tempGroups = {};
            const timeThreshold = 300000;
            data.forEach(log => {
                const logTime = new Date(log.date).getTime();
                let foundGroupKey = Object.keys(tempGroups).find(key => Math.abs(logTime - Number(key)) < timeThreshold);
                if (foundGroupKey) {
                    tempGroups[foundGroupKey].push(log);
                } else {
                    tempGroups[logTime] = [log];
                }
            });
            const finalGrouped = Object.values(tempGroups).map(logs => ({
                timestamp: logs[0].date, logs: logs.sort((a, b) => a.type - b.type),
            })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            setGroupedHistory(finalGrouped);
        } catch (err) {
            Alert.alert('Error', 'Failed to load history.');
        } finally {
            setIsLoading(false);
        }
    };

    useFocusEffect(useCallback(() => {
        loadData(timePeriod, displayDate);
    }, [timePeriod, displayDate]));

    const handleScan = async (imageUri) => {
        try {
            const manipulated = await manipulateAsync(imageUri, [{ resize: { width: 1080 } }], { compress: 0.8, format: SaveFormat.JPEG, base64: true });
            const result = await api.scanImage(manipulated.base64);
            if (result.success && (result.calories !== null || result.sugar !== null)) {
                Alert.alert('Scan Successful', `Found: ${result.calories || 'No'} calories, ${result.sugar || 'no'} sugar.`);
                return { calories: result.calories, sugar: result.sugar };
            } else {
                Alert.alert('Scan Failed', result.message || 'Could not find calorie or sugar values.');
                return null;
            }
        } catch (error) {
            Alert.alert('Scan Error', 'An error occurred while scanning the image.');
            return null;
        }
    };

    const handleSave = async (logsToEdit, newValues, logDate) => {
        try {
            const hasCalories = newValues.calories && !isNaN(parseFloat(newValues.calories));
            const hasSugar = newValues.sugar && !isNaN(parseFloat(newValues.sugar));
            if (logsToEdit && logsToEdit.length > 0) {
                const calLog = logsToEdit.find(l => l.type === 1);
                const sugLog = logsToEdit.find(l => l.type === 2);
                if (calLog && hasCalories) await api.updateLog(calLog.logID, parseFloat(newValues.calories));
                if (sugLog && hasSugar) await api.updateLog(sugLog.logID, parseFloat(newValues.sugar));
            } else {
                const date = logDate.toISOString();
                if (hasCalories) await api.addLog({ amount: parseFloat(newValues.calories), type: 1, date });
                if (hasSugar) await api.addLog({ amount: parseFloat(newValues.sugar), type: 2, date });
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to save log.');
        } finally {
            loadData(timePeriod, displayDate);
        }
    };

    const handleDeleteGroup = async (logs) => {
        Alert.alert('Confirm Delete', 'Are you sure you want to delete this log entry?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        for (const log of logs) { await api.deleteLog(log.logID); }
                        loadData(timePeriod, displayDate);
                    } catch { Alert.alert('Error', 'Failed to delete log entry.'); }
                }
            }
        ]);
    };

    const handleEditGroup = (logs) => {
        setEditingLogs(logs);
        setModalVisible(true);
    };

    const handleAddNew = () => {
        setEditingLogs([]);
        setModalVisible(true);
    };
    
    const totalCalories = history.filter(l => l.type === 1).reduce((sum, l) => sum + Number(l.amount || 0), 0);
    const totalSugar = history.filter(l => l.type === 2).reduce((sum, l) => sum + Number(l.amount || 0), 0);

    return (
        <SafeAreaView style={styles.container}>
            <EditCalorieSugarModal
                modalVisible={modalVisible}
                setModalVisible={setModalVisible}
                logs={editingLogs}
                onSave={handleSave}
                onScan={handleScan}
            />
            <CalendarModal
                isVisible={isCalendarVisible}
                onClose={() => setIsCalendarVisible(false)}
                onDayPress={setDisplayDate}
                initialDate={displayDate}
            />
            
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Calorie & Sugar</Text>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.doneButton}>Done</Text>
                </TouchableOpacity>
            </View>
            
            <View style={styles.summaryBox}>
                <Text style={styles.summaryText}>{timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)}'s Total</Text>
                <Text style={styles.summaryReading}>🔥 {totalCalories.toFixed(0)} kcal    🍬 {totalSugar.toFixed(1)} g</Text>
            </View>

            <View style={styles.historyContainer}>
                <SegmentedControl
                    options={['day', 'week', 'month']}
                    selectedOption={timePeriod}
                    onSelect={(period) => { setTimePeriod(period); setDisplayDate(new Date()); }}
                />
                <DateNavigator
                    date={displayDate}
                    onDateChange={setDisplayDate}
                    period={timePeriod}
                    onOpenCalendar={() => setIsCalendarVisible(true)}
                />
                {isLoading ? <ActivityIndicator size="large" style={styles.spinner} /> :
                    <FlatList
                        data={groupedHistory}
                        keyExtractor={(item) => item.timestamp}
                        renderItem={({ item }) => {
                            const calorieLog = item.logs.find(l => l.type === 1);
                            const sugarLog = item.logs.find(l => l.type === 2);
                            return (
                                <View style={styles.historyItem}>
                                    <Text style={styles.historyDate}>{new Date(item.timestamp).toLocaleString()}</Text>
                                    <View style={styles.logDataRow}>
                                        <View style={{flex: 1}}>
                                            {calorieLog && <View style={styles.logRow}><Text style={styles.historyLabel}>🔥 Calories:</Text><Text style={styles.historyValue}>{parseFloat(calorieLog.amount || 0).toFixed(0)} kcal</Text></View>}
                                            {sugarLog && <View style={styles.logRow}><Text style={styles.historyLabel}>🍬 Sugar:</Text><Text style={[styles.historyValue, parseFloat(sugarLog.amount) > 15 ? { color: '#D9534F' } : {}]}>{parseFloat(sugarLog.amount || 0).toFixed(1)} g</Text></View>}
                                        </View>
                                        <View style={styles.actionsRow}>
                                            <TouchableOpacity onPress={() => handleEditGroup(item.logs)}><Ionicons name="pencil-outline" size={24} color="#007AFF" /></TouchableOpacity>
                                            <TouchableOpacity onPress={() => handleDeleteGroup(item.logs)}><Ionicons name="trash-outline" size={24} color="#FF3B30" style={{marginLeft: 12}} /></TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            );
                        }}
                        ListEmptyComponent={<Text style={styles.noData}>No logs for this period</Text>}
                        onRefresh={() => loadData(timePeriod, displayDate)}
                        refreshing={isLoading}
                    />
                }
            </View>

            <TouchableOpacity style={styles.fab} onPress={handleAddNew}>
                <Ionicons name="add" size={30} color="white" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F2F5' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 15, paddingTop: Platform.OS === 'android' ? 25 : 15, paddingBottom: 10 },
    headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#333' },
    doneButton: { color: '#007AFF', fontSize: 17, fontWeight: '600', paddingTop: 8 },
    summaryBox: { padding: 16, backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 15, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    summaryText: { fontSize: 16, fontWeight: '600', color: '#555', marginBottom: 4 },
    summaryReading: { fontSize: 20, fontWeight: 'bold' },
    historyContainer: { flex: 1, backgroundColor: 'white', borderRadius: 12, marginHorizontal: 15, marginBottom: 15 },
    segmentedControlContainer: { flexDirection: 'row', backgroundColor: '#E9E9EF', borderRadius: 8, marginHorizontal: 20, marginTop: 20, overflow: 'hidden' },
    segment: { flex: 1, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
    segmentActive: { backgroundColor: '#FFFFFF', borderRadius: 6, margin: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41, elevation: 2 },
    segmentText: { fontWeight: '500', color: '#8E8E93', fontSize: 13 },
    segmentTextActive: { color: '#000000', fontWeight: '600' },
    dateNavigatorContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 15, marginBottom: 10 },
    arrowButton: { backgroundColor: '#E9E9EF', borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    dateNavigatorText: { fontSize: 16, fontWeight: '600', color: '#333' },
    calendarBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
    calendarModalContainer: { position: 'absolute', top: '20%', left: '5%', right: '5%', backgroundColor: 'white', borderRadius: 16, padding: 10, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
    historyItem: { backgroundColor: '#ffffff', padding: 16, marginBottom: 12, borderRadius: 16, marginHorizontal: 15, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    historyDate: { fontSize: 12, color: '#888', marginBottom: 8 },
    logDataRow: { flexDirection: 'row', alignItems: 'center' },
    logRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
    historyLabel: { fontWeight: '600', fontSize: 16 },
    historyValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    actionsRow: { flexDirection: 'row', marginLeft: 16 },
    noData: { textAlign: 'center', marginTop: 50, color: '#888' },
    spinner: {marginTop: 50},
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { backgroundColor: '#F0F2F5', padding: 24, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
    modalInput: { backgroundColor: '#fff', padding: 16, fontSize: 18, borderRadius: 12, textAlign: 'center', marginBottom: 12, borderColor: '#ccc', borderWidth: 1 },
    datePickerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: '#fff', borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#ccc' },
    datePickerText: { marginLeft: 10, fontSize: 16, fontWeight: '600' },
    scanButtonsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    scanButton: { flex: 1, flexDirection: 'row', backgroundColor: '#007AFF', padding: 12, marginHorizontal: 5, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    scanButtonText: { color: 'white', marginLeft: 6, fontSize: 16 },
    modalActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
    modalButtonText: { fontSize: 16, padding: 10, color: '#007AFF' },
    fab: { backgroundColor: '#007AFF', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', position: 'absolute', bottom: 30, right: 30, elevation: 8 }
});