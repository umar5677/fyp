// screens/LogBloodSugarScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, TextInput, StyleSheet, Alert,
    TouchableOpacity, ActivityIndicator, Modal, FlatList,
    KeyboardAvoidingView, Platform, SafeAreaView, useColorScheme
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showMessage } from "react-native-flash-message";

import { api } from '../utils/api';

const TAG_OPTIONS = ['Fasting', 'Pre-Meal', 'Post-Meal'];
const THRESHOLD_KEYS = ['lowThreshold', 'highFastingThreshold', 'highPostMealThreshold', 'veryHighThreshold'];

const STATUS_COLORS = {
    normal: '#4CAF50',
    high: '#FF9800',
    veryHigh: '#F44336',
    low: '#2196F3',
    default: '#6C757D',
};

const getBloodSugarStatus = (amount, tag, thresholds) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
        return { level: 'N/A', color: STATUS_COLORS.default, isAlert: false };
    }

    if (numAmount >= thresholds.veryHighThreshold) {
        return { level: 'Very High', color: STATUS_COLORS.veryHigh, isAlert: true };
    }
    if (numAmount < thresholds.lowThreshold) {
        return { level: 'Low', color: STATUS_COLORS.low, isAlert: true };
    }
    
    const isFastingContext = tag === 'Fasting' || tag === 'Pre-Meal';

    if (isFastingContext) {
        if (numAmount >= thresholds.highFastingThreshold) {
            return { level: 'High', color: STATUS_COLORS.high, isAlert: true };
        }
        if (numAmount >= thresholds.lowThreshold) {
             return { level: 'Normal', color: STATUS_COLORS.normal, isAlert: false };
        }
    } else if (tag === 'Post-Meal') {
        if (numAmount >= thresholds.highPostMealThreshold) {
            return { level: 'High', color: STATUS_COLORS.high, isAlert: true };
        }
        if (numAmount >= thresholds.lowThreshold) {
            return { level: 'Normal', color: STATUS_COLORS.normal, isAlert: false };
        }
    }
    
    return { level: 'Check Tag', color: STATUS_COLORS.default, isAlert: false };
};

