// components/SpeedDialButton.js
import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// --- The Fix Starts Here ---
// 1. Accept 'userId' as a prop instead of 'route'
const SpeedDialButton = ({ navigation, userId }) => {
// --- The Fix Ends Here ---

  const [isOpen, setIsOpen] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  const toggleMenu = () => {
    const toValue = isOpen ? 0 : 1;
    Animated.spring(animation, {
      toValue,
      friction: 6,
      useNativeDriver: true,
    }).start();
    setIsOpen(!isOpen);
  };

  const handleActionPress = (action) => {
    toggleMenu(); // Close menu after action
    switch (action) {
      case 'calorieSugar':
        navigation.navigate('LogCalorieSugarModal', { userId });
        break;
      case 'bloodSugar':
        // --- The Fix Starts Here ---
        // 2. Use the 'userId' prop directly when navigating
        navigation.navigate('LogBloodSugarModal', { userId: userId });
        // --- The Fix Ends Here ---
        break;
      default:
        break;
    }
  };

  const rotation = { transform: [ { rotate: animation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'], }), }, ], };
  const calorieSugarStyle = { transform: [ { scale: animation }, { translateY: animation.interpolate({ inputRange: [0, 1], outputRange: [0, -70], }), }, ], opacity: animation, };
  const bloodSugarStyle = { transform: [ { scale: animation }, { translateY: animation.interpolate({ inputRange: [0, 1], outputRange: [0, -130], }), }, ], opacity: animation, };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.secondaryButtonContainer, bloodSugarStyle]}>
        <TouchableOpacity style={[styles.secondaryButton, styles.bloodSugarButton]} onPress={() => handleActionPress('bloodSugar')} activeOpacity={0.7}>
          <Ionicons name="water-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
      <Animated.View style={[styles.secondaryButtonContainer, calorieSugarStyle]}>
        <TouchableOpacity style={[styles.secondaryButton, styles.calorieSugarButton]} onPress={() => handleActionPress('calorieSugar')} activeOpacity={0.7}>
          <Ionicons name="restaurant-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
      <TouchableOpacity style={styles.mainButtonContainer} onPress={toggleMenu} activeOpacity={0.8}>
        <Animated.View style={[styles.mainButton, rotation]}>
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', position: 'relative', top: -28, },
  mainButtonContainer: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5, },
  mainButton: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#00C49A', justifyContent: 'center', alignItems: 'center', },
  secondaryButtonContainer: { position: 'absolute', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.20, shadowRadius: 1.41, elevation: 2, },
  secondaryButton: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', },
  calorieSugarButton: { backgroundColor: '#00A0C4', },
  bloodSugarButton: { backgroundColor: '#007AFF', },
});

export default SpeedDialButton;