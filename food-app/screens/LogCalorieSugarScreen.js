// fyp/food-app/screens/LogCalorieSugarScreen.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, FlatList, Modal, ActivityIndicator, SafeAreaView,
  Animated, Pressable
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Calendar } from 'react-native-calendars';
import * as Animatable from 'react-native-animatable';
import { api } from '../utils/api';
import { useTheme } from '../context/ThemeContext';

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 25 : 15, paddingBottom: 10, },
    headerTitle: { fontSize: 32, fontWeight: 'bold', color: colors.text },
    doneButton: { padding: 5 },
    summaryCard: { backgroundColor: colors.card, borderRadius: 16, padding: 20, marginHorizontal: 16, marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5, elevation: 2, },
    summaryTitle: { fontSize: 16, fontWeight: '600', color: colors.textSecondary, marginBottom: 16 },
    summaryDetails: { flexDirection: 'row', justifyContent: 'space-around' },
    summaryItem: { alignItems: 'center' },
    summaryValue: { fontSize: 24, fontWeight: 'bold' },
    summaryLabel: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
    controlsContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    segmentedControlContainer: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: 10, overflow: 'hidden', marginTop: 15, },
    segment: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
    segmentActive: { backgroundColor: colors.card, borderRadius: 8, margin: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 3, },
    segmentText: { fontWeight: '600', color: colors.textSecondary, fontSize: 14 },
    segmentTextActive: { color: colors.primary, fontWeight: 'bold' },
    dateNavigatorContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 5, marginBottom: 10 },
    arrowButton: { padding: 8 },
    dateNavigatorText: { fontSize: 22, fontWeight: 'bold', color: colors.text },
    emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
    emptyText: { fontSize: 20, fontWeight: '600', color: '#ADB5BD', marginTop: 16 },
    emptySubtext: { fontSize: 15, color: '#CED4DA', marginTop: 8, textAlign: 'center' },
    logItemCard: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, marginVertical: 6, marginHorizontal: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2, alignItems: 'center', justifyContent: 'space-between' },
    logItemTimestamp: { alignItems: 'center', justifyContent: 'center', marginRight: 16, borderRightWidth: 1, borderRightColor: colors.border, paddingRight: 16, minWidth: 70 },
    logItemTimeText: { color: colors.textSecondary, fontWeight: '600', fontSize: 16 },
    logItemDetails: { flex: 1 },
    logDetailRow: { flexDirection: 'row', alignItems: 'center' },
    logValueText: { fontSize: 16, fontWeight: '600', color: colors.text, marginLeft: 5 },
    logUnitText: { fontSize: 13, color: colors.textSecondary, marginLeft: 3 },
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { backgroundColor: colors.background, paddingHorizontal: 20, paddingTop: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    modalTitle: { fontSize: 16, fontWeight: '600', color: colors.textSecondary, textAlign: 'center', marginBottom: 20 },
    foodNameInput: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 15, fontSize: 18, fontWeight: '500', color: colors.text, marginBottom: 15 },
    inputRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    modalInput: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 12, paddingVertical: 15, fontSize: 18, fontWeight: '600', textAlign: 'center', color: colors.text },
    datePickerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, backgroundColor: colors.card, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
    datePickerText: { marginLeft: 12, fontSize: 17, fontWeight: '600', color: colors.primary },
    scanButtonsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
    scanButton: { flex: 1, flexDirection: 'row', backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginHorizontal: 5 },
    scanButtonText: { color: '#fff', marginLeft: 8, fontWeight: '600', fontSize: 16 },
    modalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
    modalButtonText: { color: colors.primary, fontSize: 17, padding: 10, fontWeight: 'bold' },
    calendarBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
    calendarModalContainer: { position: 'absolute', top: '25%', left: '5%', right: '5%', backgroundColor: 'white', borderRadius: 16, elevation: 10, overflow: 'hidden'},
    foodNameText: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
    nutritionRow: { flexDirection: 'row', alignItems: 'center' },
    fabContainer: { position: 'absolute', bottom: 35, right: 25, alignItems: 'center' },
    fab: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowRadius: 4, shadowOpacity: 0.3, shadowOffset: { height: 3, width: 0 } },
    mainFab: { backgroundColor: colors.primary, width: 60, height: 60, borderRadius: 30, },
    secondaryFab: { position: 'absolute', },
    aiFab: { backgroundColor: '#E67E22' },
    manualFab: { backgroundColor: '#3498DB' },
});

