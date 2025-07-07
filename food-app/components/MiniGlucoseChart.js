// food-app/components/MiniGlucoseChart.js
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api } from '../utils/api';

const screenWidth = Dimensions.get('window').width;

export default function MiniGlucoseChart() {
    const navigation = useNavigation();
    const [chartData, setChartData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            const fetchChartData = async () => {
                if (!isLoading) setIsLoading(true);

                try {
                    const todayISO = new Date().toISOString();
                    const glucoseRes = await api.getHistory([3], 'day', todayISO, 7);

                    if (glucoseRes && glucoseRes.length > 1) {
                        const reversedGlucose = [...glucoseRes].reverse();
                        
                        // --- ROBUST PARSING FIX ---
                        // This is the critical change. It ensures every data point 
                        // given to the chart is a valid number. If a log.amount from the
                        // database is null or undefined, it will safely default to 0.
                        const cleanData = reversedGlucose.map(log => Number(log.amount) || 0);

                        setChartData({
                            labels: reversedGlucose.map(log => new Date(log.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })),
                            datasets: [{ data: cleanData }] // Use the sanitized data
                        });
                    } else {
                        setChartData(null);
                    }
                } catch (error) {
                    console.error("Failed to load mini glucose chart data:", error);
                    setChartData(null);
                } finally {
                    setIsLoading(false);
                }
            };
            
            fetchChartData();
        }, [])
    );

    const renderContent = () => {
        if (isLoading) {
            return (
                <View style={styles.placeholderContainer}>
                    <ActivityIndicator size="large" color="#3D88F8" />
                </View>
            );
        }

        if (!chartData) {
            return (
                <View style={styles.placeholderContainer}>
                    <Text style={styles.placeholderText}>
                        Log at least two blood sugar readings today to see your daily chart.
                    </Text>
                </View>
            );
        }

        return (
            <LineChart
                data={chartData}
                width={screenWidth - 40}
                height={220}
                chartConfig={{
                    backgroundColor: '#FFFFFF',
                    backgroundGradientFrom: '#FFFFFF',
                    backgroundGradientTo: '#FFFFFF',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(61, 136, 248, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(30, 30, 45, ${opacity})`,
                    propsForDots: { r: '4', strokeWidth: '2', stroke: '#3D88F8' },
                }}
                bezier
                style={styles.chart}
            />
        );
    };

    return (
        <TouchableOpacity 
            style={styles.card} 
            onPress={() => navigation.navigate('FullGlucoseChart')}
            activeOpacity={0.8}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.title}>Today's Glucose</Text>
                <Text style={styles.viewMoreText}>View More →</Text>
            </View>
            {renderContent()}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginVertical: 10,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 5,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    title: {
        color: '#1E1E2D',
        fontSize: 16,
        fontWeight: 'bold',
    },
    viewMoreText: {
        color: '#3D88F8',
        fontSize: 14,
        fontWeight: '600',
    },
    chart: {
        borderRadius: 12,
        marginVertical: 8,
    },
    placeholderContainer: {
        height: 220,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F7F7F7',
        borderRadius: 12,
        padding: 20,
    },
    placeholderText: {
        color: '#555',
        textAlign: 'center',
        fontSize: 14,
        lineHeight: 20,
    },
});