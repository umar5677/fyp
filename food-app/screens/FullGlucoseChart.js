import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, FlatList } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../utils/api';
import { useTheme } from '../context/ThemeContext';

const screenWidth = Dimensions.get('window').width;
const CHART_ORANGE = '#F97316';

const getBloodSugarStatus = (amount, thresholds) => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return { level: 'N/A', color: '#6C757D' };
    if (numAmount >= thresholds.veryHighThreshold) return { level: 'Very High', color: '#F44336' };
    if (numAmount < thresholds.lowThreshold) return { level: 'Low', color: '#2196F3' };
    if (numAmount >= thresholds.highFastingThreshold) return { level: 'High', color: '#FF9800' };
    return { level: 'Normal', color: '#4CAF50' };
};

const getWeekOfMonth = (date) => {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  return Math.ceil((date.getDate() + firstDay) / 7);
};

const getStyles = (colors) => StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card },
    backButton: { padding: 5 },
    title: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
    controlsContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10, backgroundColor: colors.card },
    dateNavigator: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    arrowButton: { padding: 5 },
    dateText: { fontSize: 18, fontWeight: '600', color: colors.text },
    rangeSelector: { flexDirection: 'row', backgroundColor: colors.background, borderRadius: 10, overflow: 'hidden' },
    rangeButton: { flex: 1, paddingVertical: 12, alignItems: 'center' },
    rangeButtonActive: { backgroundColor: CHART_ORANGE, borderRadius: 8, margin: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 3 },
    rangeButtonText: { color: colors.text, fontSize: 14, fontWeight: '600' },
    rangeButtonTextActive: { color: '#FFF' },
    container: { paddingBottom: 40 },
    statsCard: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: colors.card, borderRadius: 16, paddingVertical: 20, margin: 16, marginTop: 16, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 5 },
    statItem: { alignItems: 'center' },
    statValue: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
    statLabel: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
    divider: { width: 1, backgroundColor: colors.border },
    chart: { 
        borderRadius: 16, 
        marginTop: 10,
        paddingRight: 35, 
        paddingLeft: 10,
    },
    placeholderContainer: { marginHorizontal:16, height: 220, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, borderRadius: 12, marginTop: 10, paddingHorizontal: 20 },
    placeholderText: { fontSize: 16, fontWeight: '600', color: colors.textSecondary, textAlign: 'center', marginTop: 12 },
    placeholderSubText: { fontSize: 14, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
    listHeader: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginTop: 24, marginBottom: 8, paddingHorizontal: 16 },
    readingRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, marginBottom: 10, marginHorizontal: 16 },
    statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
    readingInfo: { flex: 1 },
    timeLabel: { color: colors.text, fontSize: 14, fontWeight: '500' },
    statusLabel: { fontSize: 12, fontWeight: 'bold', marginTop: 2 },
    glucoseValue: { color: colors.text, fontWeight: 'bold', fontSize: 16 },
});