const FoodLogItem = ({ item, onEdit, index, colors }) => {
    const styles = getStyles(colors);
    const calorieLog = item.logs.find(l => l.type === 1);
    const sugarLog = item.logs.find(l => l.type === 2);
    const foodName = item.logs.find(l => l.foodName)?.foodName;
    const date = new Date(item.timestamp);
    const formattedTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    return (
        <Animatable.View animation="fadeInUp" duration={400} delay={index * 60}>
            <TouchableOpacity style={styles.logItemCard} onPress={() => onEdit(item.logs)} activeOpacity={0.7}>
                <View style={styles.logItemTimestamp}>
                    <Text style={styles.logItemTimeText}>{formattedTime}</Text>
                </View>
                <View style={styles.logItemDetails}>
                    {foodName ? (
                        <Text style={styles.foodNameText} numberOfLines={1}>{foodName}</Text>
                    ) : null}
                    <View style={styles.nutritionRow}>
                        {calorieLog ? (
                            <View style={styles.logDetailRow}>
                                <Ionicons name="flame" size={18} color="#F57C00" />
                                <Text style={styles.logValueText}>{parseInt(calorieLog.amount, 10)}</Text>
                                <Text style={styles.logUnitText}>kcal</Text>
                            </View>
                        ) : null}
                        {sugarLog ? (
                            <View style={[styles.logDetailRow, {marginLeft: calorieLog ? 15 : 0}]}>
                                <MaterialCommunityIcons name="candy" size={18} color="#D32F2F" />
                                <Text style={styles.logValueText}>{parseFloat(sugarLog.amount).toFixed(1)}</Text>
                                <Text style={styles.logUnitText}>g</Text>
                            </View>
                        ) : null}
                    </View>
                </View>
                <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
        </Animatable.View>
    );
};

