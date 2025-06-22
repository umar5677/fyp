import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';

const screenWidth = Dimensions.get('window').width;

const mockData = {
  day: { labels: ['8 AM', '10 AM', '12 PM', '2 PM', '4 PM'], values: [110, 115, 120, 118, 112] },
  week: { labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], values: [100, 105, 98, 110, 115, 95, 102] },
  month: { labels: ['W1', 'W2', 'W3', 'W4'], values: [102, 108, 100, 110] },
};

export default function InsightsScreen() {
  const [range, setRange] = useState('day');
  const chartLabels = mockData[range].labels;
  const chartValues = mockData[range].values;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Insights</Text>
        <View style={styles.rangeSelector}>
          {['day', 'week', 'month'].map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.rangeButton, range === option && styles.rangeButtonActive]}
              onPress={() => setRange(option)}
            >
              <Text style={styles.rangeButtonText}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <LineChart
          data={{ labels: chartLabels, datasets: [{ data: chartValues }] }}
          width={screenWidth - 40}
          height={220}
          chartConfig={{
            backgroundColor: '#F5F0FF',
            backgroundGradientFrom: '#F5F0FF',
            backgroundGradientTo: '#F5F0FF',
            decimalPlaces: 0,
            color: () => `#42A5F5`,
            labelColor: () => '#1E1E2D',
            propsForDots: { r: '4', strokeWidth: '2', stroke: '#42A5F5' },
          }}
          bezier
          style={styles.chart}
        />

        <View style={styles.readings}>
          {chartLabels.map((label, index) => (
            <View key={index} style={styles.readingRow}>
              <Text style={styles.timeLabel}>🕒 {label}</Text>
              <Text style={styles.glucoseValue}>{chartValues[index]} mg/dL</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
  container: {
    padding: 20,
  },
  title: {
    color: '#1E1E2D',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  rangeSelector: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 10,
  },
  rangeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
  },
  rangeButtonActive: {
    backgroundColor: '#42A5F5',
  },
  rangeButtonText: {
    color: '#1E1E2D',
    fontSize: 14,
    fontWeight: '600',
  },
  chart: {
    borderRadius: 12,
    marginTop: 10,
  },
  readings: {
    marginTop: 20,
    paddingHorizontal: 10,
  },
  readingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E6E6E6',
  },
  timeLabel: {
    color: '#333',
    fontSize: 14,
  },
  glucoseValue: {
    color: '#1E1E2D',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
