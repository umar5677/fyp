// screens/LogBloodSugarScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, Text, TextInput, StyleSheet, Alert, 
    TouchableOpacity, ActivityIndicator, Modal, FlatList, 
    KeyboardAvoidingView, Platform, SafeAreaView, useColorScheme // Import useColorScheme
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import DateTimePickerModal from "react-native-modal-datetime-picker";

import { api } from '../utils/api'; 

// EditLogModal Component
const EditLogModal = ({ 
    modalVisible, 
    setModalVisible, 
    log, 
    onSave, 
    onDelete, 
    onScan,
    inputValue,
    setInputValue 
}) => {
    const [isSaving, setIsSaving] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [logDate, setLogDate] = useState(new Date());
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    
    const colorScheme = useColorScheme(); // Detects 'light' or 'dark' mode
    const today = new Date(); // Get today's date for the picker

    useEffect(() => {
        if (modalVisible) {
            setInputValue(String(log?.amount || ''));
            setLogDate(log && log.date ? new Date(log.date) : new Date());
        }
    }, [log, modalVisible]);

    if (!log) {
        return null;
    }

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);
        await onSave(log.logID, inputValue, logDate);
        setIsSaving(false);
        setModalVisible(false);
    };

    const handleDelete = () => {
        Alert.alert("Delete Log", "Are you sure you want to delete this log?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => {
                onDelete(log.logID);
                setModalVisible(false);
            }},
        ]);
    };

    const handlePickImage = async (type) => {
        const permissions = type === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissions.granted) {
            Alert.alert('Permission Denied', `Access to the ${type} is required.`);
            return;
        }
        const pickerResult = type === 'camera' ? await ImagePicker.launchCameraAsync() : await ImagePicker.launchImageLibraryAsync();
        if (pickerResult.canceled || !pickerResult.assets?.length) return;
        
        setIsScanning(true);
        const scanResult = await onScan(pickerResult.assets[0].uri);
        setIsScanning(false);
        if (scanResult) {
            setInputValue(scanResult);
        }
    };

    return (
        <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setModalVisible(false)} />
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>{log.logID ? 'Edit' : 'Add New'} Reading</Text>
                    
                    <TouchableOpacity 
                        onPress={() => setDatePickerVisibility(true)} 
                        style={styles.datePickerButton} 
                        disabled={!!log.logID}
                    >
                        <Ionicons name="calendar-outline" size={22} color="#007AFF" />
                        <Text style={styles.datePickerText}>{logDate.toLocaleString()}</Text>
                    </TouchableOpacity>

                    <DateTimePickerModal
                        isVisible={isDatePickerVisible}
                        mode="datetime"
                        date={logDate}
                        onConfirm={(date) => { setDatePickerVisibility(false); setLogDate(date); }}
                        onCancel={() => setDatePickerVisibility(false)}
                        display={Platform.OS === 'ios' ? 'inline' : 'default'}
                        isDarkModeEnabled={colorScheme === 'light'} 
                        maximumDate={today}
                    />

                    <TextInput
                        style={styles.modalInput}
                        value={inputValue}
                        onChangeText={setInputValue}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor="#999"
                        autoFocus={true}
                    />
                    {isScanning ? <ActivityIndicator style={styles.spinner} /> : (
                        <View style={styles.scanButtonsContainer}>
                            <TouchableOpacity style={styles.scanButton} onPress={() => handlePickImage('camera')}>
                                <Ionicons name="camera-outline" size={20} color="#fff" />
                                <Text style={styles.scanButtonText}>Scan</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.scanButton} onPress={() => handlePickImage('gallery')}>
                                <Ionicons name="image-outline" size={20} color="#fff" />
                                <Text style={styles.scanButtonText}>Upload</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    <View style={styles.modalActions}>
                        <TouchableOpacity onPress={() => setModalVisible(false)}>
                            <Text style={styles.modalButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        {log.logID && <TouchableOpacity onPress={handleDelete}><Text style={[styles.modalButtonText, { color: '#FF3B30' }]}>Delete</Text></TouchableOpacity>}
                        <TouchableOpacity onPress={handleSave} disabled={isSaving}>
                             <Text style={[styles.modalButtonText, { fontWeight: 'bold' }]}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};


// SegmentedControl Component
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


// DateNavigator Component
const DateNavigator = ({ date, onDateChange, period, onOpenCalendar }) => {
    const changeDate = (amount) => {
        const newDate = new Date(date);
        if (period === 'day') {
            newDate.setDate(newDate.getDate() + amount);
        } else if (period === 'week') {
            newDate.setDate(newDate.getDate() + (amount * 7));
        } else if (period === 'month') {
            newDate.setMonth(newDate.getMonth() + amount);
        }
        onDateChange(newDate);
    };

    const formatDate = () => {
        if (period === 'day') {
            return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
        }
        if (period === 'week') {
            const start = new Date(date);
            start.setDate(date.getDate() - date.getDay());
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            return `${start.toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} - ${end.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}`;
        }
        if (period === 'month') {
            return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }
        return '';
    };

    return (
        <View style={styles.dateNavigatorContainer}>
            <TouchableOpacity onPress={() => changeDate(-1)} style={styles.arrowButton}>
                <Ionicons name="chevron-back" size={24} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onOpenCalendar}>
                <Text style={styles.dateNavigatorText}>{formatDate()}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => changeDate(1)} style={styles.arrowButton}>
                <Ionicons name="chevron-forward" size={24} color="#007AFF" />
            </TouchableOpacity>
        </View>
    );
};

