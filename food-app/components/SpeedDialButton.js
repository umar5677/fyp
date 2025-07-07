// components/SpeedDialButton.js
import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const SpeedDialButton = ({ navigation, userId }) => {
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
    toggleMenu();
    switch (action) {
      case 'calorieSugar':
        navigation.navigate('LogCalorieSugarModal', { userId });
        break;
      case 'bloodSugar':
        navigation.navigate('LogBloodSugarModal', { userId: userId });
        break;
      default:
        break;
    }
  };

  const rotation = {
    transform: [
      {
        rotate: animation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '45deg'],
        }),
      },
    ],
  };

  // Animation for the button spreading up and to the left
  const bloodSugarStyle = {
    transform: [
      { scale: animation },
      {
        translateX: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -50], // Move left
        }),
      },
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -60], // Move up
        }),
      },
    ],
    opacity: animation,
  };

  // Animation for the button spreading up and to the right
  const calorieSugarStyle = {
    transform: [
      { scale: animation },
      {
        translateX: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 50], // Move right
        }),
      },
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -60], // Move up
        }),
      },
    ],
    opacity: animation,
  };

  return (
    // This container just centers the main button and acts as a relative
    <View style={styles.container}>
      <Animated.View style={[styles.secondaryButtonContainer, bloodSugarStyle]}>
        <TouchableOpacity style={[styles.secondaryButton, styles.bloodSugarButton]} onPress={() => handleActionPress('bloodSugar')} activeOpacity={0.7}>
          <MaterialCommunityIcons name="diabetes" size={24} color="#FFFFFF" />
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
  container: {
    // This view now acts as the anchor for all buttons
    position: 'relative',
    alignItems: 'center',
    top: -28,
  },
  mainButtonContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  mainButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0096FF', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  secondaryButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.20,
    shadowRadius: 1.41,
    elevation: 2,
  },
  calorieSugarButton: {
    backgroundColor: '#FF5C00',
  },
  bloodSugarButton: {
    backgroundColor: '#007AFF',
  },
});

export default SpeedDialButton;