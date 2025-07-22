import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, SafeAreaView, Platform, ActivityIndicator, Modal,
  StatusBar 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Calendar } from 'react-native-calendars';
import moment from 'moment';
import { useTheme } from '../context/ThemeContext';
import { api } from '../utils/api';

const getStyles = (colors) => StyleSheet.create({
    safeArea: { 
        flex: 1, 
        backgroundColor: colors.background,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0, 
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card },
    title: { color: colors.text, fontSize: 20, fontWeight: 'bold' },
    container: { padding: 16, paddingBottom: 50 },
    card: { backgroundColor: colors.card, borderRadius: 12, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 25 : 0 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 15 },
    subSectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 15, marginBottom: 10 },
    descriptionText: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 15, textAlign: 'left' },
    thresholdItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
    triggerText: { fontSize: 16, color: colors.textSecondary },
    thresholdInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, width: 80, textAlign: 'center', fontSize: 16, backgroundColor: colors.background, color: colors.text },
    actionButton: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 10, marginTop: 10, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
    actionButtonText: { color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: 16 },
    checkbox: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    checkboxLabel: { marginLeft: 10, fontSize: 16, color: colors.text },
    dateRangeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10 },
    dateInput: { padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: colors.background, width: '48%', alignItems: 'center' },
    dateInputText: { color: colors.text },
    providerSection: { marginTop: 20, padding: 15, backgroundColor: colors.background, borderRadius: 8, marginBottom: 10 },
    providerLabel: { fontSize: 14, color: colors.textSecondary },
    providerInfo: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginVertical: 5 },
    changeButton: { backgroundColor: colors.border, paddingVertical: 10, borderRadius: 8, marginTop: 10, alignItems: 'center' },
    changeButtonText: { color: colors.text, fontWeight: '600' },
    backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, alignSelf: 'flex-start' },
    backButtonText: { marginLeft: 8, fontSize: 16, color: colors.text, fontWeight: '600' },
    selectionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    selectionItemText: { fontSize: 16, color: colors.text },
    providerCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderWidth: 1, borderColor: colors.border, borderRadius: 10, marginBottom: 10 },
    providerName: { fontSize: 16, fontWeight: 'bold', color: colors.text },
    providerEmail: { fontSize: 14, color: colors.textSecondary },
    manualInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 15, width: '100%', color: colors.text, backgroundColor: colors.background },
    calendarBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    calendarModalContainer: { width: 350, borderRadius: 10, paddingVertical: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, },
    frequencyContainer: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.background, borderRadius: 10, padding: 4, },
    frequencyButton: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
    frequencyButtonActive: { backgroundColor: colors.primary, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 3 },
    frequencyButtonText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
    frequencyButtonTextActive: { color: '#FFFFFF' },
});

