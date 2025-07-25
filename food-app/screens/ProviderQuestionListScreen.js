// screens/ProviderQuestionListScreen.js

import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import * as Haptics from 'expo-haptics';
import { api } from '../utils/api'; 
import { useTheme } from '../context/ThemeContext'; 

const QuestionItem = ({ item, onPress, index, colors }) => {
    const styles = getStyles(colors);
    return (
        <Animatable.View animation="fadeInUp" duration={500} delay={index * 100}>
            <TouchableOpacity style={styles.questionCard} onPress={() => onPress(item)}>
                <View style={styles.questionContent}>
                    <Text style={styles.questionText}>{item.questionText}</Text>
                    <View style={styles.infoRow}>
                        <Text style={styles.askerInfo}>
                            From: {item.askerFirstName} {item.askerLastName}
                        </Text>
                        <Text style={styles.dateInfo}>
                            {new Date(item.createdAt).toLocaleDateString()}
                        </Text>
                    </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
        </Animatable.View>
    );
};


export default function ProviderQuestionListScreen() {
    const navigation = useNavigation();
    const { colors, theme } = useTheme(); 
    const styles = getStyles(colors); 

    const [questions, setQuestions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // This logic remains the same
    const fetchQuestions = async () => {
        try {
            const data = await api.getProviderQuestions();
            setQuestions(data);
        } catch (error) {
            console.error("Failed to fetch questions:", error.message);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => {
        setIsLoading(true);
        fetchQuestions();
    }, []));

    const onRefresh = useCallback(() => {
        setIsRefreshing(true);
        fetchQuestions();
    }, []);

    // Add haptic feedback for a better user experience
    const handleSelectQuestion = (question) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        navigation.navigate('ProviderAnswerScreen', { question });
    };

    // Main loading state
    if (isLoading) {
        return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerContainer}>
                <Text style={styles.header}>Pending Questions</Text>
            </View>

            <FlatList
                data={questions}
                keyExtractor={(item) => item.questionID.toString()}
                renderItem={({ item, index }) => <QuestionItem item={item} onPress={handleSelectQuestion} index={index} colors={colors} />}
                contentContainerStyle={styles.listContentContainer}
                ListEmptyComponent={
                    <Animatable.View animation="fadeIn" delay={300} style={styles.center}>
                        <Ionicons name="checkmark-done-circle-outline" size={80} color={colors.textSecondary} />
                        <Text style={styles.emptyTitle}>All Caught Up!</Text>
                        <Text style={styles.emptyText}>There are no pending questions right now.</Text>
                    </Animatable.View>
                }
                refreshControl={
                    <RefreshControl 
                        refreshing={isRefreshing} 
                        onRefresh={onRefresh} 
                        tintColor={colors.primary} // For iOS
                        colors={[colors.primary]} // For Android
                    />
                }
            />
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: colors.background 
    },
    center: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        paddingHorizontal: 20,
        marginTop: '40%'
    },
    headerContainer: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
    },
    header: { 
        fontSize: 32, 
        fontWeight: 'bold', 
        color: colors.text 
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.text,
        marginTop: 16,
    },
    emptyText: { 
        fontSize: 16, 
        color: colors.textSecondary,
        marginTop: 8,
        textAlign: 'center'
    },
    listContentContainer: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    questionCard: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 18,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2, },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: 1,
        borderColor: colors.border
    },
    questionContent: {
        flex: 1,
        marginRight: 10,
    },
    questionText: { 
        fontSize: 16, 
        color: colors.text, 
        lineHeight: 24,
        fontWeight: '500',
    },
    infoRow: {
        marginTop: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    askerInfo: { 
        fontSize: 14, 
        fontWeight: '600', 
        color: colors.primary
    },
    dateInfo: { 
        fontSize: 12, 
        color: colors.textSecondary 
    },
});