// screens/LogCalorieSugarScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, FlatList, Modal, ActivityIndicator, SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const BASE_URL = 'http://192.168.0.120:3000/api';
const LOGS_URL = `${BASE_URL}/logs/caloriesugar`;
const HISTORY_URL = `${LOGS_URL}/history`;
const OCR_URL = `${BASE_URL}/ocr/aws-parse-image`; // Assuming it's the same OCR endpoint

export default function LogCalorieSugarScreen({ navigation, route }) {
  const { userId } = route.params;
  const [history, setHistory] = useState([]);
  const [groupedHistory, setGroupedHistory] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [scannedValues, setScannedValues] = useState({ calories: '', sugar: '' });
  const [editingLogs, setEditingLogs] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  const loadHistory = async () => {
    try {
      const res = await fetch(`${HISTORY_URL}/${userId}`);
      const data = await res.json();
      if (res.ok) {
        setHistory(data);
  
        const grouped = [];
        // Grouping by a tight time threshold to combine calorie and sugar entries
        const timeThreshold = 5000; // 5 seconds
  
        data.sort((a, b) => new Date(b.date) - new Date(a.date));
  
        const tempGroups = {};
        data.forEach(log => {
            const logTime = new Date(log.date).getTime();
            let foundGroup = false;
            for (const key in tempGroups) {
                if (Math.abs(logTime - key) < timeThreshold) {
                    tempGroups[key].push(log);
                    foundGroup = true;
                    break;
                }
            }
            if (!foundGroup) {
                tempGroups[logTime] = [log];
            }
        });
  
        const finalGrouped = Object.values(tempGroups).map(logs => ({
            timestamp: logs[0].date,
            logs: logs.sort((a, b) => a.type - b.type), // Ensure calories come first
        }));
        
        setGroupedHistory(finalGrouped);

      } else {
        throw new Error(data.message || 'Failed to load history');
      }
    } catch(err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleScan = async (launchFn) => {
    // The current server endpoint is for blood sugar.
    Alert.alert("Not Implemented", "OCR for nutrition labels is not yet connected.");
  };

  const handleSave = async () => {
    try {
      const entries = [];
      if (scannedValues.calories) entries.push({ type: 1, amount: parseFloat(scannedValues.calories) });
      if (scannedValues.sugar) entries.push({ type: 2, amount: parseFloat(scannedValues.sugar) });

      if (editingLogs) {
        // Update logic
        const calLog = editingLogs.find(l => l.type === 1);
        const sugLog = editingLogs.find(l => l.type === 2);
        if (calLog) await fetch(`${LOGS_URL}/${calLog.logID}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: parseFloat(scannedValues.calories) }) });
        if (sugLog) await fetch(`${LOGS_URL}/${sugLog.logID}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: parseFloat(scannedValues.sugar) }) });

      } else {
        // Add new logic
        const date = new Date().toISOString();
        for (const entry of entries) {
          await fetch(LOGS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, amount: entry.amount, type: entry.type, date })
          });
        }
      }
      setModalVisible(false);
      setEditingLogs(null);
      loadHistory();
    } catch {
      Alert.alert('Failed to save log');
    }
  };

  const handleEditGroup = (logs) => {
    const calorie = logs.find(l => l.type === 1);
    const sugar = logs.find(l => l.type === 2);
    setScannedValues({
      calories: calorie?.amount?.toString() ?? '',
      sugar: sugar?.amount?.toString() ?? ''
    });
    setEditingLogs(logs);
    setModalVisible(true);
  };

  const handleDeleteGroup = (logs) => {
    Alert.alert('Confirm Delete', 'Delete this log entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            for (const log of logs) {
              await fetch(`${LOGS_URL}/${log.logID}`, { method: 'DELETE' });
            }
            loadHistory();
          } catch {
            Alert.alert('Failed to delete log');
          }
        }
      }
    ]);
  };

  const handleAddNew = () => {
    setScannedValues({ calories: '', sugar: '' });
    setEditingLogs(null);
    setModalVisible(true);
  };

  useEffect(() => { loadHistory(); }, []);

  const today = new Date().toISOString().split('T')[0];
  const todayLogs = history.filter(log => log.date.startsWith(today));
  const totalCalories = todayLogs.filter(l => l.type === 1).reduce((sum, l) => sum + Number(l.amount || 0), 0);
  const totalSugar = todayLogs.filter(l => l.type === 2).reduce((sum, l) => sum + Number(l.amount || 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingLogs ? "Edit Log" : "Log Calories & Sugar"}</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="decimal-pad"
              value={scannedValues.calories}
              onChangeText={(val) => setScannedValues({ ...scannedValues, calories: val })}
              placeholder="Calories (kcal)"
              placeholderTextColor="#999"
            />
            <TextInput
              style={styles.modalInput}
              keyboardType="decimal-pad"
              value={scannedValues.sugar}
              onChangeText={(val) => setScannedValues({ ...scannedValues, sugar: val })}
              placeholder="Sugar (g)"
              placeholderTextColor="#999"
            />
            {isScanning ? <ActivityIndicator /> : (
              <View style={styles.scanButtonsContainer}>
                <TouchableOpacity style={styles.scanButton} onPress={() => handleScan({ permission: ImagePicker.requestCameraPermissionsAsync, launch: ImagePicker.launchCameraAsync })}>
                  <Ionicons name="camera-outline" size={20} color="#fff" />
                  <Text style={styles.scanButtonText}>Scan</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.scanButton} onPress={() => handleScan({ permission: ImagePicker.requestMediaLibraryPermissionsAsync, launch: ImagePicker.launchImageLibraryAsync })}>
                  <Ionicons name="image-outline" size={20} color="#fff" />
                  <Text style={styles.scanButtonText}>Upload</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.modalButtonText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSave}><Text style={[styles.modalButtonText, { fontWeight: 'bold' }]}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Calorie & Sugar</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.doneButton}>Done</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.summaryBox}>
        <Text style={styles.summaryText}>Today</Text>
        <Text style={styles.summaryReading}>🔥 {totalCalories.toFixed(0)} kcal    🍬 {totalSugar.toFixed(1)} g</Text>
      </View>

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
                            <View style={styles.logRow}>
                                <Text style={styles.historyLabel}>🔥 Calories:</Text>
                                <Text style={styles.historyValue}>{parseFloat(calorieLog?.amount || 0).toFixed(0)} kcal</Text>
                            </View>
                            <View style={styles.logRow}>
                                <Text style={styles.historyLabel}>🍬 Sugar:</Text>
                                <Text style={[styles.historyValue, sugarLog && parseFloat(sugarLog.amount) > 15 ? { color: 'red' } : {}]}>{parseFloat(sugarLog?.amount || 0).toFixed(1)} g</Text>
                            </View>
                        </View>
                        <View style={styles.actionsRow}>
                            <TouchableOpacity onPress={() => handleEditGroup(item.logs)}>
                                <Ionicons name="pencil-outline" size={24} color="#007AFF" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDeleteGroup(item.logs)}>
                                <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            );
        }}
        ListEmptyComponent={<Text style={styles.noData}>No logs available</Text>}
      />

      <TouchableOpacity style={styles.fab} onPress={handleAddNew}>
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#F0F2F5',
    },
    header: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingTop: Platform.OS === 'android' ? 25 : 15,
        paddingBottom: 10,
    },
    headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#333' },
    doneButton: { color: '#007AFF', fontSize: 17, fontWeight: '600' },
    summaryBox: { 
        padding: 16, 
        backgroundColor: '#fff', 
        borderRadius: 12, 
        marginHorizontal: 15,
        marginBottom: 15,
        elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
    },
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