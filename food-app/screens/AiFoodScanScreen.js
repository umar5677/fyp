// food-app/screens/AiFoodScanScreen.js
import React, { useState } from 'react';
import {
  View, Text, Image, ActivityIndicator, ScrollView, StyleSheet, Alert, TouchableOpacity, SafeAreaView, Modal
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { api } from '../utils/api'; 
import { GEMINI_API_KEY } from '@env';

// A new loading overlay component for a better UX
const LoadingOverlay = ({ visible, text }) => (
    <Modal transparent={true} visible={visible} animationType="fade">
        <View style={styles.loadingOverlay}>
            <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#E67E22" />
                <Text style={styles.loadingText}>{text}</Text>
            </View>
        </View>
    </Modal>
);

export default function AiFoodScanScreen({ navigation }) {
  const [imageUri, setImageUri] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingText, setLoadingText] = useState(''); // Controls text in loading overlay
  const [confirmedFood, setConfirmedFood] = useState('');
  
  const [calories, setCalories] = useState(null);
  const [sugar, setSugar] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const resetState = () => {
    setImageUri(null);
    setSuggestions([]);
    setLoadingText('');
    setConfirmedFood('');
    setCalories(null);
    setSugar(null);
    setIsSaving(false);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission Denied', 'Camera permission is required.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.5 });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      resetState(); // Reset everything for the new image
      setImageUri(uri);
      await analyzeImageWithGemini(uri);
    }
  };

  const analyzeImageWithGemini = async (uri) => {
    setLoadingText('Analyzing your meal...');
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const requestBody = {
        contents: [{
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64 } },
            { text: 'Identify the food in this image. Return up to 3 likely dish names, comma-separated. Be concise, no extra text.' },
          ],
        }],
      };
      const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, requestBody);
      const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleaned = text.replace(/[^\w\s,]/g, '').split(',').map(s => s.trim()).filter(Boolean);
      setSuggestions(cleaned.slice(0, 3));
    } catch (err) {
      console.error('Gemini food identification error:', err);
      Alert.alert('Analysis Error', 'Could not identify the food in the image.');
    } finally {
      setLoadingText('');
    }
  };

  const handleFoodConfirm = (foodName) => {
    setConfirmedFood(foodName);
    getNutritionFromGemini(foodName);
  };

  const getNutritionFromGemini = async (foodName) => {
    setLoadingText('Estimating nutrition...');
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [{
            parts: [{ text: `Estimate calories and sugar for one serving of "${foodName}". Return a JSON object like {"calories": number, "sugar_grams": number}.` }],
          }],
        }
      );
      const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonString = text.match(/{.*}/s)[0];
      const nutrition = JSON.parse(jsonString);
      setCalories(nutrition.calories || 0);
      setSugar(nutrition.sugar_grams || 0);
    } catch (err) {
      console.error('Gemini nutrition error:', err);
      Alert.alert('Nutrition Error', 'Could not get nutrition info for this food.');
    } finally {
      setLoadingText('');
    }
  };
  
  const handleSaveLog = async () => {
    if (calories === null || !confirmedFood) {
        Alert.alert("Incomplete Data", "Cannot save log without food name and calories.");
        return;
    }
    setIsSaving(true);
    try {
        const date = new Date().toISOString();
        await api.addLog({ amount: calories, type: 1, date, foodName: confirmedFood });
        if (sugar !== null) {
            await api.addLog({ amount: sugar, type: 2, date, foodName: confirmedFood });
        }
        Alert.alert("Success", "Food log saved successfully!");
        navigation.goBack();
    } catch (error) {
        console.error("Failed to save food log:", error);
        Alert.alert("Save Error", "Could not save the food log. Please try again.");
    } finally {
        setIsSaving(false);
    }
  };
  
  const renderContent = () => {
    if (imageUri) {
        return (
            <Animatable.View animation="fadeIn" style={styles.contentContainer}>
                <Image source={{ uri: imageUri }} style={styles.image} />

                {suggestions.length > 0 && !confirmedFood && (
                    <Animatable.View animation="fadeInUp" style={styles.section}>
                        <Text style={styles.subtitle}>Is it one of these?</Text>
                        {suggestions.map((food, idx) => (
                            <TouchableOpacity key={idx} style={styles.choiceButton} onPress={() => handleFoodConfirm(food)}>
                                <Text style={styles.choiceText}>{food}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={[styles.choiceButton, { backgroundColor: '#7f8c8d' }]}
                            onPress={() => Alert.prompt('Manual Input', 'Enter food name:', (text) => { if (text) handleFoodConfirm(text.trim()); })}>
                            <Text style={styles.choiceText}>None of these</Text>
                        </TouchableOpacity>
                    </Animatable.View>
                )}

                {confirmedFood && (
                    <Animatable.View animation="fadeInUp" style={styles.section}>
                        <View style={styles.resultsCard}>
                            <Text style={styles.resultsTitle}>{confirmedFood}</Text>
                            <View style={styles.resultsGrid}>
                                <View style={styles.resultItem}>
                                    <Ionicons name="flame" size={24} color="#F57C00" />
                                    <Text style={styles.resultValue}>{calories !== null ? Math.round(calories) : '...'}</Text>
                                    <Text style={styles.resultLabel}>Calories</Text>
                                </View>
                                <View style={styles.resultItem}>
                                    <MaterialCommunityIcons name="candy" size={24} color="#D32F2F" />
                                    <Text style={styles.resultValue}>{sugar !== null ? `${Math.round(sugar)}g` : '...'}</Text>
                                    <Text style={styles.resultLabel}>Sugar</Text>
                                </View>
                            </View>
                        </View>
                        <TouchableOpacity 
                            style={[styles.actionButton, styles.saveButton, (calories === null || isSaving) && styles.disabledButton]} 
                            onPress={handleSaveLog}
                            disabled={calories === null || isSaving}
                        >
                            {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>Save Log</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.actionButton, styles.retakeButton]} 
                            onPress={takePhoto}
                        >
                            <Text style={[styles.actionButtonText, {color: '#34495e'}]}>Retake Photo</Text>
                        </TouchableOpacity>
                    </Animatable.View>
                )}
            </Animatable.View>
        )
    }

    // Initial Empty State
    return (
        <View style={styles.emptyStateContainer}>
            <MaterialCommunityIcons name="camera-iris" size={80} color="#E0E0E0" />
            <Text style={styles.emptyStateTitle}>Scan Your Meal</Text>
            <Text style={styles.emptyStateSubtitle}>
                Use your camera to get instant calorie and sugar estimates for your food.
            </Text>
            <TouchableOpacity style={styles.mainCameraButton} onPress={takePhoto}>
                <Ionicons name="camera" size={28} color="#fff" />
                <Text style={styles.mainCameraButtonText}>Start Scanning</Text>
            </TouchableOpacity>
        </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
        <LoadingOverlay visible={!!loadingText} text={loadingText} />
        <View style={styles.header}>
            <Text style={styles.title}>🥗 AI Food Scanner</Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="close-circle" size={32} color="#DDE1E6" />
            </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.container}>
            {renderContent()}
        </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FCFCFC' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    title: { fontSize: 22, fontWeight: 'bold' },
    container: { alignItems: 'center', flexGrow: 1, padding: 16 },
    contentContainer: { width: '100%', alignItems: 'center' },
    
    // Empty State
    emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
    emptyStateTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginTop: 16 },
    emptyStateSubtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginTop: 8, lineHeight: 24 },
    mainCameraButton: { flexDirection: 'row', backgroundColor: '#E67E22', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 30, alignItems: 'center', marginTop: 30 },
    mainCameraButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },

    // Image & Analysis State
    image: { width: '100%', height: 300, borderRadius: 15, marginBottom: 20 },
    section: { marginTop: 10, width: '100%', alignItems: 'center' },
    subtitle: { fontSize: 18, fontWeight: '600', marginBottom: 15, color: '#444' },
    choiceButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#3498db', padding: 14, borderRadius: 10, marginVertical: 6, width: '100%', alignItems: 'center' },
    choiceText: { color: '#3498db', fontSize: 16, fontWeight: 'bold' },

    // Results State
    resultsCard: { backgroundColor: '#fff', padding: 20, borderRadius: 16, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: '#F0F0F0', shadowColor: '#ccc', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
    resultsTitle: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50', marginBottom: 20, textAlign: 'center' },
    resultsGrid: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
    resultItem: { alignItems: 'center' },
    resultValue: { fontSize: 20, fontWeight: 'bold', marginTop: 4 },
    resultLabel: { fontSize: 14, color: '#7f8c8d', marginTop: 2 },
    actionButton: { paddingVertical: 15, borderRadius: 12, marginTop: 12, width: '100%', alignItems: 'center' },
    saveButton: { backgroundColor: '#2ecc71' },
    retakeButton: { backgroundColor: '#ECF0F1' },
    actionButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    disabledButton: { backgroundColor: '#95a5a6' },

    //  Loading Overlay 
    loadingOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center' },
    loadingBox: { backgroundColor: 'white', borderRadius: 15, padding: 30, alignItems: 'center' },
    loadingText: { marginTop: 15, fontSize: 16, fontWeight: '600' }
});