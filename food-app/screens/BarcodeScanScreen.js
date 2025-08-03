// fyp/food-app/screens/BarcodeScanScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, ActivityIndicator, StyleSheet, Alert, TouchableOpacity, SafeAreaView, Modal
} from 'react-native';
// --- CHANGE 1: Import both CameraView and Camera ---
import { CameraView, Camera } from 'expo-camera'; 
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { api } from '../utils/api'; 
import { useTheme } from '../context/ThemeContext';

const getStyles = (colors) => StyleSheet.create({
    // Styles are unchanged
    safeArea: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
    title: { fontSize: 22, fontWeight: 'bold', color: colors.text },
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    camera: { ...StyleSheet.absoluteFillObject },
    resultsCard: { backgroundColor: colors.card, padding: 20, borderRadius: 16, width: '90%', alignItems: 'center', borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 5, elevation: 3 },
    resultsTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 5, textAlign: 'center' },
    servingSizeText: { fontSize: 14, color: colors.textSecondary, marginBottom: 20 },
    resultsGrid: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
    resultItem: { alignItems: 'center' },
    resultValue: { fontSize: 20, fontWeight: 'bold', marginTop: 4, color: colors.text },
    resultLabel: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
    actionButton: { paddingVertical: 15, borderRadius: 12, marginTop: 12, width: '90%', alignItems: 'center' },
    saveButton: { backgroundColor: '#2ecc71' },
    scanAgainButton: { backgroundColor: colors.border },
    actionButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    disabledButton: { backgroundColor: '#95a5a6' },
    bottomContainer: { position: 'absolute', bottom: 30, width: '100%', alignItems: 'center' },
    loadingOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', alignItems: 'center' },
    loadingBox: { backgroundColor: 'white', borderRadius: 15, padding: 30, alignItems: 'center' },
    loadingText: { marginTop: 15, fontSize: 16, fontWeight: '600', color: '#333' }
});

const LoadingOverlay = ({ visible, text, colors }) => {
    const overlayStyles = getStyles(colors);
    return (
        <Modal transparent={true} visible={visible} animationType="fade">
            <View style={overlayStyles.loadingOverlay}>
                <View style={overlayStyles.loadingBox}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={overlayStyles.loadingText}>{text}</Text>
                </View>
            </View>
        </Modal>
    );
};

export default function BarcodeScanScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [productInfo, setProductInfo] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const getCameraPermissions = async () => {
      // The permissions call still uses the 'Camera' object, which is correct
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    getCameraPermissions();
  }, []);
  
  const handleScanAgain = () => {
    setScanned(false);
    setProductInfo(null);
    setIsLoading(false);
    setIsSaving(false);
  };

  const handleBarCodeScanned = async ({ type, data: barcode }) => {
    setScanned(true);
    setIsLoading(true);
    try {
      const response = await api.lookupBarcode(barcode);
      if (response.success) {
        setProductInfo(response.product);
      } else {
        throw new Error(response.message);
      }
    } catch (err) {
      console.error('Barcode lookup error:', err);
      if (err.message && err.message.includes('UPGRADE_REQUIRED')) {
          Alert.alert("Premium Feature", "Barcode scanning is a premium feature. Please upgrade to continue.");
          navigation.goBack();
      } else {
          Alert.alert('Scan Error', err.message || 'Could not find this product.', [
              { text: 'OK', onPress: handleScanAgain }
          ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveLog = async () => {
    if (!productInfo) { Alert.alert("Incomplete Data", "No product information to save."); return; }
    setIsSaving(true);
    try {
        const { productName, calories, sugar } = productInfo;
        const date = new Date().toISOString();
        await api.addLog({ amount: calories, type: 1, date, foodName: productName });
        if (sugar > 0) {
            await api.addLog({ amount: sugar, type: 2, date, foodName: productName });
        }
        Alert.alert("Success", "Food log saved successfully!", [
            { text: 'OK', onPress: () => navigation.navigate('LogCalorieSugarModal') }
        ]);
    } catch (error) {
        console.error("Failed to save food log:", error);
        Alert.alert("Save Error", "Could not save the food log. Please try again.");
    } finally {
        setIsSaving(false);
    }
  };
  
  const renderContent = () => {
    if (hasPermission === null) {
      return <Text style={{color: colors.text}}>Requesting camera permission...</Text>;
    }
    if (hasPermission === false) {
      return <Text style={{color: colors.text}}>No access to camera.</Text>;
    }

    return (
        <>
            {/* --- CHANGE 2: Use CameraView component --- */}
            <CameraView
                style={styles.camera}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["ean13", "upc_a", "ean8", "upc_e"],
                }}
            />
            {scanned && !isLoading && (
                <View style={styles.bottomContainer}>
                    <Animatable.View animation="fadeInUp" style={styles.resultsCard}>
                        {productInfo && (
                            <>
                                <Text style={styles.resultsTitle}>{productInfo.productName}</Text>
                                <Text style={styles.servingSizeText}>Per 100g / ml</Text>
                                <View style={styles.resultsGrid}>
                                    <View style={styles.resultItem}>
                                        <Ionicons name="flame" size={24} color="#F57C00" />
                                        <Text style={styles.resultValue}>{Math.round(productInfo.calories)}</Text>
                                        <Text style={styles.resultLabel}>Calories</Text>
                                    </View>
                                    <View style={styles.resultItem}>
                                        <MaterialCommunityIcons name="candy" size={24} color="#D32F2F" />
                                        <Text style={styles.resultValue}>{Math.round(productInfo.sugar)}g</Text>
                                        <Text style={styles.resultLabel}>Sugar</Text>
                                    </View>
                                </View>
                            </>
                        )}
                    </Animatable.View>

                    <TouchableOpacity 
                        style={[styles.actionButton, styles.saveButton, (isSaving || !productInfo) && styles.disabledButton]} 
                        onPress={handleSaveLog} disabled={isSaving || !productInfo}
                    >
                        {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>Save Log</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.actionButton, styles.scanAgainButton]} onPress={handleScanAgain}>
                        <Text style={[styles.actionButtonText, {color: colors.text}]}>Scan Again</Text>
                    </TouchableOpacity>
                </View>
            )}
        </>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
        <LoadingOverlay visible={isLoading} text="Looking up product..." colors={colors} />
        <View style={styles.header}>
            <Text style={styles.title}>🛒 Barcode Scanner</Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="close-circle" size={32} color={colors.textSecondary} />
            </TouchableOpacity>
        </View>
        <View style={styles.container}>
            {renderContent()}
        </View>
    </SafeAreaView>
  );
}