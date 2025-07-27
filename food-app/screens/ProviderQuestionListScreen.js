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
    const { colors } = useTheme(); 
    const styles = getStyles(colors); 

    const [questions, setQuestions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

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

    const handleSelectQuestion = (question) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        navigation.navigate('ProviderAnswerScreen', { question });
    };

    if (isLoading) {
        return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Dashboard</Text>
                    <Text style={styles.headerSubtitle}>Pending Questions</Text>
                </View>
                <TouchableOpacity style={styles.historyButton} onPress={() => navigation.navigate('ProviderHistory')}>
                    <Ionicons name="archive-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={questions}
                keyExtractor={(item) => item.questionID.toString()}
                renderItem={({ item, index }) => <QuestionItem item={item} onPress={handleSelectQuestion} index={index} colors={colors} />}
                contentContainerStyle={styles.listContentContainer}
                ListEmptyComponent={
                    <Animatable.View animation="fadeIn" delay={300} style={styles.emptyContainer}>
                        <Ionicons name="checkmark-done-circle-outline" size={80} color={colors.textSecondary} />
                        <Text style={styles.emptyTitle}>All Caught Up!</Text>
                        <Text style={styles.emptyText}>There are no new questions at this time.</Text>
                    </Animatable.View>
                }
                refreshControl={
                    <RefreshControl 
                        refreshing={isRefreshing} 
                        onRefresh={onRefresh} 
                        tintColor={colors.primary}
                        colors={[colors.primary]}
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
        backgroundColor: colors.background
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        backgroundColor: colors.card,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border
    },
    headerTitle: { 
        fontSize: 28, 
        fontWeight: 'bold', 
        color: colors.text 
    },
    headerSubtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        marginTop: 2,
    },
    historyButton: {
        backgroundColor: colors.background,
        padding: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border
    },
    emptyContainer: {
        alignItems: 'center', 
        paddingTop: '30%',
        paddingHorizontal: 20,
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
        padding: 20,
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
        shadowOffset: { width: 0, height: 2 },
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