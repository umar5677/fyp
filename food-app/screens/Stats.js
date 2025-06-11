// screens/Stats.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Stats = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Stats Screen (Tab 3)</Text>
    </View>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E0FFFF' }, // LightCyan
  text: { fontSize: 20 },
});
export default Stats;