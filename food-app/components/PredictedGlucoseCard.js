import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import { api } from '../utils/api';

const TREND_INFO = {
    'Rising': { icon: 'arrow-top-right-thick', color: '#F44336' },
    'Falling': { icon: 'arrow-bottom-right-thick', color: '#2196F3' },
    'Stable': { icon: 'arrow-right-thick', color: '#4CAF50' },
};

export default function PredictedGlucoseCard() {
    const [prediction, setPrediction] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            const fetchPrediction = async () => {
                if (!isLoading) setIsLoading(true);
                try {
                    const data = await api.getGlucosePrediction();
                    setPrediction(data);
                } catch (error) {
                    console.error("Failed to fetch glucose prediction:", error);
                    setPrediction({ success: false, message: 'Could not connect to server.' });
                } finally {
                    setIsLoading(false);
                }
            };
            fetchPrediction();
        }, [])
    );

    const renderContent = () => {
        if (isLoading) {
            return (
                <View style={styles.contentContainer}>
                    <ActivityIndicator size="large" color="#3D88F8" />
                </View>
            );
        }

        if (!prediction || !prediction.success) {
            return (
                <View style={styles.contentContainer}>
                    <Text style={styles.infoText}>{prediction?.message || 'Prediction not available.'}</Text>
                </View>
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
                    </View>
                </View>
             </View>
        );
    }

    return (
        <View style={styles.card}>
            <Text style={styles.title}>Predicted Glucose Trend</Text>
            {renderContent()}
            {prediction?.success && (
                <Text style={styles.disclaimer}>
                    Based on recent readings only. Actual glucose may differ.
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingVertical: 15,
        paddingHorizontal: 20,
        shadowColor: 'rgba(0,0,0,0.1)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        height: '100%',
        justifyContent: 'space-between', 
    },
    title: {
        color: '#1E1E2D',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoText: {
        textAlign: 'center',
        color: '#666',
        fontSize: 14,
        paddingHorizontal: 10
    },
    trendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20, 
    },
    trendText: {
        fontSize: 22,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    dataRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 15, 
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
    },
    dataColumn: {
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    dataLabel: {
        fontSize: 13,
        color: '#667',
        marginBottom: 4,
    },
    dataValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1E1E2D',
    },
    dataValueProjected: {
        color: '#3D88F8',
    },
    divider: {
        width: 1,
        height: '70%',
        backgroundColor: '#E0E0E0',
    },
    disclaimer: {
        fontSize: 11,
        color: '#999',
        textAlign: 'center',
        paddingHorizontal: 10,
    },
});