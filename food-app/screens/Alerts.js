// screens/Alerts.js
import React, { useEffect, useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, Alert, ScrollView, SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Animatable from 'react-native-animatable';

// Keys for AsyncStorage
const THRESHOLD_KEYS = [
    'lowThreshold',
    'highFastingThreshold',
    'highPostMealThreshold',
    'veryHighThreshold'
];

export default function AlertsScreen({ navigation }) {
    const [thresholds, setThresholds] = useState({
        lowThreshold: '70',
        highFastingThreshold: '100',
        highPostMealThreshold: '140',
        veryHighThreshold: '180'
    });

    useEffect(() => {
        const loadThresholds = async () => {
          try {
            const storedValues = await AsyncStorage.multiGet(THRESHOLD_KEYS);
            const loadedThresholds = { ...thresholds }; // Start with defaults
            storedValues.forEach(([key, value]) => {
                if (value !== null) {
                    loadedThresholds[key] = value;
                }
            });
            setThresholds(loadedThresholds);
          } catch (err) {
            console.error('Failed to load thresholds:', err);
          }
        };
        loadThresholds();
    }, []);

    const handleValueChange = (key, value) => {
        setThresholds(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        const { lowThreshold, highFastingThreshold, highPostMealThreshold, veryHighThreshold } = thresholds;
        const low = parseFloat(lowThreshold);
        const highFasting = parseFloat(highFastingThreshold);
        const highPostMeal = parseFloat(highPostMealThreshold);
        const veryHigh = parseFloat(veryHighThreshold);

        if ([low, highFasting, highPostMeal, veryHigh].some(isNaN)) {
            Alert.alert('Invalid Input', 'All fields must be valid numbers.');
            return;
        }
        
        if (!(low < highFasting && highFasting < veryHigh && highPostMeal < veryHigh)) {
            Alert.alert('Logical Error', 'Please ensure thresholds are in a logical order (e.g., Low < High < Very High).');
            return;
        }

        try {
            const dataToSave = [
                ['lowThreshold', low.toString()],
                ['highFastingThreshold', highFasting.toString()],
                ['highPostMealThreshold', highPostMeal.toString()],
                ['veryHighThreshold', veryHigh.toString()]
            ];
            await AsyncStorage.multiSet(dataToSave);
            Alert.alert('Success', 'Alert thresholds saved successfully!');
        } catch (err) {
            Alert.alert('Error', 'Failed to save thresholds.');
            console.error(err);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>Alert Thresholds</Text>
                <View style={{width: 40}} />
            </View>
            <ScrollView contentContainerStyle={styles.container}>
                <Animatable.View animation="fadeInUp" style={styles.card}>
                    <Text style={styles.sectionTitle}>Alert Triggers</Text>
                    <Text style={styles.subText}>Receive an in-app notification when your blood sugar goes outside these limits.</Text>
                    
                    <View style={styles.thresholdItem}>
                        <Text style={styles.triggerText}>Low Glucose Alert</Text>
                        <TextInput style={styles.thresholdInput} value={thresholds.lowThreshold} onChangeText={(v) => handleValueChange('lowThreshold', v)} keyboardType="numeric" />
                    </View>
                    
                    <View style={styles.thresholdItem}>
                        <Text style={styles.triggerText}>High (Fasting/Pre-Meal) Alert</Text>
                        <TextInput style={styles.thresholdInput} value={thresholds.highFastingThreshold} onChangeText={(v) => handleValueChange('highFastingThreshold', v)} keyboardType="numeric" />
                    </View>

                    <View style={styles.thresholdItem}>
                        <Text style={styles.triggerText}>High (Post-Meal) Alert</Text>
                        <TextInput style={styles.thresholdInput} value={thresholds.highPostMealThreshold} onChangeText={(v) => handleValueChange('highPostMealThreshold', v)} keyboardType="numeric" />
                    </View>

                    <View style={styles.thresholdItem}>
                        <Text style={styles.triggerText}>Very High Glucose Alert</Text>
                        <TextInput style={styles.thresholdInput} value={thresholds.veryHighThreshold} onChangeText={(v) => handleValueChange('veryHighThreshold', v)} keyboardType="numeric" />
                    </View>

                     <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                        <Text style={styles.saveButtonText}>Save Thresholds</Text>
                    </TouchableOpacity>
                </Animatable.View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F7F8FA' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EEE' },
    backButton: { padding: 5 },
    title: { color: '#1E1E2D', fontSize: 20, fontWeight: 'bold' },
    container: { padding: 16 },
    card: { backgroundColor: 'white', borderRadius: 12, padding: 20, marginBottom: 20, shadowColor: "#ccc", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4, color: '#1E1E2D' },
    subText: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 15 },
    thresholdItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8, borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 16 },
    triggerText: { fontSize: 16, flex: 1, paddingRight: 10 },
    thresholdInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, width: 80, textAlign: 'center', fontSize: 16 },
    saveButton: { backgroundColor: '#2563EB', paddingVertical: 14, borderRadius: 10, marginTop: 20 },
    saveButtonText: { color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: 16 },
});