// CalendarModal Component 
const CalendarModal = ({ isVisible, onClose, onDayPress, initialDate }) => {
    // Get today's date in 'YYYY-MM-DD' format for the maxDate prop
    const today = new Date().toISOString().split('T')[0];

    return (
        <Modal visible={isVisible} transparent={true} animationType="fade">
            <TouchableOpacity style={styles.calendarBackdrop} onPress={onClose} />
            <View style={styles.calendarModalContainer}>
                <Calendar
                    current={initialDate.toISOString().split('T')[0]}
                    // Add the maxDate prop to disable future dates.
                    maxDate={today}
                    onDayPress={(day) => {
                        const selectedDate = new Date(day.year, day.month - 1, day.day);
                        onDayPress(selectedDate);
                        onClose();
                    }}
                    monthFormat={'MMMM yyyy'}
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


// --- Main Screen Component ---
const LogBloodSugarScreen = ({ navigation }) => {
    const [history, setHistory] = useState([]);
    const [lastReading, setLastReading] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingLastReading, setIsLoadingLastReading] = useState(true);
    const [selectedLog, setSelectedLog] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [modalInputValue, setModalInputValue] = useState('');
    const [timePeriod, setTimePeriod] = useState('day');
    const [displayDate, setDisplayDate] = useState(new Date());
    const [isCalendarVisible, setIsCalendarVisible] = useState(false);

    const loadData = async (period, date) => {
        if (isLoading) return;
        setIsLoading(true);
        try {
            const data = await api.getHistory([3], period, date.toISOString());
            setHistory(data);
        } catch (error) {
            Alert.alert("Error", `Could not load history for the selected period.`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const loadLastReading = async () => {
        setIsLoadingLastReading(true);
        try {
            const data = await api.getHistory([3], 'all', null, 1);
            if (data.length > 0) {
                setLastReading(data[0]);
            } else {
                setLastReading(null);
            }
        } catch (error) {
             console.error("Could not load last reading:", error);
        } finally {
            setIsLoadingLastReading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadData(timePeriod, displayDate);
            loadLastReading();
        }, [timePeriod, displayDate])
    );

    const refreshAllData = () => {
        loadLastReading();
        loadData(timePeriod, displayDate);
    };

    const handleSave = async (logId, amount, date) => {
        try {
            if (logId) {
                await api.updateLog(logId, amount);
            } else {
                await api.addLog({ amount, type: 3, date: date.toISOString() });
            }
            Alert.alert('Success', 'Log saved successfully.');
        } catch(e) {
            Alert.alert('Error', 'An unexpected error occurred.');
        }
        refreshAllData();
    };
    
    const handleDelete = async (logId) => {
        try {
            await api.deleteLog(logId);
            Alert.alert('Success', 'Log deleted successfully.');
        } catch(e) {
            Alert.alert('Error', 'An unexpected error occurred.');
        }
        refreshAllData();
    };

    const handleScan = async (imageUri) => {
        try {
            const manipulated = await manipulateAsync(imageUri, [{ resize: { width: 1080 } }], { compress: 0.9, format: SaveFormat.JPEG, base64: true });
            const result = await api.scanImage(manipulated.base64);
            const number = result.bloodsugar || result.number;
            if (number) {
                Alert.alert('Scan Successful', `Detected: ${number}`);
                return String(number);
            } else {
                Alert.alert('Scan Failed', result.message || 'Could not find a number.');
                return null;
            }
        } catch (error) {
            Alert.alert('Scan Error', 'An error occurred while scanning the image.');
            return null;
        }
    };

    const handleHistoryPress = (item) => {
        setSelectedLog(item);
        setModalInputValue(String(item.amount));
        setModalVisible(true);
    };

    const handleAddNew = () => {
        setSelectedLog({ amount: '' });
        setModalInputValue('');
        setModalVisible(true);
    };

    const renderHistoryItem = ({ item }) => {
        const date = new Date(item.date);
        const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const formattedTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        return (
            <TouchableOpacity style={styles.historyRow} onPress={() => handleHistoryPress(item)}>
                <Text style={styles.historyText}>{formattedDate}</Text>
                <Text style={styles.historyText}>{formattedTime}</Text>
                <Text style={styles.historyValue}>{item.amount} <Text style={styles.historyUnit}>mg/dL</Text></Text>
            </TouchableOpacity>
        );
    };

    const renderLastReadingContent = () => {
        if (isLoadingLastReading) {
            return <ActivityIndicator style={styles.spinner} />;
        }
        if (lastReading) {
            return (
                <>
                    <Text style={styles.lastReadingValue}>
                        {lastReading.amount} <Text style={styles.lastReadingUnit}>mg/dL</Text>
                    </Text>
                    <Text style={styles.cardDate}>
                        <Ionicons name="calendar-outline" size={14} color="#555" /> {new Date(lastReading.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        <Text>   </Text>
                        <Ionicons name="time-outline" size={14} color="#555" /> {new Date(lastReading.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </>
            );
        }
        return <Text style={styles.noDataText}>No readings yet. Add one!</Text>;
    };

    return (
        <SafeAreaView style={styles.container}>
            <EditLogModal 
                modalVisible={modalVisible}
                setModalVisible={setModalVisible}
                log={selectedLog}
                onSave={handleSave}
                onDelete={handleDelete}
                onScan={handleScan}
                inputValue={modalInputValue}
                setInputValue={setModalInputValue}
            />
            
            <CalendarModal
                isVisible={isCalendarVisible}
                onClose={() => setIsCalendarVisible(false)}
                onDayPress={setDisplayDate}
                initialDate={displayDate}
            />
            
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Blood Sugar</Text>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.doneButton}>Done</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity 
                style={styles.lastReadingCard}
                onPress={() => lastReading ? handleHistoryPress(lastReading) : handleAddNew()}
                disabled={isLoadingLastReading}
            >
                <Text style={styles.cardTitle}><Ionicons name="water" size={16} color="#007AFF" /> Last Reading</Text>
                {renderLastReadingContent()}
            </TouchableOpacity>

            <View style={styles.historyContainer}>
                <SegmentedControl
                    options={['day', 'week', 'month']}
                    selectedOption={timePeriod}
                    onSelect={(period) => {
                        setTimePeriod(period);
                        setDisplayDate(new Date());
                    }}
                />
                
                <DateNavigator
                    date={displayDate}
                    onDateChange={setDisplayDate}
                    period={timePeriod}
                    onOpenCalendar={() => setIsCalendarVisible(true)}
                />
                
                <View style={styles.historyHeader}>
                    <Text style={[styles.historyHeaderText, {flex: 2}]}>Date</Text>
                    <Text style={[styles.historyHeaderText, {flex: 1.5}]}>Time</Text>
                    <Text style={[styles.historyHeaderText, {flex: 1, textAlign: 'right'}]}>Value</Text>
                </View>

                {isLoading ? <ActivityIndicator style={styles.spinner}/> : (
                    <FlatList
                        data={history}
                        renderItem={renderHistoryItem}
                        keyExtractor={(item, index) => item.logID ? item.logID.toString() : index.toString()}
                        ListEmptyComponent={<Text style={styles.noDataText}>No readings for this period.</Text>}
                        onRefresh={refreshAllData}
                        refreshing={isLoading}
                    />
                )}
            </View>
             
            <TouchableOpacity style={styles.fab} onPress={handleAddNew}>
                <Ionicons name="add" size={30} color="white" />
            </TouchableOpacity>
        </SafeAreaView>
    );
};

// Styles 
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F2F5' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, marginBottom: 5, paddingHorizontal: 15, paddingTop: Platform.OS === 'android' ? 25 : 15 },
    headerTitle: { fontSize: 28, fontWeight: 'bold' },
    doneButton: { fontSize: 17, color: '#007AFF', fontWeight: '600' },
    lastReadingCard: { backgroundColor: 'white', padding: 20, borderRadius: 12, marginBottom: 20, marginHorizontal: 15, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.20, shadowRadius: 1.41, elevation: 2 },
    historyContainer: { flex: 1, backgroundColor: 'white', borderRadius: 12, marginHorizontal: 15, marginBottom: 15 },
    segmentedControlContainer: {
        flexDirection: 'row',
        backgroundColor: '#E9E9EF',
        borderRadius: 8,
        marginHorizontal: 20,
        marginTop: 20,
        overflow: 'hidden',
    },
    segment: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    segmentActive: {
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        margin: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
        elevation: 2,
    },
    segmentText: {
        fontWeight: '500',
        color: '#8E8E93',
        fontSize: 13,
    },
    segmentTextActive: {
        color: '#000000',
        fontWeight: '600',
    },
    dateNavigatorContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 15,
        marginBottom: 10,
    },
    arrowButton: {
        backgroundColor: '#E9E9EF',
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dateNavigatorText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    calendarBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    calendarModalContainer: {
        position: 'absolute',
        top: '20%',
        left: '5%',
        right: '5%',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 10,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    historyHeader: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#EEE', paddingBottom: 10, paddingHorizontal: 20, marginTop: 10 },
    fab: { position: 'absolute', margin: 16, right: 20, bottom: 20, backgroundColor: '#007AFF', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowRadius: 5, shadowOpacity: 0.3, shadowOffset: { height: 2, width: 0 } },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    spinner: { marginVertical: 20 },
    cardTitle: { fontSize: 16, fontWeight: '600', color: '#555', marginBottom: 10 },
    lastReadingValue: { fontSize: 48, fontWeight: 'bold', color: '#111' },
    lastReadingUnit: { fontSize: 24, fontWeight: 'normal', color: '#777' },
    cardDate: { marginTop: 10, color: '#555', alignItems: 'center' },
    noDataText: { textAlign: 'center', padding: 20, color: '#888' },
    historyHeaderText: { fontWeight: 'bold', color: '#555' },
    historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#EEE', paddingHorizontal: 20 },
    historyText: { fontSize: 14 },
    historyValue: { fontSize: 14, fontWeight: 'bold' },
    historyUnit: { fontWeight: 'normal', color: '#555' },
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { backgroundColor: '#F0F2F5', paddingHorizontal: 20, paddingTop: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    modalTitle: { fontSize: 16, fontWeight: '600', color: '#888', textAlign: 'center', marginBottom: 15 },
    modalInput: { backgroundColor: '#FFFFFF', borderColor: '#E0E0E0', borderWidth: 1, borderRadius: 10, padding: 15, fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#D1D1D6',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2.0,
        elevation: 2,
    },
    datePickerText: {
        marginLeft: 12,
        fontSize: 17,
        fontWeight: '600',
        color: '#007AFF',
    },
    scanButtonsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
    scanButton: { flex: 1, flexDirection: 'row', backgroundColor: '#007AFF', paddingVertical: 14, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginHorizontal: 5 },
    scanButtonText: { color: '#fff', marginLeft: 8, fontWeight: '600', fontSize: 16 },
    modalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
    modalButtonText: { color: '#007AFF', fontSize: 17, padding: 10 },
});

export default LogBloodSugarScreen;