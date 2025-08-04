import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, FlatList,
    ActivityIndicator, TouchableOpacity, Modal, ScrollView, RefreshControl, Alert
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { api } from '../utils/api';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import { showMessage } from "react-native-flash-message";

// Improved List Item Component with Animation
const HistoryItem = ({ item, onPress, colors, index }) => {
    const styles = getStyles(colors);
    return (
        <Animatable.View animation="fadeInUp" duration={500} delay={index * 100}>
            <TouchableOpacity style={styles.historyCard} onPress={() => onPress(item)} activeOpacity={0.7}>
                <View style={styles.cardContent}>
                    <Text style={styles.historyAsker} numberOfLines={1}>
                        From: {item.askerFirstName} {item.askerLastName}
                    </Text>
                    <Text style={styles.historyQuestionText} numberOfLines={2}>{item.questionText}</Text>
                    <View style={styles.dateContainer}>
                        <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                        <Text style={styles.historyDate}>Answered on {new Date(item.answeredAt).toLocaleDateString()}</Text>
                    </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
        </Animatable.View>
    );
};

export default function ProviderHistoryScreen() {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const navigation = useNavigation();

    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // useFocusEffect with corrected async/await pattern
    useFocusEffect(
      useCallback(() => {
        async function fetchHistory() {
            if (!isRefreshing) setIsLoading(true);
            try {
                const data = await api.getProviderAnsweredQuestions();
                setHistory(data);
            } catch (error) {
                Alert.alert("Error", "Could not load your answer history.");
            } finally {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        }
        fetchHistory();
      }, [isRefreshing])
    );

    const onRefresh = useCallback(() => {
        setIsRefreshing(true);
    }, []);

    const handleDeleteHistoryItem = () => {
        Alert.alert(
            "Remove From History",
            "Are you sure you want to remove this conversation from your history?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        if (!selectedItem) return;
                        setIsDeleting(true);
                        try {
                            await api.deleteProviderQuestion(selectedItem.questionID);
                            setHistory(prevHistory => 
                                prevHistory.filter(h => h.questionID !== selectedItem.questionID)
                            );
                            setIsModalVisible(false);
                            showMessage({ message: "Conversation removed from your history", type: "success" });
                        } catch (error) {
                            Alert.alert("Error", error.message || "Failed to remove item.");
                        } finally {
                            setIsDeleting(false);
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }
                    },
                },
            ]
        );
    };

    const handleViewDetails = (item) => {
        setSelectedItem(item);
        setIsModalVisible(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    if (isLoading && !isRefreshing) {
        return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>Answer History</Text>
                <View style={styles.backButton} />
            </View> */}

            <FlatList
                data={history}
                keyExtractor={(item) => item.questionID.toString()}
                renderItem={({ item, index }) => <HistoryItem item={item} onPress={handleViewDetails} colors={colors} index={index} />}
                contentContainerStyle={{ padding: 16, paddingTop: 8 }}
                ListEmptyComponent={
                    <Animatable.View animation="fadeIn" delay={300} style={styles.emptyContainer}>
                        <Ionicons name="archive-outline" size={80} color={colors.textSecondary} />
                        <Text style={styles.emptyText}>No Answer History</Text>
                        <Text style={styles.emptySubtext}>Your previously answered questions will appear here.</Text>
                    </Animatable.View>
                }
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            />

            {selectedItem && (
                <Modal visible={isModalVisible} animationType="slide" transparent={true} onRequestClose={() => setIsModalVisible(false)}>
                    <View style={styles.detailModalCenteredView}>
                        <View style={styles.detailModalView}>
                            <TouchableOpacity style={styles.detailModalCloseButton} onPress={() => setIsModalVisible(false)}>
                                <Ionicons name="close-circle" size={32} color={colors.textSecondary} />
                            </TouchableOpacity>
                            <ScrollView>
                                <View style={styles.detailModalCard}>
                                    <Text style={styles.detailModalCardTitle}>QUESTION FROM {selectedItem.askerFirstName.toUpperCase()}</Text>
                                    <Text style={styles.detailModalQuestionText}>{selectedItem.questionText}</Text>
                                    <Text style={styles.detailModalDate}>Asked: {new Date(selectedItem.createdAt).toLocaleString()}</Text>
                                </View>
                                <View style={[styles.detailModalCard, styles.detailModalAnswerCard]}>
                                    <Text style={styles.detailModalCardTitle}>YOUR ANSWER</Text>
                                    <Text style={styles.detailModalAnswerText}>{selectedItem.answerText}</Text>
                                    <Text style={styles.detailModalDate}>Answered: {new Date(selectedItem.answeredAt).toLocaleString()}</Text>
                                </View>
                                <TouchableOpacity 
                                    style={styles.deleteButton} 
                                    onPress={handleDeleteHistoryItem}
                                    disabled={isDeleting}
                                >
                                    {isDeleting 
                                        ? <ActivityIndicator color={colors.logoutText} /> 
                                        : <Text style={styles.deleteButtonText}>Remove From History</Text>
                                    }
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            )}
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.card,
    },
    backButton: {
        width: 40,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.text,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: '40%',
    },
    emptyText: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    emptySubtext: {
        marginTop: 8,
        color: colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
    },
    historyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        padding: 16,
        marginBottom: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    cardContent: {
        flex: 1,
        marginRight: 10,
    },
    historyAsker: {
        color: colors.text,
        fontWeight: 'bold',
        marginBottom: 6,
        fontSize: 15,
    },
    historyQuestionText: {
        color: colors.textSecondary,
        lineHeight: 20,
        fontSize: 14,
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    historyDate: {
        color: colors.primary,
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 6,
    },
    detailModalCenteredView: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    detailModalView: {
        backgroundColor: colors.card,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingTop: 50,
        width: '100%',
        maxHeight: '90%',
    },
    detailModalCloseButton: {
        position: 'absolute',
        top: 15,
        right: 15,
        zIndex: 1,
    },
    detailModalCard: {
        width: '100%',
        padding: 15,
        borderRadius: 10,
        backgroundColor: colors.background,
        marginBottom: 15,
    },
    detailModalAnswerCard: {
        backgroundColor: 'rgba(52, 199, 89, 0.1)',
        borderColor: 'rgba(52, 199, 89, 0.3)',
        borderWidth: 1,
    },
    detailModalCardTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.textSecondary,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    detailModalQuestionText: {
        fontSize: 16,
        color: colors.text,
        lineHeight: 24,
    },
    detailModalAnswerText: {
        fontSize: 16,
        color: colors.text,
        lineHeight: 24,
    },
    detailModalDate: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 12,
        textAlign: 'right',
    },
    deleteButton: {
        marginTop: 20,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: colors.logoutBackground, 
        alignItems: 'center',
        marginHorizontal: 10,
    },
    deleteButtonText: {
        color: colors.logoutText,
        fontSize: 16,
        fontWeight: '600',
    },
});