const EditModal = ({ modalVisible, setModalVisible, logs, onSave, onDelete, onScan, colors }) => {
    const { theme } = useTheme();
    const styles = getStyles(colors);
    const [foodName, setFoodName] = useState('');
    const [calories, setCalories] = useState('');
    const [sugar, setSugar] = useState('');
    const [logDate, setLogDate] = useState(new Date());
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const today = new Date();
    
    useEffect(() => {
        if (modalVisible && logs) {
            setFoodName(logs.find(l => l.foodName)?.foodName || '');
            setCalories(logs.find(l => l.type === 1)?.amount?.toString() || '');
            setSugar(logs.find(l => l.type === 2)?.amount?.toString() || '');
            setLogDate(logs.length > 0 && logs[0].date ? new Date(logs[0].date) : new Date());
        }
    }, [logs, modalVisible]);

    if (!logs) return null;

    const handleSave = async () => {
        if (!foodName.trim()) { Alert.alert("Food Name Required", "Please enter a name for the food before saving."); return; }
        setIsSaving(true);
        await onSave(logs, { calories, sugar }, logDate, foodName.trim());
        setIsSaving(false); setModalVisible(false);
    };
    
    const handleDeletePress = () => { onDelete(logs); setModalVisible(false); };

    const handlePickImage = async (type) => {
        const permissions = type === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissions.granted) { Alert.alert('Permission Denied'); return; }
        const pickerResult = type === 'camera' ? await ImagePicker.launchCameraAsync() : await ImagePicker.launchImageLibraryAsync();
        if (pickerResult.canceled || !pickerResult.assets?.length) return;
        setIsScanning(true);
        const scanResult = await onScan(pickerResult.assets[0].uri);
        setIsScanning(false);
        if (scanResult) {
            if (scanResult.calories != null) setCalories(scanResult.calories.toString());
            if (scanResult.sugar != null) setSugar(scanResult.sugar.toString());
        }
    };

    const isEditing = logs.some(l => l.logID);

    return (
        <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
                    <Pressable>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>{isEditing ? "Edit Log" : "Log Calories & Sugar"}</Text>
                            <TouchableOpacity onPress={() => setDatePickerVisibility(true)} style={styles.datePickerButton} disabled={isEditing}>
                                <Ionicons name="calendar-outline" size={22} color={colors.primary} />
                                <Text style={styles.datePickerText}>{logDate.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</Text>
                            </TouchableOpacity>
                            <DateTimePickerModal isVisible={isDatePickerVisible} mode="datetime" date={logDate} onConfirm={(d) => { setDatePickerVisibility(false); setLogDate(d); }} onCancel={() => setDatePickerVisibility(false)} display={Platform.OS === 'ios' ? 'inline' : 'default'} isDarkModeEnabled={theme === 'dark'} maximumDate={today} />
                            <TextInput style={styles.foodNameInput} placeholder="Food Name (e.g., Apple)" placeholderTextColor={colors.textSecondary} value={foodName} onChangeText={setFoodName} />
                            <View style={styles.inputRow}>
                                <TextInput style={[styles.modalInput, {flex: 1}]} keyboardType="decimal-pad" value={calories} onChangeText={setCalories} placeholder="Calories" placeholderTextColor={colors.textSecondary} />
                                <TextInput style={[styles.modalInput, {flex: 1, marginLeft: 10}]} keyboardType="decimal-pad" value={sugar} onChangeText={setSugar} placeholder="Sugar (g)" placeholderTextColor={colors.textSecondary} />
                            </View>
                            {isScanning ? <ActivityIndicator color={colors.primary} /> : (
                                <View style={styles.scanButtonsContainer}>
                                    <TouchableOpacity style={styles.scanButton} onPress={() => handlePickImage('camera')}><Ionicons name="camera-outline" size={20} color="#fff" /><Text style={styles.scanButtonText}>Scan Label</Text></TouchableOpacity>
                                    <TouchableOpacity style={styles.scanButton} onPress={() => handlePickImage('gallery')}><Ionicons name="image-outline" size={20} color="#fff" /><Text style={styles.scanButtonText}>Upload</Text></TouchableOpacity>
                                </View>
                            )}
                            <View style={styles.modalActions}>
                                <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.modalButtonText}>Cancel</Text></TouchableOpacity>
                                {isEditing ? (
                                    <TouchableOpacity onPress={handleDeletePress}><Text style={[styles.modalButtonText, { color: colors.logoutText }]}>Delete</Text></TouchableOpacity>
                                ) : null}
                                <TouchableOpacity onPress={handleSave} disabled={isSaving}><Text style={[styles.modalButtonText, { fontWeight: 'bold' }]}>Save</Text></TouchableOpacity>
                            </View>
                        </View>
                    </Pressable>
                </Pressable>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const SegmentedControl = ({ options, selectedOption, onSelect, colors }) => {
    const styles = getStyles(colors);
    return (<View style={styles.segmentedControlContainer}>{options.map(option => ( <TouchableOpacity key={option} style={[styles.segment, selectedOption === option && styles.segmentActive]} onPress={() => onSelect(option)}><Text style={[styles.segmentText, selectedOption === option && styles.segmentTextActive]}>{option.charAt(0).toUpperCase() + option.slice(1)}</Text></TouchableOpacity>))}</View>);
}

const DateNavigator = ({ date, onDateChange, period, onOpenCalendar, colors }) => {
    const styles = getStyles(colors);
    const changeDate = (amount) => { const newDate = new Date(date); if (period === 'day') newDate.setDate(newDate.getDate() + amount); else if (period === 'week') newDate.setDate(newDate.getDate() + (amount * 7)); else if (period === 'month') newDate.setMonth(newDate.getMonth() + amount); onDateChange(newDate); };
    const formatDate = () => { if (period === 'day') return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' }); if (period === 'week') { const start = new Date(date); start.setDate(date.getDate() - date.getDay()); const end = new Date(start); end.setDate(start.getDate() + 6); return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`; } if (period === 'month') return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); return ''; };
    return ( <View style={styles.dateNavigatorContainer}><TouchableOpacity onPress={() => changeDate(-1)} style={styles.arrowButton}><Ionicons name="chevron-back" size={24} color={colors.text} /></TouchableOpacity><TouchableOpacity onPress={onOpenCalendar}><Text style={styles.dateNavigatorText}>{formatDate()}</Text></TouchableOpacity><TouchableOpacity onPress={() => changeDate(1)} style={styles.arrowButton}><Ionicons name="chevron-forward" size={24} color={colors.text} /></TouchableOpacity></View> );
};

const CalendarModal = ({ isVisible, onClose, onDayPress, initialDate, colors }) => {
    const styles = getStyles(colors);
    const today = new Date().toISOString().split('T')[0];
    const calendarTheme = { calendarBackground: colors.card, textSectionTitleColor: colors.textSecondary, dayTextColor: colors.text, todayTextColor: colors.primary, selectedDayBackgroundColor: colors.primary, selectedDayTextColor: '#FFFFFF', monthTextColor: colors.text, indicatorColor: colors.primary, arrowColor: colors.primary, 'stylesheet.calendar.header': { week: { marginTop: 5, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border } } };
    return ( <Modal visible={isVisible} transparent={true} animationType="fade"><Pressable style={styles.calendarBackdrop} onPress={onClose}><View style={[styles.calendarModalContainer, { backgroundColor: colors.card }]}><Calendar current={initialDate.toISOString().split('T')[0]} maxDate={today} onDayPress={(day) => { const newDate = new Date(day.timestamp); newDate.setMinutes(newDate.getMinutes() + newDate.getTimezoneOffset()); onDayPress(newDate); onClose(); }} theme={calendarTheme} /></View></Pressable></Modal> );
};

export default function LogCalorieSugarScreen({ navigation }) {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    const [history, setHistory] = useState([]);
    const [groupedHistory, setGroupedHistory] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingLogs, setEditingLogs] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [timePeriod, setTimePeriod] = useState('day');
    const [displayDate, setDisplayDate] = useState(new Date());
    const [isCalendarVisible, setIsCalendarVisible] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuAnimation = useRef(new Animated.Value(0)).current;
    const [isPremiumUser, setIsPremiumUser] = useState(false);

    const loadData = async (period, date) => {
        setIsLoading(true);
        try {
            const [data, qnaStatus] = await Promise.all([
                api.getHistory([1, 2], period, date.toISOString()),
                api.getQnaStatus()
            ]);

            setIsPremiumUser(qnaStatus.is_premium || false);
            
            setHistory(data);
            const tempGroups = {};
            const timeThreshold = 300000;
            data.forEach(log => {
                const logTime = new Date(log.date).getTime();
                const foundGroupKey = Object.keys(tempGroups).find(key => Math.abs(logTime - Number(key)) < timeThreshold);
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
            Alert.alert('Error', 'Failed to load screen data.'); 
            setIsPremiumUser(false);
        } 
        finally { setIsLoading(false); }
    };

    useFocusEffect(useCallback(() => { loadData(timePeriod, displayDate); }, [timePeriod, displayDate]));

    const toggleMenu = () => {
        const toValue = isMenuOpen ? 0 : 1;
        Animated.spring(menuAnimation, { toValue, friction: 7, useNativeDriver: true }).start();
        setIsMenuOpen(!isMenuOpen);
    };

    const handleLabelScan = async (imageUri) => {
        try {
            const manipulated = await manipulateAsync(imageUri, [], { compress: 0.8, format: SaveFormat.JPEG, base64: true });
            const result = await api.scanImage(manipulated.base64);
            if (result.success && (result.calories !== null || result.sugar !== null)) {
                Alert.alert('Scan Successful', `Found: ${result.calories || 'No'} calories, ${result.sugar || 'no'}g sugar.`);
                return { calories: result.calories, sugar: result.sugar };
            }
            Alert.alert('Scan Failed', result.message || 'Could not find values.');
        } catch (error) { Alert.alert('Scan Error', 'An error occurred.'); }
        return null;
    };
    
    const handleAiScan = () => {
        toggleMenu();
        if (isPremiumUser) {
            navigation.navigate('AiFoodScan');
        } else {
            Alert.alert(
                "Premium Feature",
                "AI-powered food scanning is a premium feature. Please upgrade to use it."
            );
        }
    };

    const handleSave = async (logsToEdit, newValues, logDate, foodName) => {
        setIsLoading(true);
        try {
            const { calories, sugar } = newValues;
            const hasCalories = calories && !isNaN(parseFloat(calories));
            const hasSugar = sugar && !isNaN(parseFloat(sugar));
            if (logsToEdit && logsToEdit.length > 0) {
                 for(const log of logsToEdit) { if(log.logID) await api.deleteLog(log.logID); }
            }
            const date = logDate.toISOString();
            if (hasCalories) await api.addLog({ amount: parseFloat(calories), type: 1, date, foodName });
            if (hasSugar) await api.addLog({ amount: parseFloat(sugar), type: 2, date, foodName });
        } catch (error) { Alert.alert('Error', 'Failed to save log entry.'); } 
        finally { loadData(timePeriod, displayDate); }
    };

    const handleDeleteGroup = (logs) => {
        Alert.alert('Confirm Delete', 'Are you sure you want to delete this log?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: async () => {
                try {
                    for(const log of logs) { await api.deleteLog(log.logID); }
                    loadData(timePeriod, displayDate);
                } catch { Alert.alert('Error', 'Failed to delete log.'); }
            }}
        ]);
    };

    const handleEditGroup = (logs) => { setEditingLogs(logs); setModalVisible(true); };
    const handleAddNew = () => { toggleMenu(); setEditingLogs([]); setModalVisible(true); };

    const totalCalories = history.filter(l => l.type === 1).reduce((sum, l) => sum + Number(l.amount || 0), 0);
    const totalSugar = history.filter(l => l.type === 2).reduce((sum, l) => sum + Number(l.amount || 0), 0);
    const mainFabRotate = menuAnimation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });
    const aiScanStyle = { transform: [ { scale: menuAnimation }, { translateY: menuAnimation.interpolate({ inputRange: [0, 1], outputRange: [0, -60] }) } ], opacity: menuAnimation };
    const manualAddStyle = { transform: [ { scale: menuAnimation }, { translateY: menuAnimation.interpolate({ inputRange: [0, 1], outputRange: [0, -115] }) } ], opacity: menuAnimation };

    return (
        <SafeAreaView style={styles.container}>
            <EditModal modalVisible={modalVisible} setModalVisible={setModalVisible} logs={editingLogs} onSave={handleSave} onDelete={handleDeleteGroup} onScan={handleLabelScan} colors={colors} />
            <CalendarModal isVisible={isCalendarVisible} onClose={() => setIsCalendarVisible(false)} onDayPress={setDisplayDate} initialDate={displayDate} colors={colors}/>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Food Diary</Text>
                <TouchableOpacity style={styles.doneButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="close-circle" size={32} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>
            <Animatable.View animation="fadeInDown" duration={500}>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>{timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)}'s Intake</Text>
                    <View style={styles.summaryDetails}>
                        <View style={styles.summaryItem}>
                            <Text style={[styles.summaryValue, {color: '#F57C00'}]}>🔥 {totalCalories.toFixed(0)}</Text>
                            <Text style={styles.summaryLabel}>kcal</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={[styles.summaryValue, {color: '#D32F2F'}]}>🍬 {totalSugar.toFixed(1)}</Text>
                            <Text style={styles.summaryLabel}>grams</Text>
                        </View>
                    </View>
                </View>
                <View style={styles.controlsContainer}>
                    <DateNavigator date={displayDate} onDateChange={setDisplayDate} period={timePeriod} onOpenCalendar={() => setIsCalendarVisible(true)} colors={colors}/>
                    <SegmentedControl options={['day', 'week', 'month']} selectedOption={timePeriod} onSelect={(p) => { setTimePeriod(p); setDisplayDate(new Date()); }} colors={colors} />
                </View>
            </Animatable.View>
            <FlatList
                data={groupedHistory}
                keyExtractor={(item) => item.timestamp}
                renderItem={({ item, index }) => (
                    <FoodLogItem item={item} onEdit={handleEditGroup} index={index} colors={colors}/>
                )}
                ListEmptyComponent={<Animatable.View animation="fadeIn" delay={300} style={styles.emptyContainer}>{isLoading ? <ActivityIndicator size="large" color={colors.primary} /> : (<><Ionicons name="fast-food-outline" size={60} color="#CED4DA" /><Text style={styles.emptyText}>Nothing Logged Yet</Text><Text style={styles.emptySubtext}>Tap the '+' button to add an entry.</Text></>)}</Animatable.View>}
                contentContainerStyle={{ paddingBottom: 120, paddingTop: 10 }}
                onRefresh={() => loadData(timePeriod, displayDate)}
                refreshing={isLoading}
            />
            <View style={styles.fabContainer}>
                <Animated.View style={[styles.secondaryFab, manualAddStyle]}>
                    <TouchableOpacity style={[styles.fab, styles.manualFab]} onPress={handleAddNew} activeOpacity={0.8}>
                        <Ionicons name="pencil" size={22} color="white" />
                    </TouchableOpacity>
                </Animated.View>
                <Animated.View style={[styles.secondaryFab, aiScanStyle]}>
                    <TouchableOpacity style={[styles.fab, styles.aiFab]} onPress={handleAiScan} activeOpacity={0.8}>
                        <MaterialCommunityIcons name="brain" size={22} color="white" />
                    </TouchableOpacity>
                </Animated.View>
                <TouchableOpacity style={[styles.fab, styles.mainFab]} onPress={toggleMenu} activeOpacity={0.8}>
                    <Animated.View style={{transform: [{rotate: mainFabRotate}]}}>
                        <Ionicons name="add" size={30} color="white" />
                    </Animated.View>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}