const LogItem = ({ item, onPress, index, thresholds }) => {
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

const TagSelector = ({ selectedTag, onSelectTag }) => (
    <View style={styles.tagSelectorContainer}>
        {TAG_OPTIONS.map(tag => (
            <TouchableOpacity 
                key={tag}
                style={[styles.tagOption, selectedTag === tag && styles.tagOptionSelected]}
                onPress={() => onSelectTag(tag)}
            >
                <Text style={[styles.tagOptionText, selectedTag === tag && styles.tagOptionTextSelected]}>{tag}</Text>
            </TouchableOpacity>
        ))}
    </View>
);

const EditLogModal = ({ modalVisible, setModalVisible, log, onSave, onDelete, onScan, inputValue, setInputValue }) => {
    const [isSaving, setIsSaving] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [logDate, setLogDate] = useState(new Date());
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const [tag, setTag] = useState(null);
    
    const colorScheme = useColorScheme();
    const today = new Date();

    useEffect(() => {
        if (modalVisible) {
            setInputValue(String(log?.amount || ''));
            setLogDate(log?.date ? new Date(log.date) : new Date());
            setTag(log?.tag || null);
        }
    }, [log, modalVisible]);

    if (!log) return null;

    const handleSave = async () => {
        if (!tag) {
            Alert.alert("Tag Required", "Please select a tag (e.g., Fasting, Pre-Meal) for this reading.");
            return;
        }
        if (isSaving) return;
        setIsSaving(true);
        await onSave(log.logID, inputValue, logDate, tag);
        setIsSaving(false);
        setModalVisible(false);
    };

    const handleDelete = () => {
        Alert.alert("Delete Log", "Are you sure you want to delete this log?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: () => { onDelete(log.logID); setModalVisible(false); }},
        ]);
    };

    const handlePickImage = async (type) => {
        const permissions = type === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissions.granted) { Alert.alert('Permission Denied'); return; }
        const pickerResult = type === 'camera' ? await ImagePicker.launchCameraAsync() : await ImagePicker.launchImageLibraryAsync();
        if (pickerResult.canceled || !pickerResult.assets?.length) return;
        
        setIsScanning(true);
        const scanResult = await onScan(pickerResult.assets[0].uri);
        setIsScanning(false);
        if (scanResult) setInputValue(scanResult);
    };

    return (
        <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setModalVisible(false)} />
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>{log.logID ? 'Edit Reading' : 'Log New Reading'}</Text>
                    <TouchableOpacity onPress={() => setDatePickerVisibility(true)} style={styles.datePickerButton} disabled={!!log.logID}>
                        <Ionicons name="calendar-outline" size={22} color="#42A5F5" />
                        <Text style={styles.datePickerText}>{logDate.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</Text>
                    </TouchableOpacity>
                    <DateTimePickerModal isVisible={isDatePickerVisible} mode="datetime" date={logDate} onConfirm={(d) => { setDatePickerVisibility(false); setLogDate(d); }} onCancel={() => setDatePickerVisibility(false)} display={Platform.OS === 'ios' ? 'inline' : 'default'} isDarkModeEnabled={colorScheme === 'light'} maximumDate={today} />
                    
                    <TagSelector selectedTag={tag} onSelectTag={setTag} />
                    
                    <TextInput style={styles.modalInput} value={inputValue} onChangeText={setInputValue} keyboardType="decimal-pad" placeholder="0" placeholderTextColor="#999" autoFocus={!log.logID} />
                    
                    {isScanning ? <ActivityIndicator /> : (
                        <View style={styles.scanButtonsContainer}>
                            <TouchableOpacity style={styles.scanButton} onPress={() => handlePickImage('camera')}><Ionicons name="camera-outline" size={20} color="#fff" /><Text style={styles.scanButtonText}>Scan</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.scanButton} onPress={() => handlePickImage('gallery')}><Ionicons name="image-outline" size={20} color="#fff" /><Text style={styles.scanButtonText}>Upload</Text></TouchableOpacity>
                        </View>
                    )}
                    <View style={styles.modalActions}>
                        <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.modalButtonText}>Cancel</Text></TouchableOpacity>
                        {log.logID && <TouchableOpacity onPress={handleDelete}><Text style={[styles.modalButtonText, { color: '#FF3B30' }]}>Delete</Text></TouchableOpacity>}
                        <TouchableOpacity onPress={handleSave} disabled={isSaving}><Text style={[styles.modalButtonText, { fontWeight: 'bold' }]}>Save</Text></TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const SegmentedControl = ({ options, selectedOption, onSelect }) => {
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

const DateNavigator = ({ date, onDateChange, period, onOpenCalendar }) => {
    const changeDate = (amount) => {
        const newDate = new Date(date);
        if (period === 'day') newDate.setDate(newDate.getDate() + amount);
        else if (period === 'week') newDate.setDate(newDate.getDate() + (amount * 7));
        else if (period === 'month') newDate.setMonth(newDate.getMonth() + amount);
        onDateChange(newDate);
    };

    const formatDate = () => {
        if (period === 'day') {
            return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
        }
        if (period === 'week') {
            const start = new Date(date); start.setDate(date.getDate() - date.getDay());
            const end = new Date(start); end.setDate(start.getDate() + 6);
            return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }
        if (period === 'month') {
            return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }
        return '';
    };

    return (
        <View style={styles.dateNavigatorContainer}>
            <TouchableOpacity onPress={() => changeDate(-1)} style={styles.arrowButton}>
                <Ionicons name="chevron-back" size={24} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onOpenCalendar}>
                <Text style={styles.dateNavigatorText}>{formatDate()}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => changeDate(1)} style={styles.arrowButton}>
                <Ionicons name="chevron-forward" size={24} color="#333" />
            </TouchableOpacity>
        </View>
    );
};

