// screens/ProviderAnswerScreen.js

import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, 
    SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView 
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import * as Haptics from 'expo-haptics';
import { api } from '../utils/api';
import { useTheme } from '../context/ThemeContext';

export default function ProviderAnswerScreen({ route, navigation }) {
    const { colors } = useTheme(); // Use the theme hook for dynamic colors
    const styles = getStyles(colors); // Generate styles based on the theme
    const { question } = route.params; 

    const [answerText, setAnswerText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // This effect styles the header bar to match the theme
    useEffect(() => {
        navigation.setOptions({
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: { color: colors.text },
        });
    }, [colors, navigation]);

    const handleSubmitAnswer = async () => {
        if (answerText.trim().length < 10) {
            Alert.alert('Answer is too short', 'Please provide a more detailed answer.');
            return;
        }

        // Add a satisfying haptic feedback on submission
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsSubmitting(true);
        try {
            await api.submitProviderAnswer(question.questionID, answerText);
            
            Alert.alert('Success', 'Your answer has been submitted successfully.');
            navigation.goBack();

        } catch (error) {
            console.error('Failed to submit answer:', error.message);
            Alert.alert('Error', 'An error occurred while submitting your answer.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"} 
                style={styles.keyboardAvoidingContainer}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Question Card */}
                    <Animatable.View animation="fadeInDown" duration={600} style={styles.card}>
                        <Text style={styles.cardTitle}>Question</Text>
                        <Text style={styles.questionText}>{question.questionText}</Text>
                        <View style={styles.infoBar}>
                            <Text style={styles.infoText}>From: {question.askerFirstName}</Text>
                            <Text style={styles.infoText}>On: {new Date(question.createdAt).toLocaleDateString()}</Text>
                        </View>
                    </Animatable.View>
                    
                    {/* Answer Input */}
                    <Animatable.View animation="fadeInUp" duration={600} delay={200}>
                        <Text style={styles.inputLabel}>Your Answer</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Type your detailed and helpful answer here..."
                            placeholderTextColor={colors.textSecondary}
                            multiline
                            value={answerText}
                            onChangeText={setAnswerText}
                        />
                    </Animatable.View>
                </ScrollView>
                
                {/* Submit Button (Sticky at the bottom) */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity 
                        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} 
                        onPress={handleSubmitAnswer}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.submitButtonText}>Submit Answer</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// Styles are now generated dynamically based on the theme
const getStyles = (colors) => StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: colors.background 
    },
    keyboardAvoidingContainer: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardTitle: { 
        fontSize: 14, 
        fontWeight: '600', 
        color: colors.textSecondary, 
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    questionText: { 
        fontSize: 16, 
        color: colors.text, 
        lineHeight: 24 
    },
    infoBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    infoText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    input: {
        backgroundColor: colors.card,
        color: colors.text,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        fontSize: 16,
        minHeight: 200, // Make the input area larger
        padding: 16,
        textAlignVertical: 'top',
    },
    buttonContainer: {
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 24 : 16,
        backgroundColor: colors.card,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    submitButton: {
        backgroundColor: colors.primary, // Using theme color
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    submitButtonDisabled: { 
        backgroundColor: colors.border // Using theme color for disabled state
    },
    submitButtonText: { 
        color: '#FFFFFF', 
        fontSize: 18, 
        fontWeight: '600' 
    },
});