const displayCategories = ['Doctor', 'Nutritionist/Dietitian', 'Exercise Physiologist'];
const CalendarModal = ({ isVisible, onClose, onDayPress, initialDate, colors }) => {
    const styles = getStyles(colors);
    const today = new Date().toISOString().split('T')[0];
    const calendarTheme = {
        calendarBackground: colors.card,
        textSectionTitleColor: colors.textSecondary,
        dayTextColor: colors.text,
        todayTextColor: colors.primary,
        selectedDayBackgroundColor: colors.primary,
        selectedDayTextColor: '#FFFFFF',
        monthTextColor: colors.text,
        indicatorColor: colors.primary,
        arrowColor: colors.primary,
        'stylesheet.calendar.header': { week: { marginTop: 5, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border } }
    };
    return (
        <Modal visible={isVisible} transparent={true} animationType="fade">
            <TouchableOpacity style={styles.calendarBackdrop} onPress={onClose} activeOpacity={1}>
                <View style={[styles.calendarModalContainer, { backgroundColor: colors.card }]}>
                    <Calendar
                        current={moment(initialDate).format('YYYY-MM-DD')}
                        maxDate={today}
                        onDayPress={(day) => {
                            const newDate = new Date(day.timestamp);
                            newDate.setMinutes(newDate.getMinutes() + newDate.getTimezoneOffset());
                            onDayPress(newDate);
                        }}
                        theme={calendarTheme}
                    />
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

export default function AlertsScreen({ navigation }) {
    const { colors } = useTheme();
    const styles = getStyles(colors);

    const [thresholds, setThresholds] = useState({ lowThreshold: '70', highFastingThreshold: '100', highPostMealThreshold: '140', veryHighThreshold: '180' });
    const [currentStep, setCurrentStep] = useState('main');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [customProvider, setCustomProvider] = useState({ name: '', email: '' });
    const [shareGlucose, setShareGlucose] = useState(true);
    const [shareCalories, setShareCalories] = useState(true);
    const [startDate, setStartDate] = useState(moment().subtract(1, 'month').toDate());
    const [endDate, setEndDate] = useState(new Date());
    const [isProcessing, setIsProcessing] = useState(false);
    const [showCalendarFor, setShowCalendarFor] = useState(null);
    const [automatedReportFrequency, setAutomatedReportFrequency] = useState('Disabled');
    const [isLoadingSettings, setIsLoadingSettings] = useState(true);
    const [providersByCat, setProvidersByCat] = useState({});

    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoadingSettings(true);
            try {
                const [thresholdData, providerData, prefData, allProviders] = await Promise.all([
                    api.getUserThresholds(), api.getPreferredProvider(), api.getReportPreference(), api.getProviders()
                ]);
                const stringData = Object.keys(thresholdData).reduce((acc, key) => { acc[key] = String(thresholdData[key]); return acc; }, {});
                setThresholds(stringData);
                if (providerData.name) { setSelectedProvider(providerData); }
                if (prefData.frequency) { setAutomatedReportFrequency(prefData.frequency); }
                setProvidersByCat(allProviders);
            } catch (error) {
                Alert.alert("Error", "Could not load your saved settings.");
            } finally {
                setIsLoadingSettings(false);
            }
        };
        loadInitialData();
    }, []);

    const handleDaySelect = (selectedDate) => {
        if (showCalendarFor === 'start') {
            setStartDate(selectedDate);
            if (moment(selectedDate).isAfter(moment(endDate))) setEndDate(selectedDate);
        } else if (showCalendarFor === 'end') {
            if (moment(selectedDate).isBefore(moment(startDate), 'day')) Alert.alert("Invalid Date", "The 'To' date cannot be earlier than the 'From' date.");
            else setEndDate(selectedDate);
        }
        setShowCalendarFor(null);
    };
    
    const handleSaveThresholds = async () => {
        const values = Object.values(thresholds).map(parseFloat);
        if (values.some(isNaN)) return Alert.alert('Invalid Input', 'All fields must be valid numbers.');
        const [low, highFasting, highPostMeal, veryHigh] = values;
        if (!(low < highFasting && highFasting < veryHigh && highPostMeal < veryHigh)) return Alert.alert('Logical Error', 'Please ensure thresholds are in a logical order.');
        try {
            const result = await api.saveUserThresholds(thresholds);
            Alert.alert('Success', result.message);
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };
    
    const handleReportAction = async (actionType) => {
        if (moment(endDate).isBefore(moment(startDate), 'day')) return Alert.alert('Invalid Date Range', 'The "To" date cannot be earlier than the "From" date.');
        if (!selectedProvider || !selectedProvider.email) return Alert.alert('No Provider Selected', 'Please select a provider before generating a report.');
        const sections = [];
        if (shareGlucose) sections.push('Blood Glucose');
        if (shareCalories) sections.push('Calories & Sugar');
        if (sections.length === 0) return Alert.alert('No Data Selected', 'Please select at least one data type to include.');
        setIsProcessing(true);
        try {
            if (selectedProvider.userID) {
                await api.savePreferredProvider(selectedProvider);
            }
            const reportPayload = {
                action: actionType, sections,
                startDate: moment(startDate).format('YYYY-MM-DD'), endDate: moment(endDate).format('YYYY-MM-DD'),
                providerEmail: selectedProvider.email, providerName: selectedProvider.name,
            };
            const reportRes = await api.generateReport(reportPayload);
            if (actionType === 'email') {
                Alert.alert('Success', reportRes.message);
            } else if (actionType === 'export') {
                const filename = reportRes.headers.get('content-disposition')?.split('filename=')[1].replace(/"/g, '') || 'report.pdf';
                const blob = await reportRes.blob();
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = async () => {
                    const base64data = reader.result.split(',')[1];
                    const uri = FileSystem.cacheDirectory + filename;
                    await FileSystem.writeAsStringAsync(uri, base64data, { encoding: FileSystem.EncodingType.Base64 });
                    await Sharing.shareAsync(uri, { dialogTitle: filename, mimeType: 'application/pdf' });
                };
            }
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSaveReportPreference = async (frequency) => {
        setAutomatedReportFrequency(frequency);
        try {
            const result = await api.saveReportPreference(frequency);
            Alert.alert('Success', result.message);
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    const renderMainStep = () => (
        <Animatable.View animation="fadeInUp" duration={500}>
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>🔔 Alert Triggers</Text>
                <Text style={styles.descriptionText}>Receive a notification when your readings go outside these limits.</Text>
                {Object.entries({ 'Low Glucose': 'lowThreshold', 'High (Fasting)': 'highFastingThreshold', 'High (Post-Meal)': 'highPostMealThreshold', 'Very High Glucose': 'veryHighThreshold' }).map(([label, key], index) => (
                    <View style={[styles.thresholdItem, index === 0 && {borderTopWidth: 0}]} key={key}>
                        <Text style={styles.triggerText}>{label}</Text>
                        <TextInput style={styles.thresholdInput} keyboardType="numeric" value={thresholds[key]} onChangeText={v => setThresholds(p => ({ ...p, [key]: v }))} placeholderTextColor={colors.textSecondary}/>
                    </View>
                ))}
                <TouchableOpacity onPress={handleSaveThresholds} style={styles.actionButton}>
                    <Text style={styles.actionButtonText}>Save Thresholds</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>🗓️ Automated Email Reports</Text>
                <Text style={styles.descriptionText}>Automatically send a report to your preferred provider.</Text>
                <View style={styles.frequencyContainer}>
                    <TouchableOpacity style={[styles.frequencyButton, automatedReportFrequency === 'Disabled' && styles.frequencyButtonActive]} onPress={() => handleSaveReportPreference('Disabled')}><Text style={[styles.frequencyButtonText, automatedReportFrequency === 'Disabled' && styles.frequencyButtonTextActive]}>Disabled</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.frequencyButton, automatedReportFrequency === 'Weekly' && styles.frequencyButtonActive]} onPress={() => handleSaveReportPreference('Weekly')}><Text style={[styles.frequencyButtonText, automatedReportFrequency === 'Weekly' && styles.frequencyButtonTextActive]}>Weekly</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.frequencyButton, automatedReportFrequency === 'Monthly' && styles.frequencyButtonActive]} onPress={() => handleSaveReportPreference('Monthly')}><Text style={[styles.frequencyButtonText, automatedReportFrequency === 'Monthly' && styles.frequencyButtonTextActive]}>Monthly</Text></TouchableOpacity>
                </View>
            </View>
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>🧾 Manual Report Sharing</Text>
                <Text style={styles.subSectionTitle}>1. Select Data to Include</Text>
                <TouchableOpacity style={styles.checkbox} onPress={() => setShareGlucose(!shareGlucose)}><Ionicons name={shareGlucose ? "checkbox" : "square-outline"} size={24} color={colors.primary} /><Text style={styles.checkboxLabel}>Blood Glucose Data</Text></TouchableOpacity>
                <TouchableOpacity style={styles.checkbox} onPress={() => setShareCalories(!shareCalories)}><Ionicons name={shareCalories ? "checkbox" : "square-outline"} size={24} color={colors.primary} /><Text style={styles.checkboxLabel}>Calories & Sugar Data</Text></TouchableOpacity>
                <Text style={styles.subSectionTitle}>2. Choose Date Range</Text>
                <View style={styles.dateRangeContainer}>
                    <TouchableOpacity onPress={() => setShowCalendarFor('start')} style={styles.dateInput}><Text style={styles.dateInputText}>From: {moment(startDate).format('DD MMM YYYY')}</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowCalendarFor('end')} style={styles.dateInput}><Text style={styles.dateInputText}>To: {moment(endDate).format('DD MMM YYYY')}</Text></TouchableOpacity>
                </View>
                <Text style={styles.subSectionTitle}>3. Select Healthcare Provider</Text>
                <View style={styles.providerSection}>
                    <Text style={styles.providerLabel}>Selected Provider:</Text>
                    <Text style={styles.providerInfo} numberOfLines={2}>{selectedProvider ? `${selectedProvider.name} (${selectedProvider.email})` : 'None selected'}</Text>
                    <TouchableOpacity style={styles.changeButton} onPress={() => setCurrentStep('categories')}><Text style={styles.changeButtonText}>Change Provider</Text></TouchableOpacity>
                </View>
                <Text style={styles.subSectionTitle}>4. Generate Report</Text>
                <TouchableOpacity onPress={() => handleReportAction('email')} style={[styles.actionButton, { backgroundColor: '#F97316', marginTop: 15 }]} disabled={isProcessing}>
                    {isProcessing ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>📧 Share via Email</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleReportAction('export')} style={[styles.actionButton, { backgroundColor: '#6366F1' }]} disabled={isProcessing}>
                    {isProcessing ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>🧾 Export as PDF</Text>}
                </TouchableOpacity>
            </View>
        </Animatable.View>
    );

    const renderCategoriesStep = () => (
        <Animatable.View animation="fadeIn" style={styles.card}>
            <TouchableOpacity style={styles.backButton} onPress={() => setCurrentStep('main')}><Ionicons name="arrow-back" size={24} color={colors.text} /><Text style={styles.backButtonText}>Back to Report Options</Text></TouchableOpacity>
            <Text style={styles.sectionTitle}>Select a Category</Text>
            {displayCategories.map(cat => (
                <TouchableOpacity key={cat} style={styles.selectionItem} onPress={() => { setSelectedCategory(cat); setCurrentStep('providers'); }}>
                    <Text style={styles.selectionItemText}>{cat}</Text>
                    <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.selectionItem, { marginTop: 10, borderBottomWidth: 0 }]} onPress={() => setCurrentStep('manual')}>
                <Text style={styles.selectionItemText}>Enter Provider Manually</Text>
                <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
        </Animatable.View>
    );

    const renderProvidersStep = () => (
        <Animatable.View animation="fadeIn" style={styles.card}>
            <TouchableOpacity style={styles.backButton} onPress={() => setCurrentStep('categories')}><Ionicons name="arrow-back" size={24} color={colors.text}/><Text style={styles.backButtonText}>Back to Categories</Text></TouchableOpacity>
            <Text style={styles.sectionTitle}>Select a Provider</Text>
            {(providersByCat[selectedCategory] || []).length > 0 ? (
                (providersByCat[selectedCategory] || []).map(p => (
                    <TouchableOpacity key={p.email} style={styles.providerCard} 
                        onPress={async () => {
                            try {
                                await api.savePreferredProvider(p);
                                setSelectedProvider(p);
                                setCurrentStep('main');
                            } catch (error) {
                                Alert.alert("Save Error", "Could not save provider. Please try again.");
                            }
                        }}>
                        <View><Text style={styles.providerName}>{p.name}</Text><Text style={styles.providerEmail}>{p.email}</Text></View>
                    </TouchableOpacity>
                ))
            ) : ( <Text style={styles.providerInfo}>No providers found in this category.</Text> )}
        </Animatable.View>
    );
    const renderManualProviderStep = () => (
        <Animatable.View animation="fadeIn" style={styles.card}>
            <TouchableOpacity style={styles.backButton} onPress={() => setCurrentStep('categories')}><Ionicons name="arrow-back" size={24} color={colors.text}/><Text style={styles.backButtonText}>Back</Text></TouchableOpacity>
            <Text style={styles.sectionTitle}>Enter Provider Manually</Text>
            <TextInput placeholder="Provider's Name" style={styles.manualInput} value={customProvider.name} onChangeText={v => setCustomProvider(p => ({ ...p, name: v }))} placeholderTextColor={colors.textSecondary} />
            <TextInput placeholder="Provider's Email" keyboardType="email-address" autoCapitalize="none" style={styles.manualInput} value={customProvider.email} onChangeText={v => setCustomProvider(p => ({ ...p, email: v }))} placeholderTextColor={colors.textSecondary} />
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#10B981' }]} onPress={() => {
                if (!customProvider.name || !customProvider.email) return Alert.alert('Missing Info', 'Please provide both a name and an email.');
                setSelectedProvider({ name: customProvider.name, email: customProvider.email });
                setCurrentStep('main');
            }}>
                <Text style={styles.actionButtonText}>Save Provider</Text>
            </TouchableOpacity>
        </Animatable.View>
    );

    const renderContent = () => {
        if (isLoadingSettings) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /></View>;
        switch (currentStep) {
            case 'categories': return renderCategoriesStep();
            case 'providers': return renderProvidersStep();
            case 'manual': return renderManualProviderStep();
            default: return renderMainStep();
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={28} color={colors.text} /></TouchableOpacity>
                <Text style={styles.title}>Alerts & Reports</Text>
                <View style={{ width: 28 }} />
            </View>
            <ScrollView contentContainerStyle={styles.container}>
                {renderContent()}
            </ScrollView>
            <CalendarModal isVisible={!!showCalendarFor} onClose={() => setShowCalendarFor(null)} onDayPress={handleDaySelect} initialDate={showCalendarFor === 'start' ? startDate : endDate} colors={colors}/>
        </SafeAreaView>
    );
}