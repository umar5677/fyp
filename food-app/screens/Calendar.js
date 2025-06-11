// screens/Calendar.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const Calendar = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Calendar Screen (Tab 2)</Text>
    </View>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ADD8E6' }, // LightBlue
  text: { fontSize: 20 },
});
export default Calendar;