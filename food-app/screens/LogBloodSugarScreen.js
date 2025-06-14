// screens/LogBloodSugarScreen.js
import React, { useState, useEffect } from 'react';
import { 
    View, Text, TextInput, Button, StyleSheet, Alert, 
    TouchableOpacity, ActivityIndicator, Modal, FlatList, 
    KeyboardAvoidingView, Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

// API URLs
const BASE_URL = 'http://192.168.10.121:3000/api';
const LOGS_URL = `${BASE_URL}/logs/bloodsugar`;
const HISTORY_URL = `${LOGS_URL}/history`;
const OCR_URL = `${BASE_URL}/ocr/aws-parse-image`;

//API Helper Object
const api = {
    getHistory: async (userId) => {
        const response = await fetch(`${HISTORY_URL}/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch history');
        return response.json();
    },
    addLog: async (userId, amount) => {
        const response = await fetch(LOGS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, amount, date: new Date().toISOString() }),
        });
        return response.json();
    },
    updateLog: async (logId, amount) => {
        const response = await fetch(`${LOGS_URL}/${logId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount }),
        });
        return response.json();
    },
    deleteLog: async (logId) => {
        const response = await fetch(`${LOGS_URL}/${logId}`, { method: 'DELETE' });
        return response.json();
    },
    scanImage: async (base64) => {
        const response = await fetch(OCR_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64 }),
        });
        return response.json();
    },
};

//  EditModal Component
const EditLogModal = ({ modalVisible, setModalVisible, log, onSave, onDelete, onScan }) => {
    const [inputValue, setInputValue] = useState(String(log?.amount || ''));
    const [isSaving, setIsSaving] = useState(false);
    const [isScanning, setIsScanning] = useState(false);

    useEffect(() => {
        if (modalVisible) {
            setInputValue(String(log?.amount || ''));
        }
    }, [log, modalVisible]);

    if (!log) {
        return null;
    }

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);
        await onSave(log.logID, inputValue);
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
                        {log.logID && 
                            <TouchableOpacity onPress={handleDelete}>
                                <Text style={[styles.modalButtonText, { color: '#FF3B30' }]}>Delete</Text>
                            </TouchableOpacity>
                        }
                        <TouchableOpacity onPress={handleSave} disabled={isSaving}>
                             <Text style={[styles.modalButtonText, { fontWeight: 'bold' }]}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// Main Screen Component 
