// screens/LogCalorieSugarScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, FlatList, Modal, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const BASE_URL = 'http://192.168.0.120:3000/api';
const LOGS_URL = `${BASE_URL}/logs/caloriesugar`;
const HISTORY_URL = `${LOGS_URL}/history`;
const OCR_URL = `${BASE_URL}/ocr/aws-parse-image`;

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
      setHistory(data); // ✅ fix: ensure today summary has data

      const grouped = [];
      const timeThreshold = 2000;

      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      for (let i = 0; i < data.length; i++) {
        const current = data[i];
        const currentDate = new Date(current.date);
        const lastGroup = grouped[grouped.length - 1];

        if (lastGroup && Math.abs(new Date(lastGroup.timestamp) - currentDate) < timeThreshold) {
          lastGroup.logs.push(current);
        } else {
          grouped.push({ timestamp: current.date, logs: [current] });
        }
      }

      setGroupedHistory(grouped);
    } catch {
      Alert.alert('Failed to load history');
    }
  };

  const handleScan = async (launchFn) => {
    const permission = await launchFn.permission();
    if (!permission.granted) return Alert.alert('Permission Denied');

    const picker = await launchFn.launch();
    if (picker.canceled || !picker.assets?.length) return;

    setIsScanning(true);
    const manipulated = await manipulateAsync(picker.assets[0].uri, [{ resize: { width: 1080 } }], {
      compress: 0.8, format: SaveFormat.JPEG, base64: true
    });
    const res = await fetch(OCR_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: manipulated.base64 })
    });
    const result = await res.json();
    setIsScanning(false);

    if (result.calories || result.sugar) {
      setScannedValues({
        calories: result.calories?.toString() ?? '',
        sugar: result.sugar?.toString() ?? ''
      });
    } else {
      Alert.alert('Scan Failed', result.message || 'No values found.');
    }
  };

  const handleSave = async () => {
    try {
      const entries = [];
      if (scannedValues.calories) entries.push({ type: 1, amount: parseFloat(scannedValues.calories) });
      if (scannedValues.sugar) entries.push({ type: 2, amount: parseFloat(scannedValues.sugar) });

      if (editingLogs) {
        for (const log of editingLogs) {
          const updatedAmount = log.type === 1 ? parseFloat(scannedValues.calories) : parseFloat(scannedValues.sugar);
          await fetch(`${LOGS_URL}/${log.logID}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: updatedAmount })
          });
        }
      } else {
        for (const entry of entries) {
          await fetch(LOGS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              amount: entry.amount,
              type: entry.type,
              date: new Date().toISOString()
            })
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
    Alert.alert('Confirm Delete', 'Delete both calorie and sugar logs?', [
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
    <View style={styles.container}>
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Log Calories & Sugar</Text>
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
    <View style={styles.summaryBox}>
      <Text style={styles.summaryText}>Today</Text>
      <Text style={styles.summaryReading}>🔥 {totalCalories} kcal 🍬 {totalSugar} g</Text>
    </View>
</View>
<TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.doneButton}>Done</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={groupedHistory}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.historyItem}>
            <Text style={styles.historyDate}>{new Date(item.timestamp).toLocaleString()}</Text>
            {item.logs.map((log, idx) => (
              <View key={idx} style={styles.logRow}>
                <Text style={styles.historyLabel}>{(log.type === 1 ? '🔥 Calories' : '🍬 Sugar')}:</Text>
                <Text style={[styles.historyValue, log.type === 2 && parseFloat(log.amount) > 15 ? { color: 'red' } : {}]}>{parseFloat(log.amount || 0).toString()} {log.type === 1 ? 'kcal' : 'g'}</Text>
              </View>
            ))}
            <View style={styles.actionsRow}>
              <TouchableOpacity onPress={() => handleEditGroup(item.logs)}>
                <Ionicons name="pencil-outline" size={20} color="#007AFF" style={{ marginHorizontal: 6 }} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteGroup(item.logs)}>
                <Ionicons name="trash-outline" size={20} color="red" style={{ marginHorizontal: 6 }} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.noData}>No logs available</Text>}
      />

      <TouchableOpacity style={styles.fab} onPress={() => { setEditingLogs(null); handleAddNew(); }}>
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5', padding: 15 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#333' },
  doneButton: { color: '#007AFF', fontSize: 17 },
  historyItem: { backgroundColor: '#ffffff', padding: 16, marginBottom: 12, borderRadius: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  historyDate: { fontSize: 12, color: '#888' },
  logRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  historyLabel: { fontWeight: '600' },
  historyValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  noData: { textAlign: 'center', marginTop: 50, color: '#888' },
  summaryBox: { padding: 10, backgroundColor: '#fff', borderRadius: 12, marginTop: 4, marginBottom: 10 },
  summaryText: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 2 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', padding: 24, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderColor: '#eee', borderWidth: 1 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  modalInput: { backgroundColor: '#f2f2f2', padding: 16, fontSize: 18, borderRadius: 12, textAlign: 'center', marginBottom: 12, borderColor: '#ccc', borderWidth: 1 },
  scanButtonsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  scanButton: { flex: 1, flexDirection: 'row', backgroundColor: '#007AFF', padding: 12, marginHorizontal: 5, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  scanButtonText: { color: 'white', marginLeft: 6, fontSize: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-around' },
  modalButtonText: { fontSize: 16, padding: 10 },
  fab: { backgroundColor: '#007AFF', padding: 16, borderRadius: 30, alignItems: 'center', position: 'absolute', bottom: 20, right: 20 }
});
