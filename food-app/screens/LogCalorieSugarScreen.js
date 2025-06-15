// screens/LogCalorieSugarScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, FlatList, Modal, ActivityIndicator, SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

// Import the centralized, JWT-aware api object
import { api } from '../utils/api';

// --- EditModal Component (Defined once at the top level for stability) ---
const EditCalorieSugarModal = ({ modalVisible, setModalVisible, logs, onSave, onScan }) => {
    // 1. All hooks are called unconditionally at the top.
    const [calories, setCalories] = useState('');
    const [sugar, setSugar] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    
    // 2. The useEffect hook is also at the top, before any returns.
    useEffect(() => {
        if (modalVisible && logs) {
            const calorieLog = logs.find(l => l.type === 1);
            const sugarLog = logs.find(l => l.type === 2);
            setCalories(calorieLog?.amount?.toString() || '');
            setSugar(sugarLog?.amount?.toString() || '');
        }
    }, [logs, modalVisible]);

    // 3. The conditional return happens AFTER all hooks have been called.
    if (!logs) {
        return null;
    }

    const handleSave = async () => {
        setIsSaving(true);
        await onSave(logs, { calories, sugar });
        setIsSaving(false);
        setModalVisible(false);
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
export default function LogCalorieSugarScreen({ navigation, route }) {
    const [history, setHistory] = useState([]);
    const [groupedHistory, setGroupedHistory] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingLogs, setEditingLogs] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadHistory = async () => {
        setIsLoading(true);
        try {
            const data = await api.getHistory([1, 2]);
            setHistory(data);

            data.sort((a, b) => new Date(b.date) - new Date(a.date));
            const tempGroups = {};
            const timeThreshold = 5000;

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
                timestamp: logs[0].date,
                logs: logs.sort((a, b) => a.type - b.type),
            }));
            setGroupedHistory(finalGrouped);
        } catch (err) {
            Alert.alert('Error', 'Failed to load history.');
        } finally {
            setIsLoading(false);
        }
    };

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

    const handleSave = async (logsToEdit, newValues) => {
        try {
            const hasCalories = newValues.calories && !isNaN(parseFloat(newValues.calories));
            const hasSugar = newValues.sugar && !isNaN(parseFloat(newValues.sugar));

            if (logsToEdit && logsToEdit.length > 0) {
                const calLog = logsToEdit.find(l => l.type === 1);
                const sugLog = logsToEdit.find(l => l.type === 2);
                if (calLog && hasCalories) await api.updateLog(calLog.logID, parseFloat(newValues.calories));
                if (sugLog && hasSugar) await api.updateLog(sugLog.logID, parseFloat(newValues.sugar));
            } else {
                if (hasCalories) await api.addLog({ amount: parseFloat(newValues.calories), type: 1 });
                if (hasSugar) await api.addLog({ amount: parseFloat(newValues.sugar), type: 2 });
            }
            loadHistory();
        } catch (error) {
            Alert.alert('Error', 'Failed to save log.');
        }
    };

    const handleDeleteGroup = (logs) => {
        Alert.alert('Confirm Delete', 'Are you sure you want to delete this log entry?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        for (const log of logs) {
                            await api.deleteLog(log.logID);
                        }
                        loadHistory();
                    } catch {
                        Alert.alert('Error', 'Failed to delete log entry.');
                    }
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

    useEffect(() => { loadHistory(); }, []);

    const today = new Date().toISOString().split('T')[0];
    const todayLogs = history.filter(log => log.date.startsWith(today));
    const totalCalories = todayLogs.filter(l => l.type === 1).reduce((sum, l) => sum + Number(l.amount || 0), 0);
    const totalSugar = todayLogs.filter(l => l.type === 2).reduce((sum, l) => sum + Number(l.amount || 0), 0);

    return (
        <SafeAreaView style={styles.container}>
            <EditCalorieSugarModal
                modalVisible={modalVisible}
                setModalVisible={setModalVisible}
                logs={editingLogs}
                onSave={handleSave}
                onScan={handleScan}
            />
            
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Calorie & Sugar</Text>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.doneButton}>Done</Text>
                </TouchableOpacity>
            </View>
            
            <View style={styles.summaryBox}>
                <Text style={styles.summaryText}>Today</Text>
                <Text style={styles.summaryReading}>🔥 {totalCalories.toFixed(0)} kcal    🍬 {totalSugar.toFixed(1)} g</Text>
            </View>

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
                    ListEmptyComponent={<Text style={styles.noData}>No logs available</Text>}
                />
            }

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
    scanButtonsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    scanButton: { flex: 1, flexDirection: 'row', backgroundColor: '#007AFF', padding: 12, marginHorizontal: 5, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    scanButtonText: { color: 'white', marginLeft: 6, fontSize: 16 },
    modalActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
    modalButtonText: { fontSize: 16, padding: 10, color: '#007AFF' },
    fab: { backgroundColor: '#007AFF', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', position: 'absolute', bottom: 30, right: 30, elevation: 8 }
});