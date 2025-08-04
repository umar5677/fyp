import React, { useState } from 'react';
import { 
    View, Text, StyleSheet, Modal, TextInput, 
    TouchableOpacity, ActivityIndicator, Alert, 
    KeyboardAvoidingView, Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { api } from '../utils/api';
import * as Haptics from 'expo-haptics';

// Sub-component for the star rating selector
const StarRating = ({ rating, setRating, colors }) => {
    const componentStyles = getStyles(colors);
    return (
        <View style={componentStyles.starContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity 
                    key={star} 
                    onPress={() => { 
                        setRating(star); 
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); 
                    }}
                >
                    <Ionicons 
                        name={star <= rating ? 'star' : 'star-outline'}
                        size={40} 
                        color={star <= rating ? '#FFC107' : colors.textSecondary}
                    />
                </TouchableOpacity>
            ))}
        </View>
    );
};

// Main Modal Component
export const ReviewModal = ({ isVisible, onClose }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    
    const [rating, setRating] = useState(0);
    const [reviewText, setReviewText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const charCount = reviewText.length;
    const charColor = charCount > 50 ? colors.logoutText : colors.textSecondary;

    const handleSubmit = async () => {
        if (rating === 0) {
            Alert.alert("Rating Required", "Please select at least one star to submit your feedback.");
            return;
        }
        if (charCount > 50) {
             Alert.alert("Review Too Long", "Your optional comments must be 50 characters or less.");
            return;
        }
        
        setIsLoading(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try {
            const response = await api.submitReview({ rating, reviewText });
            Alert.alert("Feedback Submitted", response.message);
            onClose(); 
            setRating(0);
            setReviewText('');
        } catch (error) {
            Alert.alert("Error", error.message || "Could not submit your feedback.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"} 
                style={styles.modalOverlay}
            >
                <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose} />
                <View style={styles.modalContent}>
                    <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                        <Ionicons name="close-circle" size={32} color={colors.textSecondary} />
                    </TouchableOpacity>
                    
                    <Text style={styles.modalTitle}>Rate Your Experience</Text>
                    <Text style={styles.modalSubtitle}>Your feedback helps us improve GlucoBites for everyone.</Text>

                    <StarRating rating={rating} setRating={setRating} colors={colors} />

                    <TextInput
                        style={styles.input}
                        placeholder="Share your experience (optional)"
                        placeholderTextColor={colors.textSecondary}
                        multiline
                        value={reviewText}
                        onChangeText={setReviewText}
                    />
                    <Text style={[styles.charCount, { color: charColor }]}>{charCount}/50</Text>

                    <TouchableOpacity 
                        style={[styles.submitButton, isLoading && { backgroundColor: colors.border }]} 
                        onPress={handleSubmit} 
                        disabled={isLoading}
                    >
                        {isLoading 
                            ? <ActivityIndicator color="#fff" /> 
                            : <Text style={styles.submitButtonText}>Submit Feedback</Text>
                        }
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const getStyles = (colors) => StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContent: {
        width: '90%',
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 20,
        paddingTop: 50,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    closeButton: {
        position: 'absolute',
        top: 10,
        right: 10,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 8,
        color: colors.text,
    },
    modalSubtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 20,
        paddingHorizontal: 10,
    },
    starContainer: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        width: '100%',
        marginBottom: 20,
    },
    input: {
        width: '100%',
        height: 100,
        backgroundColor: colors.background,
        borderRadius: 10,
        padding: 15,
        borderWidth: 1,
        borderColor: colors.border,
        textAlignVertical: 'top',
        fontSize: 16,
        color: colors.text,
    },
    charCount: {
        width: '100%',
        textAlign: 'right',
        fontSize: 12,
        marginTop: 4,
        marginBottom: 16,
    },
    submitButton: {
        width: '100%',
        backgroundColor: colors.primary,
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});