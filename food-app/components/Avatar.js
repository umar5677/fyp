// fyp/food-app/components/Avatar.js
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const getInitials = (name) => {
    if (!name) return '?';
    const words = name.split(' ');
    if (words.length > 1) {
        return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
};

export const Avatar = ({ source, name, size = 48 }) => {
    const { colors } = useTheme();

    const styles = StyleSheet.create({
        container: {
            width: size,
            height: size,
            borderRadius: size / 2,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: colors.border,
            borderWidth: 1,
            borderColor: colors.border,
        },
        image: {
            width: '100%',
            height: '100%',
            borderRadius: size / 2,
        },
        initials: {
            color: colors.primary,
            fontSize: size * 0.4,
            fontWeight: 'bold',
        },
    });
    
    return (
        <View style={styles.container}>
            {source ? (
                <Image source={{ uri: source }} style={styles.image} />
            ) : (
                <Text style={styles.initials}>{getInitials(name)}</Text>
            )}
        </View>
    );
};