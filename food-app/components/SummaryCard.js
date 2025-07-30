import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Svg, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

const ProgressRing = ({ progress = 0, size = 140, colors }) => {
    const strokeWidth = 18;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (progress * circumference);

    return (
        <View style={{ width: size, height: size }}>
            <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                 <Defs>
                    <LinearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0" stopColor="#F97316" stopOpacity="1" />
                        <Stop offset="1" stopColor="#F97316" stopOpacity="1" />
                    </LinearGradient>
                </Defs>
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={colors.border}
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="url(#grad)" 
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

export default function SummaryCard({ summary, isLoading }) {
    const { colors } = useTheme(); 
    const styles = getStyles(colors);

    if (isLoading || !summary) {
        return (
            <View style={[styles.card, styles.loadingContainer]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    const remaining = summary.goal - summary.food;
    const progress = summary.goal > 0 ? Math.min(summary.food / summary.goal, 1) : 0; 

    return (
        <View style={styles.card}>
            <Text style={styles.title}>Calorie Consumed</Text>
            
            <View style={styles.ringContainer}>
                <ProgressRing progress={progress} colors={colors} />
                <View style={styles.centerTextView}>
                    <Text style={styles.mainValue}>{remaining.toLocaleString()}</Text>
                    <Text style={styles.unit}>Remaining</Text>
                </View>
            </View>
            
            <View style={styles.divider} />

            <View style={styles.detailsContainer}>
                <View style={styles.detailItem}>
                    <View style={[styles.detailDot, { backgroundColor: '#F97316' }]} />
                    <Text style={styles.detailText}>Goal: {summary.goal.toLocaleString()}</Text>
                </View>
                <View style={styles.detailItem}>
                    <View style={[styles.detailDot, { backgroundColor: '#3D88F8' }]} />
                    <Text style={styles.detailText}>Food: {summary.food.toLocaleString()}</Text>
                </View>
                <View style={styles.detailItem}>
                    <View style={[styles.detailDot, { backgroundColor: '#4CAF50' }]} />
                    <Text style={styles.detailText}>Left: {remaining.toLocaleString()}</Text>
                </View>
            </View>
        </View>
    );
}

const getStyles = (colors) => StyleSheet.create({
    card: {
        backgroundColor: colors.card, 
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 15,
        shadowColor: 'rgba(0,0,0,0.1)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        height: '100%',
        justifyContent: 'flex-start', 
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        color: colors.text,
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
        color: colors.text,
        fontSize: 32,
        fontWeight: 'bold',
    },
    unit: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        width: '100%',
        alignSelf: 'center',
        marginTop: 10,
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
        color: colors.text,
        fontSize: 13,
        fontWeight: '500',
    },
});