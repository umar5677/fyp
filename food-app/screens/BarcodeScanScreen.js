// fyp/food-app/screens/BarcodeScanScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ActivityIndicator, StyleSheet, Alert, TouchableOpacity,
  SafeAreaView, Modal, Platform, StatusBar, Animated
} from 'react-native';
import { CameraView, Camera } from 'expo-camera'; 
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { useNavigation } from '@react-navigation/native';
import { api } from '../utils/api'; 
import { useTheme } from '../context/ThemeContext';

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
const ScannerOverlay = ({ colors }) => {
    const styles = getStyles(colors);
    const scanAnimation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(scanAnimation, {
                    toValue: 1,
                    duration: 2500,
                    useNativeDriver: true,
                }),
                Animated.timing(scanAnimation, {
                    toValue: 0,
                    duration: 2500,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [scanAnimation]);

    const animatedStyle = {
        transform: [
            {
                translateY: scanAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 200],
                }),
            },
        ],
    };

    return (
        <View style={styles.overlay}>
            <Text style={styles.overlayText}>Align barcode within the frame</Text>
            <View style={styles.viewfinder}>
                <Animated.View style={[styles.scanLine, animatedStyle]} />
            </View>
            <Text style={styles.overlaySubtext}>Scanning will start automatically</Text>
        </View>
    );
};

