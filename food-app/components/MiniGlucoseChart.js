// food-app/components/MiniGlucoseChart.js
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api } from '../utils/api';

const screenWidth = Dimensions.get('window').width;

// Helper to format the time label
const formatTimeLabel = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
};

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
                        const cleanData = reversedGlucose.map(log => Number(log.amount) || 0);

                        setChartData({
                            labels: reversedGlucose.map(log => formatTimeLabel(log.date)),
                            datasets: [{
                                data: cleanData,
                                strokeWidth: 2,
                            }],
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
                data={{
                    labels: [], 
                    datasets: chartData.datasets
                }}
                width={screenWidth - 32}
                height={220}
                withInnerLines={true}
                withOuterLines={true}
                withHorizontalLabels={true}
                withVerticalLabels={false}
                withShadow={false}
                fromZero={true}
                bezier
                chartConfig={{
                    backgroundColor: '#FFFFFF',
                    backgroundGradientFrom: '#FFFFFF',
                    backgroundGradientTo: '#FFFFFF',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(61, 136, 248, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                    style: { borderRadius: 16 },
                    propsForDots: { r: '4', strokeWidth: '2', stroke: '#3D88F8' },
                    propsForBackgroundLines: {
                        strokeDasharray: '4',
                        stroke: '#E5E7EB',
                    },
                    fillShadowGradientFrom: '#3D88F8',
                    fillShadowGradientFromOpacity: 0.1,
                    fillShadowGradientTo: '#FFFFFF',
                    fillShadowGradientToOpacity: 0
                }}
                style={styles.chart}
                formatXLabel={() => ''}
                renderDotContent={({x, y, index}) => {
                    // --- THE FIX: Only show labels for odd-indexed points ---
                    // This naturally skips the first point (index 0) and alternates.
                    if (index % 2 === 0) {
                        return null; // Don't render a label for this point
                    }

                    return (
                        <Text
                            key={index}
                            style={{
                                position: 'absolute',
                                top: y + 15,
                                left: x - 20,
                                textAlign: 'center',
                                color: '#6B7280',
                                fontSize: 10,
                                width: 40,
                            }}
                        >
                            {chartData.labels[index]}
                        </Text>
                    );
                }}
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
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
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
        fontSize: 18,
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
        paddingRight: 30,
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