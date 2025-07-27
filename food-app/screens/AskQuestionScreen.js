import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, SafeAreaView, FlatList, ActivityIndicator, ScrollView, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../utils/api';
import { useTheme } from '../context/ThemeContext';

const QuestionHistoryItem = ({ item, onPress, colors }) => {
    const styles = getStyles(colors);
    const statusStyle = item.status === 'answered' ? styles.statusAnswered : styles.statusPending;
    return (
        <TouchableOpacity style={styles.historyCard} onPress={() => onPress(item)}>
            <Text style={styles.historyQuestionText} numberOfLines={2}>{item.questionText}</Text>
            <View style={styles.statusContainer}>
                <Text style={[styles.statusText, statusStyle]}>{item.status}</Text>
                <Text style={styles.historyDateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
        </TouchableOpacity>
    );
};

export default function AskQuestionScreen() {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const navigation = useNavigation();

    const [questionText, setQuestionText] = useState('');
    const [allProviders, setAllProviders] = useState({});
    const [providerTypes, setProviderTypes] = useState([]);
    const [selectedProviderType, setSelectedProviderType] = useState(null);
    const [providersInType, setProvidersInType] = useState([]);
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [questionsRemaining, setQuestionsRemaining] = useState(0);
    const [canAskQuestion, setCanAskQuestion] = useState(true);
    const [isTypePickerVisible, setIsTypePickerVisible] = useState(false);
    const [isProviderPickerVisible, setIsProviderPickerVisible] = useState(false);
    const [isDetailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [questionHistory, setQuestionHistory] = useState([]);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        navigation.setOptions({
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: { color: colors.text },
        });
    }, [colors, navigation]);
    
    // ** THIS FIXES THE useFocusEffect ERROR **
    useFocusEffect(
      useCallback(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [providersData, historyData, qnaStatus] = await Promise.all([
                    api.getProviders(),
                    api.getMyQuestions(),
                    api.getQnaStatus()
                ]);
                
                setAllProviders(providersData);
                setProviderTypes(Object.keys(providersData));

                setQuestionHistory(historyData);
                if (qnaStatus) {
                    const remaining = qnaStatus.questions_remaining || 0;
                    setQuestionsRemaining(remaining);
                    setCanAskQuestion(remaining > 0);
                } else {
                    setCanAskQuestion(false);
                }
            } catch (error) {
                console.error("Failed to load data:", error);
                Alert.alert("Error", "Could not load required data.");
                setCanAskQuestion(false);
            } finally {
                setIsLoading(false);
            }
        };
        
        loadData();
      }, [])
    );

    useEffect(() => {
        if (selectedProviderType) {
            setProvidersInType(allProviders[selectedProviderType] || []);
            setSelectedProvider(null);
        } else {
            setProvidersInType([]);
        }
    }, [selectedProviderType, allProviders]);

    const handleSubmit = async () => {
        if (!questionText.trim() || !selectedProvider) {
            Alert.alert('Missing Information', 'Please complete all fields.');
            return;
        }
        setIsSubmitting(true);
        try {
            await api.submitQuestion({ providerId: selectedProvider.userID, questionText: questionText.trim() });
            Alert.alert('Success', 'Your question has been submitted!');
            setQuestionText('');
            setSelectedProviderType(null);
            setSelectedProvider(null);
            
            // Reload all data to get the latest history and remaining count
            const [historyData, qnaStatus] = await Promise.all([api.getMyQuestions(), api.getQnaStatus()]);
            setQuestionHistory(historyData);
            if (qnaStatus) {
                const remaining = qnaStatus.questions_remaining || 0;
                setQuestionsRemaining(remaining);
                setCanAskQuestion(remaining > 0);
            }
        } catch (error) {
            if (error.message.includes('limit')) {
                // If limit is hit, just refresh the QnA status
                const qnaStatus = await api.getQnaStatus();
                if (qnaStatus) {
                    setQuestionsRemaining(qnaStatus.questions_remaining || 0);
                    setCanAskQuestion((qnaStatus.questions_remaining || 0) > 0);
                }
            }
            Alert.alert('Submission Failed', error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteQuestion = () => {
    Alert.alert(
        "Delete Question",
        "Are you sure you want to remove this question from your history? The provider will still be able to see it.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        if (!selectedQuestion) return;
                        setIsDeleting(true);
                        try {
                            await api.deleteQuestion(selectedQuestion.questionID);
                            
                            setQuestionHistory(prevHistory => 
                                prevHistory.filter(q => q.questionID !== selectedQuestion.questionID)
                            );
                            
                            setDetailModalVisible(false);
                            Alert.alert("Success", "Your question has been deleted.");
                        } catch (error) {
                            Alert.alert("Error", error.message || "Failed to delete the question.");
                        } finally {
                            setIsDeleting(false);
                        }
                    },
                },
            ]
        );
    };

    const handleSelectType = (type) => {
        setSelectedProviderType(type);
        setIsTypePickerVisible(false);
    };

    const handleSelectProvider = (provider) => {
        setSelectedProvider(provider);
        setIsProviderPickerVisible(false);
    };

    const handleViewDetails = (question) => {
        setSelectedQuestion(question);
        setDetailModalVisible(true);
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <Text style={styles.label}>Your Question:</Text>
                    <TextInput
                        style={styles.input}
                        placeholder={canAskQuestion ? "Type your question here..." : "You have reached your weekly question limit."}
                        placeholderTextColor={colors.textSecondary}
                        value={questionText}
                        onChangeText={setQuestionText}
                        multiline
                        editable={canAskQuestion}
                    />
                    <Text style={styles.label}>Step 1: Select a Provider Type</Text>
                    <TouchableOpacity style={styles.pickerButton} onPress={() => setIsTypePickerVisible(true)} disabled={!canAskQuestion}>
                        <Text style={selectedProviderType ? styles.pickerText : styles.pickerPlaceholder}>
                            {selectedProviderType || 'Select a specialty...'}
                        </Text>
                        <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    {selectedProviderType && (
                        <>
                            <Text style={styles.label}>Step 2: Select a Provider</Text>
                            <TouchableOpacity style={styles.pickerButton} onPress={() => setIsProviderPickerVisible(true)} disabled={!canAskQuestion}>
                                <Text style={selectedProvider ? styles.pickerText : styles.pickerPlaceholder}>
                                    {selectedProvider ? selectedProvider.name : `Select a ${selectedProviderType}...`}
                                </Text>
                                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </>
                    )}

                    <TouchableOpacity
                        style={[styles.submitButton, !canAskQuestion && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={isSubmitting || !canAskQuestion}>
                        {isSubmitting ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.submitButtonText}>
                                {canAskQuestion ? `Submit Question (${questionsRemaining} left)` : 'Weekly Limit Reached'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.historySection}>
                        <Text style={styles.historyTitle}>Your Question History</Text>
                        {isLoading ? (
                            <ActivityIndicator style={{ marginTop: 20 }} color={colors.primary} />
                        ) : (
                            <FlatList
                                data={questionHistory}
                                keyExtractor={(item) => item.questionID.toString()}
                                renderItem={({ item }) => (
                                    <QuestionHistoryItem item={item} onPress={handleViewDetails} colors={colors} />
                                )}
                                ListEmptyComponent={<Text style={styles.emptyHistoryText}>You haven't asked any questions yet.</Text>}
                                scrollEnabled={false}
                            />
                        )}
                    </View>
                </ScrollView>

                <Modal visible={isTypePickerVisible} onRequestClose={() => setIsTypePickerVisible(false)} transparent={true} animationType="slide">
                    <View style={styles.modalOverlay}><View style={styles.modalContainer}><Text style={styles.modalTitle}>Select a Specialty</Text><FlatList data={providerTypes} keyExtractor={(item) => item} renderItem={({ item }) => (<TouchableOpacity style={styles.modalItem} onPress={() => handleSelectType(item)}><Text style={styles.modalItemText}>{item}</Text></TouchableOpacity>)}/><TouchableOpacity style={styles.modalCloseButton} onPress={() => setIsTypePickerVisible(false)}><Text style={styles.modalCloseButtonText}>Close</Text></TouchableOpacity></View></View>
                </Modal>
                <Modal visible={isProviderPickerVisible} onRequestClose={() => setIsProviderPickerVisible(false)} transparent={true} animationType="slide">
                     <View style={styles.modalOverlay}><View style={styles.modalContainer}><Text style={styles.modalTitle}>Select a {selectedProviderType}</Text><FlatList data={providersInType} keyExtractor={(item) => item.userID.toString()} renderItem={({ item }) => (<TouchableOpacity style={styles.modalItem} onPress={() => handleSelectProvider(item)}><Text style={styles.modalItemText}>{item.name}</Text></TouchableOpacity>)}/><TouchableOpacity style={styles.modalCloseButton} onPress={() => setIsProviderPickerVisible(false)}><Text style={styles.modalCloseButtonText}>Close</Text></TouchableOpacity></View></View>
                </Modal>
                
                {selectedQuestion && ( 
                    <Modal animationType="slide" transparent={true} visible={isDetailModalVisible} onRequestClose={() => setDetailModalVisible(false)}>
                        <View style={styles.detailModalCenteredView}>
                            <View style={styles.detailModalView}>
                                <TouchableOpacity style={styles.detailModalCloseButton} onPress={() => setDetailModalVisible(false)}>
                                    <Ionicons name="close-circle" size={32} color={colors.textSecondary} />
                                </TouchableOpacity>
                                <ScrollView>
                                    <View style={styles.detailModalCard}><Text style={styles.detailModalCardTitle}>YOUR QUESTION</Text><Text style={styles.detailModalQuestionText}>{selectedQuestion.questionText}</Text><Text style={styles.detailModalDate}>{new Date(selectedQuestion.createdAt).toLocaleString()}</Text></View>
                                    {selectedQuestion.answerText ? (
                                        <View style={[styles.detailModalCard, styles.detailModalAnswerCard]}>
                                            <Text style={styles.detailModalCardTitle}>ANSWER FROM {selectedQuestion.providerFirstName?.toUpperCase() || 'PROVIDER'}</Text>
                                            <Text style={styles.detailModalAnswerText}>{selectedQuestion.answerText}</Text>
                                            <Text style={styles.detailModalDate}>{new Date(selectedQuestion.answeredAt).toLocaleString()}</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.detailModalCard}>
                                            <Text style={styles.detailModalWaitingText}>Waiting for a response...</Text>
                                        </View>
                                    )}
                                    <TouchableOpacity 
                                        style={styles.deleteButton} 
                                        onPress={handleDeleteQuestion}
                                        disabled={isDeleting}
                                    >
                                        {isDeleting 
                                            ? <ActivityIndicator color={colors.logoutText} /> 
                                            : <Text style={styles.deleteButtonText}>Delete Question</Text>
                                        }
                                    </TouchableOpacity>
                                </ScrollView>
                            </View>
                        </View>
                    </Modal>
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { padding: 20, paddingBottom: 50 },
    label: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 12, marginTop: 24 },
    input: { backgroundColor: colors.card, color: colors.text, minHeight: 140, borderRadius: 12, padding: 16, fontSize: 16, textAlignVertical: 'top', borderWidth: 1, borderColor: colors.border },
    pickerButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.card, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
    pickerText: { fontSize: 16, color: colors.text },
    pickerPlaceholder: { fontSize: 16, color: colors.textSecondary },
    submitButton: { backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 32 },
    submitButtonDisabled: { backgroundColor: colors.border },
    submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
    historySection: { marginTop: 32, paddingTop: 32, borderTopWidth: 1, borderTopColor: colors.border },
    historyTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 16 },
    emptyHistoryText: { textAlign: 'center', color: colors.textSecondary, marginTop: 20, fontSize: 14 },
    historyCard: { backgroundColor: colors.card, borderRadius: 8, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
    historyQuestionText: { fontSize: 16, color: colors.text, marginBottom: 10 },
    statusContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusText: { fontSize: 12, fontWeight: 'bold', textTransform: 'capitalize', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, overflow: 'hidden' },
    statusPending: { backgroundColor: 'rgba(251, 191, 36, 0.2)', color: '#D97706' },
    statusAnswered: { backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#059669' },
    historyDateText: { fontSize: 12, color: colors.textSecondary },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalContainer: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%' },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: colors.text },
    modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.border },
    modalItemText: { fontSize: 18, textAlign: 'center', color: colors.text },
    modalCloseButton: { marginTop: 20, backgroundColor: colors.background, borderRadius: 10, padding: 15 },
    modalCloseButtonText: { color: colors.primary, fontWeight: 'bold', textAlign: 'center', fontSize: 16 },
    detailModalCenteredView: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.6)' },
    detailModalView: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingTop: 50, width: '100%', maxHeight: '90%' },
    detailModalCloseButton: { position: 'absolute', top: 15, right: 15, zIndex: 1 },
    detailModalCard: { width: '100%', padding: 15, borderRadius: 10, backgroundColor: colors.background, marginBottom: 15 },
    detailModalAnswerCard: { backgroundColor: 'rgba(249, 115, 22, 0.1)', borderColor: 'rgba(249, 115, 22, 0.3)' },
    detailModalCardTitle: { fontSize: 12, fontWeight: 'bold', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase' },
    detailModalQuestionText: { fontSize: 16, color: colors.text, lineHeight: 24 },
    detailModalAnswerText: { fontSize: 16, color: colors.text, lineHeight: 24 },
    detailModalDate: { fontSize: 12, color: colors.textSecondary, marginTop: 12, textAlign: 'right' },
    detailModalWaitingText: { fontSize: 16, fontStyle: 'italic', color: colors.textSecondary, textAlign: 'center', padding: 20 },
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