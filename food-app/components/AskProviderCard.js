import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const AskProviderCard = ({ questionsRemaining, isPremium, onNavigate }) => {
    const { colors } = useTheme(); 
    const styles = getStyles(colors); 

    let descriptionText;
    let buttonText;
    let isButtonDisabled;

    if (isPremium) {
        descriptionText = <>You have <Text style={{ fontWeight: 'bold', color: colors.text }}>{questionsRemaining}</Text> questions remaining this week. Get expert advice on your health journey.</>;
        buttonText = questionsRemaining > 0 ? 'Ask a New Question' : 'Weekly Limit Reached';
        isButtonDisabled = questionsRemaining <= 0;
    } else {
        descriptionText = 'Upgrade to Premium to get expert answers to your health questions from verified providers.';
        buttonText = 'Upgrade to Premium';
        isButtonDisabled = true;
    }

    const handleMainButtonPress = () => {
        if (isPremium && questionsRemaining > 0) {
            onNavigate(); 
        } else if (!isPremium) {
            Alert.alert(
                "Premium Feature",
                "Please consider upgrading to access expert advice from verified providers."
            );
        }
    };

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <Ionicons name="help-buoy-outline" size={24} color={colors.primary} />
                <Text style={styles.title}>Ask a Provider</Text>
            </View>
            <Text style={styles.description}>
                {descriptionText}
            </Text>

            <TouchableOpacity 
                style={[styles.button, isButtonDisabled && styles.buttonDisabled]} 
                onPress={handleMainButtonPress}
                disabled={isButtonDisabled && isPremium}
            >
                <Text style={styles.buttonText}>{buttonText}</Text>
            </TouchableOpacity>

            {isPremium && (
                <View style={styles.historyContainer}>
                    <TouchableOpacity style={styles.historyButton} onPress={onNavigate}>
                        <Text style={styles.historyButtonText}>View Question History →</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const getStyles = (colors) => StyleSheet.create({
    card: {
        backgroundColor: colors.card, 
        borderRadius: 15, 
        padding: 20, 
        marginVertical: 10,
        elevation: 2, 
        shadowColor: '#000', 
        shadowOpacity: 0.08, 
        shadowRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginBottom: 8 
    },
    title: { 
        fontSize: 18, 
        fontWeight: 'bold', 
        marginLeft: 10, 
        color: colors.text 
    },
    description: { 
        fontSize: 14, 
        color: colors.textSecondary, 
        lineHeight: 20, 
        marginBottom: 16 
    },
    button: { 
        backgroundColor: colors.primary, 
        paddingVertical: 12, 
        borderRadius: 10, 
        alignItems: 'center' 
    },
    buttonDisabled: { 
        backgroundColor: '#A9A9A9' 
    },
    buttonText: { 
        color: '#FFF', 
        fontSize: 16, 
        fontWeight: '600' 
    },

    historyContainer: {
        alignItems: 'flex-end', 
        marginTop: 12,
    },
    historyButton: {
        paddingVertical: 4, 
        paddingHorizontal: 8,
    },
    historyButtonText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
});

export default AskProviderCard;