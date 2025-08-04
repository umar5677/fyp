import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, StyleSheet, Alert,
    TouchableOpacity, ActivityIndicator, Modal,
    KeyboardAvoidingView, Platform, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import DateTimePickerModal from "react-native-modal-datetime-picker";
import * as Animatable from 'react-native-animatable';
import { useTheme } from '../context/ThemeContext';

const TAG_OPTIONS = ['Fasting', 'Pre-Meal', 'Post-Meal'];

const TagSelector = ({ selectedTag, onSelectTag, colors }) => {
    const styles = getStyles(colors);
    return (
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
};

const EditModal = ({ modalVisible, setModalVisible, log, onSave, onDelete, onScan, onSyncDevice, colors, initialValue }) => {
    const { theme } = useTheme();
    const styles = getStyles(colors);
    const [isSaving, setIsSaving] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [logDate, setLogDate] = useState(new Date());
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const [tag, setTag] = useState(null);
    const [inputValue, setInputValue] = useState('');
    const today = new Date();

    useEffect(() => {
        if (modalVisible) {
            setInputValue(initialValue || String(log?.amount || ''));
            setLogDate(log?.date ? new Date(log.date) : new Date());
            setTag(log?.tag || null);
        }
    }, [log, modalVisible, initialValue]);

    if (!log) return null;

    const handleSave = async () => {
        if (!tag) {
            Alert.alert("Tag Required", "Please select a tag for this reading.");
            return;
        }
        if (!inputValue.trim()) {
            Alert.alert("Value Required", "Please enter a value.");
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
    
    const handleSyncFromDevice = async () => {
        setIsSyncing(true);
        const data = await onSyncDevice();
        setIsSyncing(false);
        if (data) { 
             setModalVisible(false);
        }
    };


    return (
        <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setModalVisible(false)} />
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>{log.logID ? 'Edit Reading' : 'Log New Reading'}</Text>
                    <TouchableOpacity onPress={() => setDatePickerVisibility(true)} style={styles.datePickerButton} disabled={!!log.logID}>
                        <Ionicons name="calendar-outline" size={22} color="#FB923C" />
                        <Text style={styles.datePickerText}>{logDate.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</Text>
                    </TouchableOpacity>
                    <DateTimePickerModal 
                        isVisible={isDatePickerVisible} mode="datetime" date={logDate}
                        onConfirm={(d) => { setDatePickerVisibility(false); setLogDate(d); }} 
                        onCancel={() => setDatePickerVisibility(false)}
                        display={Platform.OS === 'ios' ? 'inline' : 'default'}
                        isDarkModeEnabled={theme === 'dark'} maximumDate={today} 
                    />
                    
                    <TagSelector selectedTag={tag} onSelectTag={setTag} colors={colors} />
                    
                    <TextInput style={styles.modalInput} value={inputValue} onChangeText={setInputValue} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.textSecondary} autoFocus={!log.logID} />
                    
                    {(isScanning || isSyncing) ? <ActivityIndicator color={colors.primary} /> : (
                        <View style={styles.inputMethodsContainer}>
                            <Text style={styles.inputMethodLabel}>Add via Image</Text>
                            <View style={styles.imageButtonsRow}>
                                <TouchableOpacity style={styles.methodButton} onPress={() => handlePickImage('camera')}>
                                    <Ionicons name="camera-outline" size={20} color={colors.primary} /><Text style={styles.methodButtonText}>Scan</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.methodButton} onPress={() => handlePickImage('gallery')}>
                                    <Ionicons name="image-outline" size={20} color={colors.primary} /><Text style={styles.methodButtonText}>Upload</Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity style={[styles.methodButton, styles.fullWidthButton]} onPress={handleSyncFromDevice}>
                                <Ionicons name="bluetooth" size={20} color={colors.primary} /><Text style={styles.methodButtonText}>Sync Device</Text>
                            </TouchableOpacity>
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

export default function LogBloodSugarModal({ log, onSave, onDelete, onScan, onAddNew, onSyncDevice, clearSelectedLog }) {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const fabRef = useRef(null);
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        if (log && log.logID) {
            setModalVisible(true);
        }
    }, [log]);

    const handleAddNewPress = () => {
        fabRef.current?.rubberBand(800);
        onAddNew(() => setModalVisible(true));
    };

    const handleModalClose = () => {
        setModalVisible(false);
        if (clearSelectedLog) { clearSelectedLog(); }
    };

    return (
        <>
            <EditModal 
                modalVisible={modalVisible} 
                setModalVisible={handleModalClose}
                log={log} 
                onSave={onSave}
                onDelete={onDelete} 
                onScan={onScan} 
                onSyncDevice={onSyncDevice}
                colors={colors}
                initialValue={null}
            />
             <Animatable.View ref={fabRef} style={styles.fabContainer}>
                <TouchableOpacity style={[styles.fab, styles.mainFab]} onPress={handleAddNewPress} activeOpacity={0.8}>
                    <Ionicons name="add" size={30} color="white" />
                </TouchableOpacity>
            </Animatable.View>
        </>
    );
}

const getStyles = (colors) => StyleSheet.create({
    fabContainer: { position: 'absolute', bottom: 35, right: 25, alignItems: 'center' },
    fab: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowRadius: 4, shadowOpacity: 0.3, shadowOffset: { height: 3, width: 0 } },
    mainFab: { backgroundColor: colors.primary, width: 60, height: 60, borderRadius: 30, },
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { backgroundColor: colors.background, paddingHorizontal: 20, paddingTop: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    modalTitle: { fontSize: 16, fontWeight: '600', color: colors.textSecondary, textAlign: 'center', marginBottom: 15 },
    tagSelectorContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    tagOption: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.border, marginHorizontal: 4, alignItems: 'center' },
    tagOptionSelected: { backgroundColor: colors.primary },
    tagOptionText: { color: colors.text, fontWeight: '600' },
    tagOptionTextSelected: { color: 'white' },
    modalInput: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 15, fontSize: 36, fontWeight: 'bold', textAlign: 'center', marginBottom: 20, color: colors.text },
    datePickerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, backgroundColor: colors.card, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: colors.border },
    datePickerText: { marginLeft: 12, fontSize: 17, fontWeight: '600', color: colors.primary },
    inputMethodsContainer: { alignItems: 'center', marginBottom: 25, width: '100%' },
    inputMethodLabel: { color: colors.textSecondary, fontSize: 14, fontWeight: '500', marginBottom: 10, },
    imageButtonsRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: 10, },
    methodButton: { flexDirection: 'row', backgroundColor: colors.card, paddingVertical: 14, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginHorizontal: 5, borderWidth: 1, borderColor: colors.border, flex: 1 },
    fullWidthButton: { width: '100%', marginTop: 5, flex: 0 }, 
    methodButtonText: { color: colors.primary, marginLeft: 8, fontWeight: '600', fontSize: 16 },
    
    modalActions: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginTop: 10 },
    modalButtonText: { color: colors.primary, fontSize: 17, padding: 10, fontWeight: '500' },
});