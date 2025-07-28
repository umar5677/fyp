// fyp/food-app/components/CalorieBurnt.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';

// The component now accepts its data as props from the Home screen
export default function CalorieSection({ calorieData, isLoading, onRefresh }) {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  
  const [activeTab, setActiveTab] = useState('Day');

  // The internal state and data fetching logic have been removed.
  // It now relies entirely on the props passed from Home.js.
  
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

            {/* It uses the isLoading prop from the Home screen */}
            {isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
            ) : (
              <FlatList
                  // It uses the calorieData prop from the Home screen
                  data={calorieData[activeTab]}
                  renderItem={renderItem}
                  keyExtractor={(item, index) => `${item.date}-${index}`}
                  ListEmptyComponent={<Text style={styles.emptyText}>No exercise data recorded for this period.</Text>}
                  // The onRefresh prop is also passed down, so pulling to refresh
                  // triggers a refresh of the entire Home screen's data.
                  onRefresh={onRefresh}
                  refreshing={isLoading}
              />
            )}
        </View>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: {
        backgroundColor: colors.card,
        padding: 16,
        borderRadius: 16,
        marginTop: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
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
        backgroundColor: colors.background,
    },
    activeTab: {
        backgroundColor: colors.primary,
    },
    tabText: {
        color: colors.text,
        fontWeight: '500',
    },
    activeTabText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
    },
    date: {
        color: colors.text,
    },
    calories: {
        color: '#FFA726',
        fontWeight: 'bold',
    },
    emptyText: {
        textAlign: 'center',
        color: colors.textSecondary,
        paddingVertical: 20,
    },
});