const LogBloodSugarScreen = ({ navigation, route }) => {
    const { userId } = route.params;

    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedLog, setSelectedLog] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const historyData = await api.getHistory(userId);
            setHistory(historyData);
        } catch (error) {
            Alert.alert("Error", "Could not load reading history.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (userId) loadData();
    }, [userId]);

    const handleSave = async (logId, amount) => {
        try {
            const apiCall = logId ? api.updateLog : api.addLog;
            const params = logId ? [logId, amount] : [userId, amount];
            const result = await apiCall(...params);
            
            if (result.success !== false) {
                 Alert.alert('Success', result.message || 'Operation successful.');
            } else {
                 Alert.alert('Error', result.message || 'Operation failed.');
            }
        } catch(e) {
            Alert.alert('Error', 'An unexpected error occurred.');
        }
        loadData();
    };

    const handleDelete = async (logId) => {
        try {
            const result = await api.deleteLog(logId);
            Alert.alert(result.message || 'Operation failed.');
        } catch(e) {
            Alert.alert('Error', 'An unexpected error occurred.');
        }
        loadData();
    };
    
    const handleScan = async (imageUri) => {
        try {
            const manipulated = await manipulateAsync(imageUri, [{ resize: { width: 1080 } }], { compress: 0.9, format: SaveFormat.JPEG, base64: true });
            const result = await api.scanImage(manipulated.base64);
            if (result.number) {
                Alert.alert('Scan Successful', `Detected: ${result.number}`);
                return result.number;
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
        setModalVisible(true);
    };

    const handleAddNew = () => {
        setSelectedLog({ amount: '' });
        setModalVisible(true);
    };

    const lastReading = history.length > 0 ? history[0] : null;

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
        if (isLoading) {
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
        return <Text style={styles.noDataText}>No readings yet. Press '+' to add one!</Text>;
    };

    return (
        <View style={styles.container}>
            <EditLogModal 
                modalVisible={modalVisible}
                setModalVisible={setModalVisible}
                log={selectedLog}
                onSave={handleSave}
                onDelete={handleDelete}
                onScan={handleScan}
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
                disabled={isLoading}
            >
                <Text style={styles.cardTitle}><Ionicons name="water" size={16} color="#007AFF" /> Last Reading</Text>
                {renderLastReadingContent()}
            </TouchableOpacity>

            <View style={styles.historyContainer}>
                <Text style={styles.cardTitle}><Ionicons name="analytics" size={16} color="#007AFF" /> Reading History</Text>
                <View style={styles.historyHeader}>
                    <Text style={[styles.historyHeaderText, {flex: 2}]}>Date</Text>
                    <Text style={[styles.historyHeaderText, {flex: 1.5}]}>Time</Text>
                    <Text style={[styles.historyHeaderText, {flex: 1, textAlign: 'right'}]}>Value</Text>
                </View>
                <FlatList
                    data={history.slice(1)}
                    renderItem={renderHistoryItem}
                    keyExtractor={item => item.logID.toString()}
                    ListEmptyComponent={<Text style={styles.noDataText}>No previous history.</Text>}
                />
            </View>
             
            <TouchableOpacity style={styles.fab} onPress={handleAddNew}>
                <Ionicons name="add" size={30} color="white" />
            </TouchableOpacity>
        </View>
    );
};

//STYLES 
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F2F5', paddingTop: 15, paddingHorizontal: 15 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, marginBottom: 5, },
    headerTitle: { fontSize: 28, fontWeight: 'bold' },
    doneButton: { fontSize: 17, color: '#007AFF', fontWeight: '600' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    spinner: { marginVertical: 20 },
    lastReadingCard: { backgroundColor: 'white', padding: 20, borderRadius: 12, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.20, shadowRadius: 1.41, elevation: 2 },
    historyContainer: { flex: 1, backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 20, paddingTop: 20 },
    cardTitle: { fontSize: 16, fontWeight: '600', color: '#555', marginBottom: 10 },
    lastReadingValue: { fontSize: 48, fontWeight: 'bold', color: '#111' },
    lastReadingUnit: { fontSize: 24, fontWeight: 'normal', color: '#777' },
    cardDate: { marginTop: 10, color: '#555', alignItems: 'center' },
    noDataText: { textAlign: 'center', padding: 20, color: '#888' },
    historyHeader: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#EEE', paddingBottom: 10 },
    historyHeaderText: { fontWeight: 'bold', color: '#555' },
    historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#EEE' },
    historyText: { fontSize: 14 },
    historyValue: { fontSize: 14, fontWeight: 'bold' },
    historyUnit: { fontWeight: 'normal', color: '#555' },
    fab: { position: 'absolute', margin: 16, right: 10, bottom: 10, backgroundColor: '#007AFF', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#000', shadowRadius: 5, shadowOpacity: 0.3, shadowOffset: { height: 2, width: 0 } },
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { backgroundColor: '#F0F2F5', paddingHorizontal: 20, paddingTop: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    modalTitle: { fontSize: 16, fontWeight: '600', color: '#888', textAlign: 'center', marginBottom: 15 },
    modalInput: { backgroundColor: '#FFFFFF', borderColor: '#E0E0E0', borderWidth: 1, borderRadius: 10, padding: 15, fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    scanButtonsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
    scanButton: { flex: 1, flexDirection: 'row', backgroundColor: '#007AFF', paddingVertical: 14, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginHorizontal: 5 },
    scanButtonText: { color: '#fff', marginLeft: 8, fontWeight: '600', fontSize: 16 },
    modalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
    modalButtonText: { color: '#007AFF', fontSize: 17, padding: 10 },
});

export default LogBloodSugarScreen;