export default function FullGlucoseChart() {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const navigation = useNavigation();
  
  const [period, setPeriod] = useState('day');
  const [displayDate, setDisplayDate] = useState(new Date());
  const [chartData, setChartData] = useState(null);
  const [readings, setReadings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [average, setAverage] = useState(0);
  const [high, setHigh] = useState(0);
  const [low, setLow] = useState(0);
  const [thresholds, setThresholds] = useState({
    lowThreshold: 70, highFastingThreshold: 100, highPostMealThreshold: 140, veryHighThreshold: 180,
  });

  useFocusEffect(
    useCallback(() => {
        const loadDataAndThresholds = async () => {
            setIsLoading(true);
            try {
                const thresholdKeys = ['lowThreshold', 'highFastingThreshold', 'highPostMealThreshold', 'veryHighThreshold'];
                const [storedThresholds, logs] = await Promise.all([
                    AsyncStorage.multiGet(thresholdKeys),
                    api.getHistory([3], period, displayDate.toISOString())
                ]);
                const loadedThresholds = { ...thresholds };
                storedThresholds.forEach(([key, value]) => { if (value !== null) loadedThresholds[key] = parseFloat(value); });
                setThresholds(loadedThresholds);
                processData(logs, period);
            } catch (error) {
                console.error("Error fetching glucose data/thresholds:", error);
                setChartData(null); setReadings([]); setAverage(0); setHigh(0); setLow(0);
            } finally {
                setIsLoading(false);
            }
        };
        loadDataAndThresholds();
    }, [period, displayDate])
  );

  const processData = useCallback((logs, currentPeriod) => {
    const allReadings = logs ? [...logs].reverse() : [];
    setReadings(allReadings);
    if (allReadings.length > 0) {
        const amounts = allReadings.map(log => Number(log.amount) || 0);
        const sum = amounts.reduce((a, b) => a + b, 0);
        setAverage(Math.round(sum / amounts.length));
        setHigh(Math.round(Math.max(...amounts)));
        setLow(Math.round(Math.min(...amounts)));
    } else {
        setAverage(0); setHigh(0); setLow(0);
    }
    if (!logs || logs.length === 0) {
      setChartData(null); return;
    }
    let labels = []; let dataPoints = [];
    if (currentPeriod === 'day') {
      labels = allReadings.map(log => new Date(log.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
      dataPoints = allReadings.map(log => Number(log.amount) || 0);
    } else if (currentPeriod === 'week') {
      const dailyAverages = {};
      allReadings.forEach(log => {
        const day = new Date(log.date).toLocaleDateString('en-US', { weekday: 'short' });
        const dayIndex = new Date(log.date).getDay();
        if (!dailyAverages[day]) dailyAverages[day] = { total: 0, count: 0, sortKey: dayIndex };
        dailyAverages[day].total += (Number(log.amount) || 0);
        dailyAverages[day].count++;
      });
      const sortedDays = Object.keys(dailyAverages).sort((a,b) => dailyAverages[a].sortKey - dailyAverages[b].sortKey);
      labels = sortedDays;
      dataPoints = sortedDays.map(day => Math.round(dailyAverages[day].total / dailyAverages[day].count));
    } else if (currentPeriod === 'month') {
        const weeklyAverages = {};
        allReadings.forEach(log => {
          const week = `W${getWeekOfMonth(new Date(log.date))}`;
          if (!weeklyAverages[week]) weeklyAverages[week] = { total: 0, count: 0 };
          weeklyAverages[week].total += (Number(log.amount) || 0);
          weeklyAverages[week].count++;
        });
        const sortedWeeks = Object.keys(weeklyAverages).sort((a, b) => parseInt(a.substring(1)) - parseInt(b.substring(1)));
        labels = sortedWeeks;
        dataPoints = sortedWeeks.map(week => Math.round(weeklyAverages[week].total / weeklyAverages[week].count));
    }
    if (dataPoints.length < 2) { setChartData(null); } 
    else { setChartData({ labels, datasets: [{ data: dataPoints, strokeWidth: 2 }] }); }
  }, []);

  const changeDate = (amount) => {
    const newDate = new Date(displayDate);
    if (period === 'day') newDate.setDate(newDate.getDate() + amount);
    else if (period === 'week') newDate.setDate(newDate.getDate() + (amount * 7));
    else if (period === 'month') newDate.setMonth(newDate.getMonth() + amount);
    setDisplayDate(newDate);
  };

  const formatDate = () => {
    if (period === 'day') return displayDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    if (period === 'week') {
        const start = new Date(displayDate); start.setDate(displayDate.getDate() - displayDate.getDay());
        const end = new Date(start); end.setDate(start.getDate() + 6);
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
    if (period === 'month') return displayDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const renderChart = () => {
    if (isLoading) return <ActivityIndicator size="large" color={colors.primary} style={styles.placeholderContainer} />;
    if (!chartData) {
      return (
        <View style={styles.placeholderContainer}>
          <MaterialCommunityIcons name="chart-line-variant" size={48} color="#CED4DA" />
          <Text style={styles.placeholderText}>Not enough data for a chart.</Text>
          <Text style={styles.placeholderSubText}>At least two readings on different {period === 'day' ? 'times' : 'days'} are needed.</Text>
        </View>
      );
    }
    return (
      <LineChart
        data={{ labels: [], datasets: chartData.datasets }}
        width={screenWidth} 
        height={220}
        withVerticalLabels={false} withShadow={false} fromZero bezier
        chartConfig={{
            backgroundColor: colors.card,
            backgroundGradientFrom: colors.card,
            backgroundGradientTo: colors.card,
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(61, 136, 248, ${opacity})`,
            labelColor: (opacity = 1) => colors.textSecondary,
            style: { borderRadius: 16 },
            propsForDots: { r: '4', strokeWidth: '2', stroke: CHART_ORANGE },
            propsForBackgroundLines: { strokeDasharray: '4', stroke: colors.border },
            fillShadowGradientFrom: CHART_ORANGE,
            fillShadowGradientFromOpacity: 0.1,
            fillShadowGradientTo: colors.card,
            fillShadowGradientToOpacity: 0,
        }}
        style={styles.chart} 
        renderDotContent={({x, y, index}) => {
            const labelCount = chartData.labels.length;
            const showLabelModulo = labelCount > 6 ? Math.ceil(labelCount / 6) : 1;
            if (index % showLabelModulo !== 0) return null;
            const isFirstLabel = index === 0;
            return (
                <Text key={index} style={{
                    position: 'absolute', top: y + 15, left: isFirstLabel ? x : x - 20,
                    textAlign: isFirstLabel ? 'left' : 'center', color: colors.textSecondary, fontSize: 10, width: 40,
                }}>
                    {chartData.labels[index]}
                </Text>
            );
        }}
      />
    );
  };
  
  const renderReadingItem = ({ item, index }) => {
    const date = new Date(item.date);
    const status = getBloodSugarStatus(item.amount, thresholds);
    return (
      <Animatable.View animation="fadeInUp" duration={400} delay={index * 50}>
        <View style={styles.readingRow}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]}/>
            <View style={styles.readingInfo}>
                <Text style={styles.timeLabel}>{date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                <Text style={[styles.statusLabel, { color: status.color }]}>{status.level}</Text>
            </View>
            <Text style={styles.glucoseValue}>{Math.round(item.amount)} mg/dL</Text>
        </View>
      </Animatable.View>
    );
  };

  const renderHeader = () => (
    <Animatable.View animation="fadeIn" duration={500}>
        <View style={styles.statsCard}>
            <View style={styles.statItem}>
                <Text style={styles.statValue}>{average}</Text>
                <Text style={styles.statLabel}>Average</Text>
            </View>
            <View style={styles.divider}/>
            <View style={styles.statItem}>
                <Text style={[styles.statValue, {color: '#F44336'}]}>{high}</Text>
                <Text style={styles.statLabel}>Highest</Text>
            </View>
            <View style={styles.divider}/>
            <View style={styles.statItem}>
                <Text style={[styles.statValue, {color: '#2196F3'}]}>{low}</Text>
                <Text style={styles.statLabel}>Lowest</Text>
            </View>
        </View>
        {renderChart()}
        {readings.length > 0 && <Text style={styles.listHeader}>All Readings</Text>}
    </Animatable.View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="chevron-back" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Glucose Insights</Text>
            <View style={{width: 40}} />
        </View>
        <View style={styles.controlsContainer}>
            <View style={styles.dateNavigator}>
                <TouchableOpacity onPress={() => changeDate(-1)} style={styles.arrowButton}>
                    <Ionicons name="chevron-back-circle-outline" size={30} color={colors.icon} />
                </TouchableOpacity>
                <Text style={styles.dateText}>{formatDate()}</Text>
                <TouchableOpacity onPress={() => changeDate(1)} style={styles.arrowButton}>
                    <Ionicons name="chevron-forward-circle-outline" size={30} color={colors.icon} />
                </TouchableOpacity>
            </View>
            <View style={styles.rangeSelector}>
              {['day', 'week', 'month'].map((option) => (
                <TouchableOpacity key={option} style={[styles.rangeButton, period === option && styles.rangeButtonActive]} onPress={() => setPeriod(option)}>
                  <Text style={[styles.rangeButtonText, period === option && styles.rangeButtonTextActive]}>{option.charAt(0).toUpperCase() + option.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>
        </View>
        <FlatList
          data={readings.reverse()}
          keyExtractor={(item) => item.logID.toString()}
          renderItem={renderReadingItem}
          ListHeaderComponent={renderHeader()}
          ListEmptyComponent={ !isLoading ? <View style={styles.placeholderContainer}><Text style={styles.placeholderText}>No readings for this period.</Text></View> : null }
          contentContainerStyle={styles.container}
        />
    </SafeAreaView>
  );
}