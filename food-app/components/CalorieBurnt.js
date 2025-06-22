import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';

const calorieData = {
  Day: [
    { date: '5/5/25', calories: 225 },
    { date: '6/5/25', calories: 600 },
    { date: '7/5/25', calories: 400 },
  ],
  Week: [
    { date: 'Week 1', calories: 2200 },
    { date: 'Week 2', calories: 3100 },
  ],
  Month: [
    { date: 'May', calories: 12000 },
    { date: 'June', calories: 9000 },
  ],
};

export default function CalorieSection() {
  const [activeTab, setActiveTab] = useState('Day');

  const renderItem = ({ item }) => (
    <View style={styles.row}>
      <Text style={styles.date}>{item.date}</Text>
      <Text style={styles.calories}>{item.calories} kcal</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calorie Burnt</Text>

      <View style={styles.tabs}>
        {['Day', 'Week', 'Month'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={calorieData[activeTab]}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.date}-${index}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F7F7F7',
    padding: 16,
    borderRadius: 16,
    marginTop: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E1E2D',
    marginBottom: 10,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 12,
    justifyContent: 'space-around',
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#EEE',
  },
  activeTab: {
    backgroundColor: '#3D88F8',
  },
  tabText: {
    color: '#1E1E2D',
    fontWeight: '500',
  },
  activeTabText: {
    color: 'white',
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomColor: '#DDD',
    borderBottomWidth: 1,
  },
  date: {
    color: '#1E1E2D',
  },
  calories: {
    color: '#FFA726',
    fontWeight: 'bold',
  },
});

