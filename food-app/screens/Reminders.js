// fyp/food-app/screens/Reminders.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, Switch, TouchableOpacity,
  Modal, TextInput, Platform, StyleSheet, SafeAreaView, Alert,
  StatusBar // <--- ADDED: Import StatusBar here
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import DropDownPicker from 'react-native-dropdown-picker';
import * as Animatable from 'react-native-animatable';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { api } from '../utils/api';
import { useTheme } from '../context/ThemeContext';

export default function RemindersScreen({ navigation }) {
    const { colors, theme } = useTheme();
    const styles = getStyles(colors);

    useEffect(() => {
        const requestPermissions = async () => {
            const { status } = await Notifications.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please enable notifications in your settings to use this feature.');
            }
        };
        requestPermissions();
    }, []);

    const [reminders, setReminders] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingReminder, setEditingReminder] = useState(null);
    const [newTime, setNewTime] = useState(new Date());
    const [newLabel, setNewLabel] = useState('');
    const [newRepeat, setNewRepeat] = useState([]);
    const [showPicker, setShowPicker] = useState(false);
    const [repeatOpen, setRepeatOpen] = useState(false);
    const [repeatItems, setRepeatItems] = useState([
        { label: 'Monday', value: 'Mon' }, { label: 'Tuesday', value: 'Tue' },
        { label: 'Wednesday', value: 'Wed' }, { label: 'Thursday', value: 'Thu' },
        { label: 'Friday', value: 'Fri' }, { label: 'Saturday', value: 'Sat' },
        { label: 'Sunday', value: 'Sun' },
    ]);

    const loadReminders = async () => {
        try {
            const serverReminders = await api.getReminders();
            setReminders(serverReminders.map(r => ({
                ...r,
                repeatDays: Array.isArray(r.repeatDays) ? r.repeatDays : [],
                notificationIDs: Array.isArray(r.notificationIDs) ? r.notificationIDs : [],
            })));
        } catch (error) {
            console.error("Failed to load reminders from server", error);
            Alert.alert("Error", "Could not load your reminders.");
        }
    };

    useFocusEffect(useCallback(() => {
        loadReminders();
    }, []));

    const scheduleNotification = async (time, label, repeatDays = []) => {
        const [hour, minute] = time.split(':').map(Number);
        const notificationIDs = [];

        if (repeatDays.length > 0) {
            const dayMap = { 'Sun': 1, 'Mon': 2, 'Tue': 3, 'Wed': 4, 'Thu': 5, 'Fri': 6, 'Sat': 7 };
            for (const day of repeatDays) {
                const trigger = { weekday: dayMap[day], hour, minute, repeats: true };
                const id = await Notifications.scheduleNotificationAsync({
                    content: { title: "GlucoBites Reminder", body: label, sound: 'default' },
                    trigger,
                });
                notificationIDs.push(id);
            }
        } else {
            let triggerDate = new Date();
            triggerDate.setHours(hour, minute, 0, 0);
            if (triggerDate < new Date()) { // If time is in the past, schedule for tomorrow
                triggerDate.setDate(triggerDate.getDate() + 1);
            }
            const id = await Notifications.scheduleNotificationAsync({
                content: { title: "GlucoBites Reminder", body: label, sound: 'default' },
                trigger: triggerDate,
            });
            notificationIDs.push(id);
        }
        return notificationIDs;
    };

    const cancelNotification = async (notificationIDs = []) => {
        for (const id of notificationIDs) {
            await Notifications.cancelScheduledNotificationAsync(id);
        }
    };

    const toggleReminder = async (id, reminder) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const newIsEnabled = !reminder.isEnabled;
        setReminders(reminders.map(r => r.reminderID === id ? { ...r, isEnabled: newIsEnabled } : r));

        try {
            if (newIsEnabled) {
                const newIDs = await scheduleNotification(reminder.time, reminder.label, reminder.repeatDays);
                await api.updateReminder(id, { ...reminder, isEnabled: true, notificationIDs: newIDs });
            } else {
                await cancelNotification(reminder.notificationIDs);
                await api.updateReminder(id, { ...reminder, isEnabled: false, notificationIDs: [] });
            }
            await loadReminders(); // Refresh the whole list to ensure sync
        } catch (error) {
            Alert.alert("Error", "Could not update the reminder.");
            loadReminders();
        }
    };

    const handleSave = async () => {
        if (!newLabel.trim()) {
            Alert.alert("Label Required", "Please enter a label for your reminder.");
            return;
        }
        const timeStr = newTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        
        try {
            if (editingReminder && editingReminder.notificationIDs) {
                await cancelNotification(editingReminder.notificationIDs);
            }
            const newNotificationIDs = await scheduleNotification(timeStr, newLabel.trim(), newRepeat);

            if (editingReminder) {
                await api.updateReminder(editingReminder.reminderID, { ...editingReminder, label: newLabel.trim(), time: timeStr, repeatDays: newRepeat, notificationIDs: newNotificationIDs });
            } else {
                await api.addReminder({ label: newLabel.trim(), time: timeStr, repeatDays: newRepeat, notificationIDs: newNotificationIDs });
            }
            resetModal();
            loadReminders();
        } catch (error) {
            Alert.alert("Save Error", "Could not save and schedule the reminder.");
        }
    };

    const handleDelete = () => {
        const deleteReminderAsync = async () => {
            try {
                await cancelNotification(editingReminder.notificationIDs);
                await api.deleteReminder(editingReminder.reminderID);
                resetModal();
                loadReminders();
            } catch (error) {
                Alert.alert("Delete Error", "Could not delete the reminder.");
            }
        };

        Alert.alert("Delete Reminder", "Are you sure you want to delete this reminder?", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: deleteReminderAsync }
        ]);
    };

    const resetModal = () => {
        setModalVisible(false); setEditingReminder(null);
        setNewTime(new Date()); setNewLabel(''); setNewRepeat([]);
    };

    const openEdit = (reminder) => {
        const [hour, minute] = reminder.time.split(':');
        const date = new Date(); date.setHours(parseInt(hour), parseInt(minute));
        setEditingReminder(reminder); setNewTime(date);
        setNewLabel(reminder.label); setNewRepeat(reminder.repeatDays || []);
        setModalVisible(true);
    };

    const formatRepeatDays = (repeat = []) => {
        if (repeat.length === 0) return 'Once';
        if (repeat.length === 7) return 'Every day';
        return repeat.join(', ');
    };

    const renderItem = ({ item, index }) => (
        <Animatable.View animation="fadeInUp" delay={index * 50}>
            <TouchableOpacity style={[styles.reminderCard, !item.isEnabled && styles.reminderCardDisabled]} onPress={() => openEdit(item)}>
                <View style={styles.reminderDetails}>
                    <Text style={[styles.reminderTime, !item.isEnabled && styles.reminderTextDisabled]}>{item.time}</Text>
                    <Text style={[styles.reminderLabel, !item.isEnabled && styles.reminderTextDisabled]} numberOfLines={1}>{item.label}</Text>
                    <Text style={[styles.reminderRepeat, !item.isEnabled && styles.reminderTextDisabled]}>{formatRepeatDays(item.repeatDays)}</Text>
                </View>
                <Switch value={!!item.isEnabled} onValueChange={() => toggleReminder(item.reminderID, item)} trackColor={{ false: '#767577', true: colors.primary }} thumbColor={item.isEnabled ? colors.primary : '#f4f3f4'} />
            </TouchableOpacity>
        </Animatable.View>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}><Ionicons name="chevron-back" size={28} color={colors.text} /></TouchableOpacity>
                <Text style={styles.title}>Reminders</Text>
                <TouchableOpacity onPress={() => { resetModal(); setModalVisible(true); }} style={styles.headerButton}><Ionicons name="add" size={28} color={colors.primary} /></TouchableOpacity>
            </View>

            <FlatList
                data={reminders}
                keyExtractor={(item) => item.reminderID.toString()}
                renderItem={renderItem}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={(
                    <Animatable.View animation="fadeIn" delay={300} style={styles.emptyContainer}>
                        <Ionicons name="alarm-outline" size={80} color={colors.textSecondary} />
                        <Text style={styles.emptyText}>No Reminders Set</Text>
                        <Text style={styles.emptySubText}>Tap the '+' button to schedule a new reminder.</Text>
                    </Animatable.View>
                )}
            />

            <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={resetModal}>
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={resetModal}>
                    <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{editingReminder ? 'Edit Reminder' : 'Add Reminder'}</Text>
                        {Platform.OS === 'ios' ? (
                           <DateTimePicker mode="time" value={newTime} onChange={(e, date) => date && setNewTime(date)} display="spinner" isDarkModeEnabled={theme === 'dark'} />
                        ) : (
                           <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.timeButtonAndroid}>
                               <Text style={styles.timeButtonTextAndroid}>{newTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                           </TouchableOpacity>
                        )}
                        {showPicker && Platform.OS === 'android' && (<DateTimePicker mode="time" value={newTime} onChange={(e, date) => { setShowPicker(false); if (date) setNewTime(date); }} isDarkModeEnabled={theme === 'dark'} />)}

                       <Text style={styles.label}>Label</Text>
                       <TextInput value={newLabel} onChangeText={setNewLabel} placeholder="e.g., Check blood sugar" placeholderTextColor={colors.textSecondary} style={styles.input} />
                       <Text style={styles.label}>Repeat On</Text>
                       <DropDownPicker open={repeatOpen} setOpen={setRepeatOpen} value={newRepeat} setValue={setNewRepeat} items={repeatItems} multiple={true} mode="BADGE" theme={theme.toUpperCase()} listMode="SCROLLVIEW" style={styles.dropdown} dropDownContainerStyle={styles.dropdownContainer} containerStyle={{ zIndex: 1000 }} />
                       <View style={[styles.buttonRow, { zIndex: -1 }]}>
                            <TouchableOpacity style={styles.modalButton} onPress={resetModal}><Text style={styles.modalButtonText}>Cancel</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleSave}><Text style={[styles.modalButtonText, {color: '#fff'}]}>Save</Text></TouchableOpacity>
                       </View>
                       {editingReminder && (<TouchableOpacity onPress={handleDelete} style={styles.deleteButton}><Text style={styles.deleteButtonText}>Delete Reminder</Text></TouchableOpacity>)}
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0, }, // <--- MODIFIED HERE
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card },
    headerButton: { padding: 5 },
    title: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
    listContainer: { paddingHorizontal: 16, paddingVertical: 8, flexGrow: 1 },
    reminderCard: { backgroundColor: colors.card, padding: 20, marginVertical: 8, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    reminderCardDisabled: { backgroundColor: colors.background },
    reminderDetails: { flex: 1, marginRight: 10 },
    reminderTime: { fontSize: 32, fontWeight: '200', color: colors.text, letterSpacing: 1 },
    reminderLabel: { fontSize: 16, color: colors.text, fontWeight: '600', marginTop: 4 },
    reminderRepeat: { fontSize: 14, color: colors.textSecondary, marginTop: 2, fontStyle: 'italic' },
    reminderTextDisabled: { color: colors.textSecondary },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: '20%'},
    emptyText: { marginTop: 16, fontSize: 18, fontWeight: '600', color: colors.textSecondary },
    emptySubText: { marginTop: 8, color: colors.border, fontSize: 14, textAlign: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: colors.card, padding: 20, borderRadius: 16, width: '100%' },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: colors.text },
    label: { marginTop: 15, marginBottom: 8, fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    input: { borderWidth: 1, borderColor: colors.border, padding: 12, borderRadius: 8, fontSize: 16, backgroundColor: colors.background, color: colors.text },
    timeButtonAndroid: { backgroundColor: colors.background, padding: 12, borderRadius: 8, marginVertical: 10, alignItems: 'center' },
    timeButtonTextAndroid: { fontSize: 20, textAlign: 'center', fontWeight: '500', color: colors.text },
    dropdown: { backgroundColor: colors.background, borderColor: colors.border },
    dropdownContainer: { borderColor: colors.border, backgroundColor: colors.card },
    buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.border },
    modalButton: { paddingVertical: 12, borderRadius: 8, flex: 1, marginHorizontal: 5, alignItems: 'center', backgroundColor: colors.background },
    modalButtonText: { fontWeight: 'bold', fontSize: 16, color: colors.text },
    saveButton: { backgroundColor: colors.primary },
    deleteButton: { marginTop: 20, alignItems: 'center' },
    deleteButtonText: { color: colors.logoutText, fontWeight: '600', fontSize: 15 }
});