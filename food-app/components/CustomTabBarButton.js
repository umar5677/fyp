// CustomTabBarButton.js (in project root)
import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const CustomTabBarButton = ({ onPress }) => (
  <TouchableOpacity
    style={styles.container}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={styles.button}>
      <Ionicons name="add" size={30} color="#FFFFFF" />
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    // This will make it sit above the standard tab bar, overlapping content slightly.
    // Adjust this value if it looks too high or too low.
    // If you want it more integrated, you might reduce 'top' or change the approach.
    top: -28,
    justifyContent: 'center',
    alignItems: 'center',
    // Shadow for the button itself (optional, can be subtle)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.20,
    shadowRadius: 2.5,
    elevation: 3,
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#00C49A', // Your teal color
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CustomTabBarButton;