const CalendarModal = ({ isVisible, onClose, onDayPress, initialDate }) => {
    const today = new Date().toISOString().split('T')[0];
    return (
        <Modal visible={isVisible} transparent={true} animationType="fade">
            <TouchableOpacity style={styles.calendarBackdrop} onPress={onClose} />
            <View style={styles.calendarModalContainer}>
                <Calendar 
                    current={initialDate.toISOString().split('T')[0]} 
                    maxDate={today} 
                    onDayPress={(day) => { 
                        const newDate = new Date(day.timestamp); 
                        newDate.setMinutes(newDate.getMinutes() + newDate.getTimezoneOffset()); 
                        onDayPress(newDate); 
                        onClose(); 
                    }} 
                    theme={{ arrowColor: '#42A5F5', selectedDayBackgroundColor: '#42A5F5', todayTextColor: '#42A5F5' }}
                />
            </View>
        </Modal>
    );
};

export default function LogBloodSugarScreen({ navigation }) {
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
    const fabRef = useRef(null);
    const [thresholds, setThresholds] = useState({
        lowThreshold: 70,
        highFastingThreshold: 100,
        highPostMealThreshold: 140,
        veryHighThreshold: 180
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
                if (value !== null) {
                    loadedThresholds[key] = parseFloat(value);
                }
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

    useEffect(() => {
        if (fabRef.current) {
            fabRef.current.bounceIn(800);
        }
    }, []);

    const createNotification = async (amount, tag) => {
        try {
            const status = getBloodSugarStatus(amount, tag, thresholds);

            if (!status.isAlert) {
                // If it's not an alert, just show a simple success message.
                 showMessage({
                    message: "Log Saved",
                    description: `Your reading of ${amount} mg/dL is within normal range.`,
                    type: "success",
                    icon: "success",
                });
                return;
            }

            // If it IS an alert, show the warning pop-up AND create the persistent notification.
            showMessage({
                message: `${status.level} Glucose Detected`,
                description: `Your reading of ${amount} mg/dL is outside the normal range.`,
                type: "danger", 
                icon: "danger",
                duration: 5000,
            });

            const newNotification = {
                id: Date.now().toString(),
                message: `${status.level} Glucose Detected: ${amount} mg/dL`,
                timestamp: new Date().toISOString(),
                type: 'alert',
            };

            const existingNotifications = await AsyncStorage.getItem('notifications');
            const notifications = existingNotifications ? JSON.parse(existingNotifications) : [];
            notifications.unshift(newNotification);
            await AsyncStorage.setItem('notifications', JSON.stringify(notifications));

        } catch (error) {
            console.error("Failed to create notification:", error);
        }
    };


    const handleSave = async (logId, amount, date, tag) => {
        try {
            const updateData = { amount, tag };
            if (logId) {
                await api.updateLog(logId, updateData);
                 showMessage({
                    message: "Log Updated",
                    description: `Reading changed to ${amount} mg/dL.`,
                    type: "info",
                });
            } else {
                await api.addLog({ amount, type: 3, date: date.toISOString(), tag });
                await createNotification(amount, tag);
            }
        } catch (e) {
            Alert.alert('Error', 'An unexpected error occurred while saving.');
        }
        loadDependencies();
    };
    
    const handleDelete = async (logId) => {
        try {
            await api.deleteLog(logId);
        } catch (e) {
            Alert.alert('Error', 'An unexpected error occurred while deleting.');
        }
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
            } else {
                Alert.alert('Scan Failed', result.message || 'Could not find a number.');
            }
        } catch (error) {
            Alert.alert('Scan Error', 'An error occurred while scanning the image.');
        }
        return null;
    };

    const handleHistoryPress = (item) => {
        setSelectedLog(item);
        setModalVisible(true);
    };

    const handleAddNew = () => {
        fabRef.current?.rubberBand(800);
        setSelectedLog({});
        setModalVisible(true);
    };
    
    const renderLastReadingContent = () => {
        if (isLoadingLastReading) {
            return <ActivityIndicator style={{ paddingVertical: 20 }}/>;
        }
        
        if (lastReading) {
            const status = getBloodSugarStatus(lastReading.amount, lastReading.tag, thresholds);

            return (
                <>
                    {lastReading.tag && (
                        <Text style={[styles.lastReadingTag, { color: status.color }]}>{lastReading.tag}</Text>
                    )}
                    <Text style={styles.lastReadingValue}>
                        {lastReading.amount}
                        <Text style={styles.lastReadingUnit}> mg/dL</Text>
                    </Text>
                    <View style={styles.lastReadingStatusContainer}>
                        <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                        <Text style={[styles.statusText, { color: status.color, fontSize: 16, fontWeight: '600' }]}>{status.level}</Text>
                    </View>
                    <Text style={styles.lastReadingDate}>
                        <Ionicons name="calendar-outline" size={14} color="#6C757D" />
                        {' '}{new Date(lastReading.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                        <Text>{'  ·  '}</Text>
                        <Ionicons name="time-outline" size={14} color="#6C757D" />
                        {' '}{new Date(lastReading.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
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
                        <Text style={styles.dateHeaderText}>
                            {new Date(item.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </Text>
                    </Animatable.View>
                )}
                <LogItem item={item} onPress={() => handleHistoryPress(item)} index={index} thresholds={thresholds} />
            </>
        );
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
                <TouchableOpacity style={styles.doneButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="close-circle" size={32} color="#DDE1E6" />
                </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
                style={styles.lastReadingCard} 
                onPress={() => lastReading ? handleHistoryPress(lastReading) : handleAddNew()} 
                disabled={isLoadingLastReading} 
                activeOpacity={0.7}
            >
                <Text style={styles.cardTitle}>Last Reading</Text>
                {renderLastReadingContent()}
            </TouchableOpacity>

            <View style={styles.controlsContainer}>
                <DateNavigator 
                    date={displayDate} 
                    onDateChange={setDisplayDate} 
                    period={timePeriod} 
                    onOpenCalendar={() => setIsCalendarVisible(true)}
                />
                <SegmentedControl 
                    options={['day', 'week', 'month']} 
                    selectedOption={timePeriod} 
                    onSelect={(p) => { setTimePeriod(p); setDisplayDate(new Date()); }}
                />
            </View>
            
            <FlatList
                data={history}
                keyExtractor={(item) => item.logID.toString()}
                renderItem={renderLogListItem}
                ListHeaderComponent={<Text style={styles.listTitle}>History</Text>}
                ListEmptyComponent={
                    <Animatable.View animation="fadeIn" delay={300} style={styles.emptyContainer}>
                        {isLoading ? <ActivityIndicator/> : (
                            <>
                                <MaterialCommunityIcons name="clipboard-text-off-outline" size={60} color="#CED4DA" />
                                <Text style={styles.emptyText}>Nothing Logged Yet</Text>
                            </>
                        )}
                    </Animatable.View>
                }
                contentContainerStyle={{ paddingBottom: 120 }}
                onRefresh={loadDependencies}
                refreshing={isLoading}
            />
             
            <Animatable.View ref={fabRef} style={styles.fabContainer}>
                <TouchableOpacity style={styles.fab} onPress={handleAddNew} activeOpacity={0.8}>
                    <Ionicons name="add" size={34} color="white" />
                </TouchableOpacity>
            </Animatable.View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: 16, 
        paddingTop: Platform.OS === 'android' ? 20 : 10, 
        paddingBottom: 5,
    },
    headerTitle: { fontSize: 32, fontWeight: 'bold', color: '#1E1E2D' },
    doneButton: { padding: 5 },
    lastReadingCard: { 
        backgroundColor: '#FFFFFF', 
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 16, 
        marginHorizontal: 16, 
        marginVertical: 8,
        shadowColor: '#999', 
        shadowOffset: { width: 0, height: 2 }, 
        shadowOpacity: 0.1, 
        shadowRadius: 5, 
        elevation: 3, 
        alignItems: 'center'
    },
    cardTitle: { fontSize: 16, fontWeight: '600', color: '#6C757D' },
    lastReadingTag: { textTransform: 'uppercase', fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
    lastReadingValue: { 
        fontSize: 42,
        fontWeight: 'bold', 
        color: '#1E1E2D',
    },
    lastReadingUnit: { fontSize: 22, fontWeight: '500', color: '#6C757D' },
    lastReadingStatusContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 6, },
    lastReadingDate: { marginTop: 10, fontSize: 14, color: '#6C757D', alignItems: 'center' },
    listTitle: { 
        fontSize: 18, 
        fontWeight: 'bold', 
        color: '#343A40', 
        marginHorizontal: 16, 
        marginTop: 12,
        marginBottom: 6,
    },
    controlsContainer: { 
        paddingHorizontal: 16, 
        paddingBottom: 10,
        borderBottomWidth: 1, 
        borderBottomColor: '#E9ECEF' 
    },
    segmentedControlContainer: { 
        flexDirection: 'row', 
        backgroundColor: '#E9ECEF', 
        borderRadius: 10, 
        overflow: 'hidden', 
        marginTop: 12,
    },
    segment: { flex: 1, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
    segmentActive: { backgroundColor: '#FFFFFF', borderRadius: 8, margin: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 3, },
    segmentText: { fontWeight: '600', color: '#6C757D', fontSize: 14 },
    segmentTextActive: { color: '#42A5F5', fontWeight: 'bold' },
    dateNavigatorContainer: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: 5, 
        marginBottom: 8
    },
    arrowButton: { padding: 8 },
    dateNavigatorText: { fontSize: 20, fontWeight: 'bold', color: '#343A40' },
    dateHeaderText: { fontSize: 15, fontWeight: 'bold', color: '#495057', marginHorizontal: 16, marginTop: 16, marginBottom: 4 },
    emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40, },
    emptyText: { fontSize: 20, fontWeight: '600', color: '#ADB5BD', marginTop: 16, },
    emptySubtext: { fontSize: 15, color: '#CED4DA', marginTop: 8, textAlign: 'center' },
    fabContainer: { position: 'absolute', bottom: 35, right: 25 },
    fab: { backgroundColor: '#42A5F5', width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#42A5F5', shadowRadius: 8, shadowOpacity: 0.4, shadowOffset: { height: 4, width: 0 } },
    logItemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, marginVertical: 6, marginHorizontal: 16, shadowColor: '#999', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
    logItemIconContainer: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 16, },
    logItemDataContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, },
    logItemValueText: { fontSize: 22, fontWeight: 'bold', color: '#1E1E2D' },
    logItemUnitText: { fontSize: 14, color: '#666' },
    tagBadge: { backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, },
    tagBadgeText: { color: '#1E88E5', fontWeight: '600', fontSize: 12 },
    logItemTimeText: { fontSize: 14, color: '#888', fontWeight: '500' },
    statusContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', marginTop: 4 },
    statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
    statusText: { fontSize: 14, fontWeight: '500' },
    calendarBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
    calendarModalContainer: { position: 'absolute', top: '25%', left: '5%', right: '5%', backgroundColor: 'white', borderRadius: 16, elevation: 10, overflow: 'hidden'},
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { backgroundColor: '#F8F9FA', paddingHorizontal: 20, paddingTop: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    modalTitle: { fontSize: 16, fontWeight: '600', color: '#6C757D', textAlign: 'center', marginBottom: 15 },
    tagSelectorContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    tagOption: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#E9ECEF', marginHorizontal: 4, alignItems: 'center' },
    tagOptionSelected: { backgroundColor: '#42A5F5' },
    tagOptionText: { color: '#495057', fontWeight: '600' },
    tagOptionTextSelected: { color: 'white' },
    modalInput: { backgroundColor: '#FFFFFF', borderColor: '#E0E0E0', borderWidth: 1, borderRadius: 12, padding: 15, fontSize: 36, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: '#1E1E2D' },
    datePickerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#D1D1D6' },
    datePickerText: { marginLeft: 12, fontSize: 17, fontWeight: '600', color: '#42A5F5' },
    scanButtonsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
    scanButton: { flex: 1, flexDirection: 'row', backgroundColor: '#42A5F5', paddingVertical: 14, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginHorizontal: 5 },
    scanButtonText: { color: '#fff', marginLeft: 8, fontWeight: '600', fontSize: 16 },
    modalActions: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginTop: 10 },
    modalButtonText: { color: '#42A5F5', fontSize: 17, padding: 10, fontWeight: '500' },
});