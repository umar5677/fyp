// screens/Reminders.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, Switch, TouchableOpacity,
  Modal, TextInput, Platform, StyleSheet, SafeAreaView, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { showMessage } from 'react-native-flash-message';
import DropDownPicker from 'react-native-dropdown-picker';
import * as Animatable from 'react-native-animatable';
import * as Haptics from 'expo-haptics';
// --- NEW: Import StatusBar ---
import { StatusBar } from 'react-native';

export default function RemindersScreen({ navigation }) {
  // ... (all existing state and functions up to the return statement remain the same)
  const [reminders, setReminders] = useState([]);
  const remindersRef = useRef([]);
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

  useEffect(() => {
    loadReminders();
    let intervalId = null;
    const now = new Date();
    const delay = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    const timeoutId = setTimeout(() => {
      checkReminders(); 
      intervalId = setInterval(checkReminders, 60000); 
    }, delay);
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  useEffect(() => { remindersRef.current = reminders; }, [reminders]);

  const loadReminders = async () => {
    try {
        const saved = await AsyncStorage.getItem('reminders');
        if (saved) {
            const parsed = JSON.parse(saved).map(r => ({ ...r, repeat: Array.isArray(r.repeat) ? r.repeat : [] }));
            setReminders(parsed);
        }
    } catch (error) {
        console.error("Failed to load reminders", error);
    }
  };

  const checkReminders = async () => {
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const currentDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()];
    for (const reminder of remindersRef.current) {
      if (reminder.enabled && reminder.time === currentTime && (reminder.repeat.length === 0 || reminder.repeat.includes(currentDay))) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showMessage({ message: reminder.label, type: 'info', icon: 'info', duration: 5000 });
        const existing = await AsyncStorage.getItem('notifications');
        const notifications = existing ? JSON.parse(existing) : [];
        notifications.unshift({ id: Date.now(), message: reminder.label, type: 'reminder', timestamp: now.toISOString() });
        await AsyncStorage.setItem('notifications', JSON.stringify(notifications));
      }
    }
  };

  const saveReminders = async (updatedReminders) => {
    setReminders(updatedReminders);
    await AsyncStorage.setItem('reminders', JSON.stringify(updatedReminders));
  };

  const toggleReminder = (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const updated = reminders.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r);
    saveReminders(updated);
  };

  const handleSave = () => {
    if (!newLabel.trim()) {
        Alert.alert("Label Required", "Please enter a label for your reminder.");
        return;
    }
    const timeStr = newTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const reminderData = { id: editingReminder?.id || Date.now(), time: timeStr, label: newLabel.trim(), repeat: newRepeat, enabled: true };
    const updated = editingReminder ? reminders.map(r => r.id === reminderData.id ? reminderData : r) : [...reminders, reminderData];
    saveReminders(updated);
    resetModal();
  };

  const handleDelete = () => {
    Alert.alert("Delete Reminder", "Are you sure you want to delete this reminder?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => {
            const updated = reminders.filter(r => r.id !== editingReminder.id);
            saveReminders(updated);
            resetModal();
        }}
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
    setNewLabel(reminder.label); setNewRepeat(reminder.repeat);
    setModalVisible(true);
  };

  const formatRepeatDays = (repeat) => {
    if (repeat.length === 0) return 'Does not repeat';
    if (repeat.length === 7) return 'Every day';
    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const weekends = ['Sat', 'Sun'];
    if (weekdays.every(d => repeat.includes(d)) && weekdays.length === repeat.length) return 'Weekdays';
    if (weekends.every(d => repeat.includes(d)) && weekends.length === repeat.length) return 'Weekends';
    return repeat.join(', ');
  };
  
  const renderItem = ({ item, index }) => (
    <Animatable.View animation="fadeInUp" delay={index * 50}>
        <TouchableOpacity style={[styles.reminderCard, !item.enabled && styles.reminderCardDisabled]} onPress={() => openEdit(item)}>
            <View style={styles.reminderDetails}>
                <Text style={[styles.reminderTime, !item.enabled && styles.reminderTextDisabled]}>{item.time}</Text>
                <Text style={[styles.reminderLabel, !item.enabled && styles.reminderTextDisabled]} numberOfLines={1}>{item.label}</Text>
                <Text style={[styles.reminderRepeat, !item.enabled && styles.reminderTextDisabled]}>{formatRepeatDays(item.repeat)}</Text>
            </View>
            <Switch value={item.enabled} onValueChange={() => toggleReminder(item.id)} trackColor={{ false: '#E5E7EB', true: '#86EFAC' }} thumbColor={item.enabled ? '#22C55E' : '#f4f3f4'} />
        </TouchableOpacity>
    </Animatable.View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Reminders</Text>
        <TouchableOpacity onPress={() => { resetModal(); setModalVisible(true); }} style={styles.headerButton}>
            <Ionicons name="add" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={reminders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
            <Animatable.View animation="fadeIn" delay={300} style={styles.emptyContainer}>
                <Ionicons name="alarm-outline" size={80} color="#D1D5DB" />
                <Text style={styles.emptyText}>No Reminders Set</Text>
                <Text style={styles.emptySubText}>Tap the '+' button to schedule a new reminder.</Text>
            </Animatable.View>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={resetModal}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={resetModal}>
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingReminder ? 'Edit Reminder' : 'Add Reminder'}</Text>
            
            <View style={styles.iosPickerWrapper}>
                {Platform.OS === 'ios' ? (
                    <DateTimePicker
                        mode="time"
                        value={newTime}
                        onChange={(e, date) => date && setNewTime(date)}
                        display="spinner"
                    />
                ) : (
                    <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.timeButtonAndroid}>
                        <Text style={styles.timeButtonTextAndroid}>{newTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                    </TouchableOpacity>
                )}
            </View>

            {showPicker && Platform.OS === 'android' && (
              <DateTimePicker mode="time" value={newTime} onChange={(e, date) => { setShowPicker(false); if (date) setNewTime(date); }} />
            )}
            
            <Text style={styles.label}>Label</Text>
            <TextInput 
                value={newLabel} 
                onChangeText={setNewLabel} 
                placeholder="e.g., Check blood sugar" 
                placeholderTextColor="#9CA3AF"
                style={styles.input} 
            />

            <Text style={styles.label}>Repeat On</Text>
            <DropDownPicker
              open={repeatOpen} setOpen={setRepeatOpen}
              value={newRepeat} setValue={setNewRepeat}
              items={repeatItems} setItems={setRepeatItems}
              multiple={true} mode="BADGE" theme="LIGHT"
              placeholder="Select days (or leave blank for once)"
              listMode="SCROLLVIEW"
              style={styles.dropdown}
              dropDownContainerStyle={styles.dropdownContainer}
              containerStyle={{ zIndex: 1000 }}
            />

            <View style={[styles.buttonRow, { zIndex: -1 }]}>
              <TouchableOpacity style={styles.modalButton} onPress={resetModal}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleSave}>
                <Text style={[styles.modalButtonText, {color: '#fff'}]}>Save</Text>
              </TouchableOpacity>
            </View>
            {editingReminder && (
                <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
                    <Text style={styles.deleteButtonText}>Delete Reminder</Text>
                </TouchableOpacity>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    safeArea: { 
        flex: 1, 
        backgroundColor: '#F9FAFB',
        // --- FIX: Add padding for the Android status bar ---
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    headerButton: { padding: 5 },
    title: { color: '#111827', fontSize: 20, fontWeight: 'bold' },
    listContainer: { paddingHorizontal: 16, paddingVertical: 8, flexGrow: 1 },
    reminderCard: { backgroundColor: '#fff', padding: 20, marginVertical: 8, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
    reminderCardDisabled: { backgroundColor: '#F3F4F6' },
    reminderDetails: { flex: 1, marginRight: 10 },
    reminderTime: { fontSize: 32, fontWeight: '200', color: '#1F2937', letterSpacing: 1 },
    reminderLabel: { fontSize: 16, color: '#1F2937', fontWeight: '600', marginTop: 4 },
    reminderRepeat: { fontSize: 14, color: '#6B7280', marginTop: 2, fontStyle: 'italic' },
    reminderTextDisabled: { color: '#9CA3AF' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: '20%'},
    emptyText: { marginTop: 16, fontSize: 18, fontWeight: '600', color: '#9CA3AF' },
    emptySubText: { marginTop: 8, color: '#D1D5DB', fontSize: 14, textAlign: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    modalContent: { backgroundColor: 'white', padding: 20, borderRadius: 16, width: '100%', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
    iosPickerWrapper: {
        backgroundColor: '#E5E7EB',
        borderRadius: 10,
        marginVertical: 5,
        overflow: 'hidden',
    },
    timeButtonAndroid: { backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8, marginVertical: 10, alignItems: 'center' },
    timeButtonTextAndroid: { fontSize: 20, textAlign: 'center', fontWeight: '500' },
    label: { marginTop: 15, marginBottom: 8, fontSize: 14, fontWeight: '600', color: '#374151' },
    input: { 
        borderWidth: 1, 
        borderColor: '#D1D5DB', 
        padding: 12, 
        borderRadius: 8, 
        fontSize: 16, 
        backgroundColor: '#F9FAFB'
    },
    dropdown: { backgroundColor: '#F9FAFB', borderColor: '#D1D5DB' },
    dropdownContainer: { borderColor: '#D1D5DB' },
    buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
    modalButton: { paddingVertical: 12, borderRadius: 8, flex: 1, marginHorizontal: 5, alignItems: 'center', backgroundColor: '#E5E7EB' },
    modalButtonText: { fontWeight: 'bold', fontSize: 16, color: '#374151' },
    saveButton: { backgroundColor: '#007AFF' },
    deleteButton: { marginTop: 20, alignItems: 'center' },
    deleteButtonText: { color: '#EF4444', fontWeight: '600', fontSize: 15 }
});