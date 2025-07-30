import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { api } from '../utils/api';
import { useTheme } from '../context/ThemeContext';

const TREND_INFO = {
    'Rising': { icon: 'arrow-top-right-thick', color: '#F44336' },
    'Falling': { icon: 'arrow-bottom-right-thick', color: '#2196F3' },
    'Stable': { icon: 'arrow-right-thick', color: '#4CAF50' },
};

const getStyles = (colors) => StyleSheet.create({
    card: {
        backgroundColor: colors.card, borderRadius: 16, paddingVertical: 15, paddingHorizontal: 20,
        shadowColor: 'rgba(0,0,0,0.1)', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12,
        elevation: 5, height: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    title: { color: colors.text, fontSize: 18, fontWeight: 'bold' },
    refreshButton: { padding: 5, },
    contentContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', },
    infoText: { textAlign: 'center', color: colors.textSecondary, fontSize: 14, paddingHorizontal: 10, lineHeight: 20 },
    trendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20, },
    trendText: { fontSize: 22, fontWeight: 'bold', marginLeft: 10, },
    dataRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 15, backgroundColor: colors.background, borderRadius: 12, },
    dataColumn: { alignItems: 'center', paddingHorizontal: 10, },
    dataLabel: { fontSize: 13, color: colors.textSecondary, marginBottom: 4, },
    dataSubLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2, },
    dataValue: { fontSize: 20, fontWeight: 'bold', color: colors.text, },
    dataValueProjected: { color: '#3D88F8', },
    divider: { width: 1, height: '70%', backgroundColor: colors.border, },
    disclaimer: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 10, fontStyle: 'italic', },
    upgradeContainer: { justifyContent: 'center', alignItems: 'center', flex: 1, padding: 10, },
    upgradeText: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 20, },
    upgradeButton: { backgroundColor: '#F97316', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10, },
    upgradeButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', },
});

export default function PredictedGlucoseCard({ isPremium }) {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    const [prediction, setPrediction] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    const fetchPrediction = async () => {
        if (!isPremium) {
            setIsLoading(false);
            return;
        }
        try {
            const data = await api.getGlucosePrediction();
            setPrediction(data);
        } catch (error) {
            console.error("Failed to fetch glucose prediction:", error);
             if (error.message && error.message.toLowerCase().includes('overloaded')) {
                setPrediction({ success: false, message: "The AI assistant is currently busy. Please try again in a moment." });
            } else {
                setPrediction({ success: false, message: error.message });
            }
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };
    
    useEffect(() => {
        fetchPrediction();
    }, [isPremium]);

    const handleRefresh = () => {
        if (isLoading || isRefreshing) return;
        setIsRefreshing(true);
        fetchPrediction();
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <View style={styles.contentContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            );
        }

        if (!prediction || !prediction.success) {
            return (
                <TouchableOpacity style={styles.contentContainer} onPress={handleRefresh}>
                    <Text style={styles.infoText}>
                        {prediction?.message || 'Prediction not available.'}
                    </Text>
                     <Text style={[styles.infoText, {fontWeight: 'bold', marginTop: 8, color: colors.primary}]}>
                        Tap to refresh.
                    </Text>
                </TouchableOpacity>
            );
        }
        
        const trend = TREND_INFO[prediction.trend] || { icon: 'help-circle-outline', color: '#555'};

        return (
             <View style={{ flex: 1, justifyContent: 'center'}}>
                <View style={styles.trendRow}>
                    <Animatable.View animation="pulse" easing="ease-in-out" iterationCount="infinite">
                        <MaterialCommunityIcons name={trend.icon} size={28} color={trend.color} />
                    </Animatable.View>
                    <Text style={[styles.trendText, { color: trend.color }]}>{prediction.trend}</Text>
                </View>

                <View style={styles.dataRow}>
                    <View style={styles.dataColumn}>
                        <Text style={styles.dataLabel}>Last Reading</Text>
                        <Text style={styles.dataValue}>{prediction.lastReading?.amount} mg/dL</Text>
                    </View>
                    
                    <View style={styles.divider} />

                    <View style={styles.dataColumn}>
                        <Text style={styles.dataLabel}>Projection (1 hr)</Text>
                        <Text style={[styles.dataValue, styles.dataValueProjected]}>~{prediction.projectedValue} mg/dL</Text>
                        {prediction.projectedTime && (
                            <Text style={styles.dataSubLabel}>
                                {new Date(prediction.projectedTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                            </Text>
                        )}
                    </View>
                </View>
             </View>
        );
    }

    const renderUpgradeState = () => {
        return (
            <View style={styles.upgradeContainer}>
                <MaterialCommunityIcons name="lock-outline" size={32} color={colors.textSecondary} style={{ marginBottom: 12 }} />
                <Text style={styles.upgradeText}>
                    AI Glucose Forecast is a Premium feature. Unlock predictions by upgrading your account.
                </Text>
                <TouchableOpacity 
                    style={styles.upgradeButton}
                    onPress={() => Alert.alert("Upgrade", "Please upgrade to access AI Glucose Forecast.")}
                >
                    <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                 <Text style={styles.title}>AI Glucose Forecast</Text>
                 {isPremium && (
                    <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh} disabled={isRefreshing || isLoading}>
                        {isRefreshing ? (
                             <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                            <Ionicons name="refresh-circle-outline" size={28} color={colors.textSecondary} />
                        )}
                    </TouchableOpacity>
                 )}
            </View>
            
            {isPremium ? renderContent() : renderUpgradeState()}
            
            {isPremium && prediction?.success && (
                <Text style={styles.disclaimer}>
                    {prediction.analysis ? `Insight: ${prediction.analysis}` : "This is a prediction. Always confirm with a reading."}
                </Text>
            )}
        </View>
    );
}