export default function BarcodeScanScreen() {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const navigation = useNavigation();

    const [hasPermission, setHasPermission] = useState(null);
    const [scanned, setScanned] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [productInfo, setProductInfo] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const getCameraPermissions = async () => {
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

    const handleBarCodeScanned = async ({ data: barcode }) => {
        setScanned(true);
        setIsLoading(true);
        try {
            const response = await api.lookupBarcode(barcode);
            setProductInfo(response.product);
        } catch (err) {
            console.error('Barcode lookup error:', err);
            const errorMessage = err.message.includes('UPGRADE_REQUIRED')
                ? "Barcode scanning is a premium feature. Please upgrade to continue."
                : err.message || 'Could not find this product.';

            Alert.alert(
                err.message.includes('UPGRADE_REQUIRED') ? "Premium Feature" : 'Scan Error',
                errorMessage,
                [
                    { 
                        text: 'OK', 
                        onPress: () => err.message.includes('UPGRADE_REQUIRED') ? navigation.goBack() : handleScanAgain() 
                    }
                ]
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveLog = async () => {
        if (!productInfo) return;
        setIsSaving(true);
        try {
            const { productName, calories, sugar } = productInfo;
            const date = new Date().toISOString();
            await api.addLog({ amount: calories, type: 1, date, foodName: productName });
            if (sugar > 0) {
                await api.addLog({ amount: sugar, type: 2, date, foodName: productName });
            }
            Alert.alert("Success", "Food log saved successfully!", [
                { text: 'OK', onPress: () => navigation.goBack() }
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
            return <View style={styles.permissionContainer}><ActivityIndicator color={colors.primary}/><Text style={styles.permissionText}>Requesting camera permission...</Text></View>;
        }
        if (hasPermission === false) {
            return <View style={styles.permissionContainer}><Text style={styles.permissionText}>Camera access denied.</Text></View>;
        }

        return (
            <>
                <CameraView
                    style={StyleSheet.absoluteFillObject}
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    barcodeScannerSettings={{ barcodeTypes: ["ean13", "upc_a", "ean8", "upc_e"] }}
                />

                {!scanned && <ScannerOverlay colors={colors} />}

                {scanned && !isLoading && productInfo && (
                    <View style={styles.bottomContainer}>
                        <Animatable.View animation="fadeInUp" style={styles.resultsCard}>
                            <Text style={styles.resultsTitle} numberOfLines={2}>{productInfo.productName}</Text>
                            <Text style={styles.servingSizeText}>Nutrition per 100g / 100ml</Text>
                            
                            <View style={styles.resultsGrid}>
                                <View style={styles.resultItem}>
                                    <Ionicons name="flame" size={28} color="#F57C00" />
                                    <Text style={styles.resultValue}>{Math.round(productInfo.calories)}</Text>
                                    <Text style={styles.resultLabel}>Calories</Text>
                                </View>
                                
                                <View style={styles.divider} />

                                <View style={styles.resultItem}>
                                    <MaterialCommunityIcons name="candy" size={28} color="#D32F2F" />
                                    <Text style={styles.resultValue}>{Math.round(productInfo.sugar)}g</Text>
                                    <Text style={styles.resultLabel}>Sugar</Text>
                                </View>
                            </View>
                        </Animatable.View>

                        <View style={styles.actionsContainer}>
                            <TouchableOpacity style={styles.actionButton} onPress={handleScanAgain}>
                                <Ionicons name="scan-outline" size={22} color={colors.text} />
                                <Text style={styles.actionButtonText}>Scan Again</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.actionButton, styles.saveButton, isSaving && styles.disabledButton]} 
                                onPress={handleSaveLog} 
                                disabled={isSaving}
                            >
                                {isSaving 
                                    ? <ActivityIndicator color="#fff" /> 
                                    : <>
                                        <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
                                        <Text style={[styles.actionButtonText, styles.saveButtonText]}>Save Log</Text>
                                    </>
                                }
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" />
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

const getStyles = (colors) => StyleSheet.create({
    safeArea: { 
        flex: 1, 
        backgroundColor: colors.card,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, 
    },
    header: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: 16, 
        paddingVertical: 12, 
        borderBottomWidth: 1, 
        borderBottomColor: colors.border 
    },
    title: { fontSize: 22, fontWeight: 'bold', color: colors.text },
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    permissionText: {
        color: colors.text,
        fontSize: 16,
        marginTop: 10
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlayText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 10,
    },
    overlaySubtext: {
        color: '#FFFFFF',
        fontSize: 14,
        marginTop: 20,
    },
    viewfinder: {
        width: '85%',
        height: 200,
        borderColor: '#FFFFFF',
        borderWidth: 2,
        borderRadius: 16,
        overflow: 'hidden', 
    },
    scanLine: {
        width: '100%',
        height: 2,
        backgroundColor: 'rgba(255, 100, 100, 0.7)',
        shadowColor: '#FF0000',
        shadowOpacity: 0.8,
        shadowRadius: 5,
        elevation: 8,
    },
    bottomContainer: { 
        position: 'absolute', 
        bottom: 0, 
        width: '100%', 
        alignItems: 'center',
        backgroundColor: colors.card,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 30,
        paddingTop: 10,
    },
    resultsCard: { 
        backgroundColor: colors.card, 
        paddingVertical: 16, 
        paddingHorizontal: 20,
        width: '100%',
    },
    resultsTitle: { 
        fontSize: 22, 
        fontWeight: 'bold', 
        color: colors.text, 
        marginBottom: 4, 
        textAlign: 'center' 
    },
    servingSizeText: { 
        fontSize: 14, 
        color: colors.textSecondary, 
        marginBottom: 16,
        textAlign: 'center',
    },
    resultsGrid: { 
        flexDirection: 'row', 
        justifyContent: 'center', 
        alignItems: 'center',
        width: '100%' 
    },
    resultItem: { 
        alignItems: 'center',
        marginHorizontal: 30, 
    },
    resultValue: { fontSize: 24, fontWeight: 'bold', marginTop: 4, color: colors.text },
    resultLabel: { fontSize: 14, color: colors.textSecondary, marginTop: 2, fontWeight: '500' },
    divider: {
        height: '60%',
        width: 1,
        backgroundColor: colors.border,
    },
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '90%',
        marginTop: 16,
    },
    actionButton: { 
        flex: 1,
        flexDirection: 'row',
        paddingVertical: 14, 
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        marginHorizontal: 8,
    },
    saveButton: { 
        backgroundColor: '#2ecc71',
        borderColor: '#2ecc71',
    },
    actionButtonText: { 
        color: colors.text, 
        fontSize: 16, 
        fontWeight: '600',
        marginLeft: 8,
    },
    saveButtonText: {
        color: '#FFFFFF'
    },
    disabledButton: { backgroundColor: '#95a5a6' },
    loadingOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    loadingBox: { backgroundColor: colors.card, borderRadius: 15, padding: 30, alignItems: 'center' },
    loadingText: { marginTop: 15, fontSize: 16, fontWeight: '600', color: colors.text }
});