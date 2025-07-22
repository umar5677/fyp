// fyp/food-app/components/HeaderBackground.js
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext'; // Import useTheme hook

const HeaderBackground = () => {
  const { theme } = useTheme(); // Get the current theme

  // Define colors for light theme
  const primaryLight = '249, 115, 22';
  const highlightLight = '254, 243, 199';

  // Define colors for dark theme (more subtle and deep)
  const primaryDark = '150, 60, 0';
  const highlightDark = '200, 90, 20';
  
  return (
    <View style={[styles.container, { backgroundColor: theme === 'light' ? '#F97316' : '#1E293B' }]}>
      {/* Blob one */}
      <LinearGradient
        colors={[
          theme === 'light' ? `rgba(${primaryLight}, 0.5)` : `rgba(${primaryDark}, 0.4)`,
          theme === 'light' ? `rgba(${primaryLight}, 0.1)` : `rgba(${primaryDark}, 0.1)`
        ]}
        style={[styles.gradientBlob, styles.blobOne]}
      />
      
      {/* Blob two */}
      <LinearGradient
        colors={[
          theme === 'light' ? `rgba(${highlightLight}, 0.6)` : `rgba(${highlightDark}, 0.3)`,
          theme === 'light' ? `rgba(${highlightLight}, 0.1)` : `rgba(${highlightDark}, 0.05)`
        ]}
        style={[styles.gradientBlob, styles.blobTwo]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 250,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  gradientBlob: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
  },
  blobOne: {
    top: -150,
    left: -100,
  },
  blobTwo: {
    top: -200,
    right: -150,
  },
});

export default HeaderBackground;