// food-app/components/MiniGlucoseChart.js
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api } from '../utils/api';
import { useTheme } from '../context/ThemeContext';

const screenWidth = Dimensions.get('window').width;

// Helper to format the time label
const formatTimeLabel = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
};

const getStyles = (colors) => StyleSheet.create({
    card: {
        backgroundColor: colors.card,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
        marginVertical: 10,
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 10,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    title: {
        color: colors.text,
        fontSize: 18,
        fontWeight: 'bold',
    },
    viewMoreText: {
        color: colors.primary,
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
        backgroundColor: colors.background,
        borderRadius: 12,
        padding: 20,
    },
    placeholderText: {
        color: colors.textSecondary,
        textAlign: 'center',
        fontSize: 14,
        lineHeight: 20,
    },
});


export default function MiniGlucoseChart() {
    const { colors } = useTheme();
    // Now this call works because getStyles is defined above
    const styles = getStyles(colors);
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
                    <ActivityIndicator size="large" color={colors.primary} />
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
                    backgroundColor: colors.card,
                    backgroundGradientFrom: colors.card,
                    backgroundGradientTo: colors.card,
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(249, 115, 22, ${opacity})`,
                    labelColor: (opacity = 1) => colors.textSecondary,
                    style: { borderRadius: 16 },
                    propsForDots: { r: '4', strokeWidth: '2', stroke: '#F97316' },
                    propsForBackgroundLines: {
                        strokeDasharray: '4',
                        stroke: colors.border,
                    },
                    fillShadowGradientFrom: '#F97316',
                    fillShadowGradientFromOpacity: 0.1,
                    fillShadowGradientTo: colors.card,
                    fillShadowGradientToOpacity: 0
                }}
                style={styles.chart}
                formatXLabel={() => ''}
                renderDotContent={({x, y, index}) => {
                    if (index % 2 === 0) {
                        return null; 
                    }

                    return (
                        <Text
                            key={index}
                            style={{
                                position: 'absolute',
                                top: y + 15,
                                left: x - 20,
                                textAlign: 'center',
                                color: colors.textSecondary,
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