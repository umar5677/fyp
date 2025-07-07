// food-app/components/SummaryCard.js
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Svg, Circle, Defs, LinearGradient, Stop } from 'react-native-svg'; // Using SVG for a clean progress ring
import { api } from '../utils/api';


// This component creates the circular progress bar using SVG. It's more robust than the previous CSS-hack.
const ProgressRing = ({ progress = 0, size = 140 }) => {
    const strokeWidth = 18;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (progress * circumference);

    return (
        <View style={{ width: size, height: size }}>
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                 <Defs>
                    <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0" stopColor="#4D9FFF" stopOpacity="1" />
                        <Stop offset="1" stopColor="#3D88F8" stopOpacity="1" />
                    </LinearGradient>
                </Defs>
                {/* Background Track */}
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="#E9ECEF"
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                {/* Foreground Progress */}
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="url(#grad)" // Apply the gradient
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    fill="none"
                />
            </Svg>
        </View>
    );
};


export default function SummaryCard() {
    const [summary, setSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            const fetchSummaryData = async () => {
                if (!isLoading) setIsLoading(true);

                try {
                    const [profileRes, calorieRes] = await Promise.all([
                        api.getProfile(),
                        api.getHistory([1], 'day', new Date().toISOString()),
                    ]);
                    
                    const food = calorieRes.reduce((acc, log) => acc + log.amount, 0);
                    const goal = profileRes.user?.calorieGoal || 2100;

                    setSummary({
                        goal: Math.round(goal),
                        food: Math.round(food),
                        exercise: 0,
                    });
                } catch (error) {
                    console.error("Failed to load summary data:", error);
                    setSummary({ goal: 2100, food: 0, exercise: 0 });
                } finally {
                    setIsLoading(false);
                }
            };
            
            fetchSummaryData();
        }, [])
    );

    if (isLoading || !summary) {
        return (
            <View style={[styles.card, styles.loadingContainer]}>
                <ActivityIndicator size="large" color="#3D88F8" />
            </View>
        );
    }

    const remaining = summary.goal - summary.food + summary.exercise;
    const progress = summary.goal > 0 ? Math.min(summary.food / summary.goal, 1) : 0; 

    return (
        <View style={styles.card}>
            <Text style={styles.title}>Calorie Summary</Text>
            
            <View style={styles.ringContainer}>
                <ProgressRing progress={progress} />
                <View style={styles.centerTextView}>
                    <Text style={styles.mainValue}>{remaining.toLocaleString()}</Text>
                    <Text style={styles.unit}>Remaining</Text>
                </View>
            </View>
            
            <View style={styles.divider} />

            {/* Bottom Details Section */}
            <View style={styles.detailsContainer}>
                <View style={styles.detailItem}>
                    <View style={[styles.detailDot, { backgroundColor: '#4CAF50' }]} />
                    <Text style={styles.detailText}>Goal: {summary.goal.toLocaleString()}</Text>
                </View>
                <View style={styles.detailItem}>
                    <View style={[styles.detailDot, { backgroundColor: '#3D88F8' }]} />
                    <Text style={styles.detailText}>Food: {summary.food.toLocaleString()}</Text>
                </View>
                <View style={styles.detailItem}>
                    <View style={[styles.detailDot, { backgroundColor: '#FFA726' }]} />
                    <Text style={styles.detailText}>Exercise: {summary.exercise.toLocaleString()}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF', 
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 15,
        shadowColor: 'rgba(0,0,0,0.1)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        height: '100%', // Crucial for matching parent slide height
        justifyContent: 'flex-start', // To space out top, middle, and bottom
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        color: '#1E1E2D',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
    },
    ringContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 5,
    },
    centerTextView: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mainValue: {
        color: '#1E1E2D',
        fontSize: 32,
        fontWeight: 'bold',
    },
    unit: {
        color: '#6c757d',
        fontSize: 14,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        width: '100%',
        alignSelf: 'center',
    },
    detailsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingTop: 10,
    },
    detailItem: {
        alignItems: 'center',
    },
    detailDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginBottom: 8,
    },
    detailText: {
        color: '#333',
        fontSize: 13,
        fontWeight: '500',
    },
});