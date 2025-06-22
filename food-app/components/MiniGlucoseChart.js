import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useNavigation } from '@react-navigation/native'; 

const screenWidth = Dimensions.get('window').width;

export default function MiniGlucoseChart() {
  const navigation = useNavigation(); 

  const data = {
    labels: ['8am', '10am', '12pm', '2pm', '4pm'],
    datasets: [{ data: [90, 110, 140, 130, 100] }],
  };

  return (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('FullGlucoseChart')}>
      <Text style={styles.title}>Insights</Text>
      <LineChart
        data={data}
        width={screenWidth - 60}
        height={220}
        chartConfig={{
          backgroundColor: '#F5F0FF',
          backgroundGradientFrom: '#F5F0FF',
          backgroundGradientTo: '#F5F0FF',
          decimalPlaces: 0,
          color: () => `#3D88F8`,
          labelColor: () => '#1E1E2D',
          propsForDots: { r: '3', strokeWidth: '1', stroke: '#3D88F8' },
        }}
        bezier
        style={styles.chart}
      />
      <Text style={styles.caption}>Showing today's glucose levels</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F5F0FF', // light lavender background
    borderRadius: 16,
    padding: 10,
    marginVertical: 10,
  },
  title: {
    color: '#1E1E2D', // dark text for contrast
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    paddingLeft: 10,
  },
  chart: {
    borderRadius: 12,
  },
  caption: {
    color: '#555', // darker gray for readability
    fontSize: 12,
    paddingTop: 8,
    paddingLeft: 10,
  },
});
