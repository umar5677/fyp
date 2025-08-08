import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import * as Haptics from 'expo-haptics';
import { api } from '../utils/api';

const PRIMARY_COLOR = '#F97316';

const RadioButton = ({ label, selected, onSelect }) => (
    <TouchableOpacity style={styles.radioButtonContainer} onPress={() => {
        onSelect();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }}>
        <Animatable.View 
            transition={["backgroundColor", "borderColor"]}
            style={[styles.radioButton, selected && styles.radioButtonSelected]}
        >
            {selected && <Animatable.View animation="bounceIn" duration={500} style={styles.radioButtonInner} />}
        </Animatable.View>
        <Text style={styles.radioLabel}>{label}</Text>
    </TouchableOpacity>
);

export default function ProfileSetupScreen({ navigation }) {
    const [userName, setUserName] = useState('');
    const [dob, setDob] = useState(null);
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [gender, setGender] = useState(null);
    const [diabetesType, setDiabetesType] = useState(null);
    const [isInsulin, setIsInsulin] = useState(false);
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingName, setIsFetchingName] = useState(true);
    const [hasConsented, setHasConsented] = useState(false); // State for the consent checkbox

    useFocusEffect(
        useCallback(() => {
            const fetchUserName = async () => {
                setIsFetchingName(true);
                try {
                    const profileRes = await api.getProfile();
                    if (profileRes.user?.first_name) {
                        setUserName(profileRes.user.first_name);
                    }
                } catch (error) {
                    console.error("Failed to fetch user's name:", error);
                } finally {
                    setIsFetchingName(false);
                }
            };
            fetchUserName();
        }, [])
    );

    const handleConfirmDate = (date) => {
        setDob(date);
        setDatePickerVisibility(false);
    };

    const handleSaveProfile = async () => {
        if (!dob || !weight || !height || gender === null || diabetesType === null) {
            Alert.alert('Incomplete Form', 'Please fill out all the fields.');
            return;
        }

        if (!hasConsented) {
            Alert.alert('Consent Required', 'You must consent to data usage to continue.');
            return;
        }

        setIsLoading(true);
        try {
            const formattedDob = dob.toISOString().split('T')[0];
            await api.updateProfileSetup({ 
                dob: formattedDob, 
                weight, 
                height, 
                diabetesType, 
                gender,
                isInsulin
            });
            navigation.replace('MainApp');
        } catch (error) {
            Alert.alert('Error', error.message || 'Could not save profile.');
        } finally {
            setIsLoading(false);
        }
    };

    const defaultPickerDate = new Date();
    defaultPickerDate.setFullYear(new Date().getFullYear() - 20);

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                {isFetchingName ? (
                     <ActivityIndicator style={{ height: 40 }} color={PRIMARY_COLOR} />
                ) : (
                    <Animatable.Text animation="fadeInDown" style={styles.title}>Welcome, {userName || 'User'}!</Animatable.Text>
                )}
                <Animatable.Text animation="fadeInDown" delay={200} style={styles.subtitle}>Let's complete your profile to personalize your journey.</Animatable.Text>

                <Animatable.View animation="fadeInUp" delay={400} style={styles.card}>
                    <Text style={styles.fieldHeader}>Personal Details</Text>
                    {/* Date of Birth, Weight, Height inputs are unchanged */}
                    <TouchableOpacity style={styles.inputContainer} onPress={() => setDatePickerVisibility(true)}>
                        <Ionicons name="calendar-outline" size={20} color="#6B7280" style={styles.icon}/>
                        <Text style={[styles.inputText, { color: dob ? '#111827' : '#9CA3AF'}]}>
                            {dob ? dob.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Date of Birth'}
                        </Text>
                    </TouchableOpacity>
                    <View style={styles.inputRow}>
                        <View style={styles.inputContainer}>
                            <Ionicons name="barbell-outline" size={20} color="#6B7280" style={styles.icon}/>
                            <TextInput placeholder="Weight (kg)" value={weight} onChangeText={setWeight} style={styles.inputText} keyboardType="numeric" placeholderTextColor="#9CA3AF"/>
                        </View>
                        <View style={{width: 15}}/>
                        <View style={styles.inputContainer}>
                            <Ionicons name="body-outline" size={20} color="#6B7280" style={styles.icon}/>
                            <TextInput placeholder="Height (cm)" value={height} onChangeText={setHeight} style={styles.inputText} keyboardType="numeric" placeholderTextColor="#9CA3AF"/>
                        </View>
                    </View>
                </Animatable.View>

                <Animatable.View animation="fadeInUp" delay={500} style={styles.card}>
                    <Text style={styles.fieldHeader}>Health Information</Text>
                    {/* Gender, Diabetes Type, Insulin Switch are unchanged */}
                    <Text style={styles.label}>Gender</Text>
                    <View style={styles.radioGroup}>
                        <RadioButton label="Male" selected={gender === 'Male'} onSelect={() => setGender('Male')} />
                        <RadioButton label="Female" selected={gender === 'Female'} onSelect={() => setGender('Female')} />
                    </View>
                    <Text style={styles.label}>Diabetes Type</Text>
                    <View style={styles.radioGroup}>
                        <RadioButton label="Type 1" selected={diabetesType === 1} onSelect={() => setDiabetesType(1)} />
                        <RadioButton label="Type 2" selected={diabetesType === 2} onSelect={() => setDiabetesType(2)} />
                        <RadioButton label="None" selected={diabetesType === 0} onSelect={() => setDiabetesType(0)} />
                    </View>
                    <View style={styles.switchContainer}>
                        <Text style={styles.label}>Are you using insulin?</Text>
                        <Switch
                            value={isInsulin}
                            onValueChange={setIsInsulin}
                            trackColor={{ false: '#D1D5DB', true: '#81b0ff' }}
                            thumbColor={isInsulin ? PRIMARY_COLOR : '#f4f3f4'}
                        />
                    </View>
                </Animatable.View>

                <Animatable.View animation="fadeInUp" delay={550} style={styles.consentContainer}>
                    <TouchableOpacity onPress={() => setHasConsented(!hasConsented)} style={styles.checkbox}>
                        <Ionicons 
                            name={hasConsented ? "checkbox" : "square-outline"} 
                            size={24} 
                            color={hasConsented ? PRIMARY_COLOR : "#6B7280"}
                        />
                    </TouchableOpacity>
                    <Text style={styles.consentText}>I consent to GlucoBites using my data to provide personalized insights and features.</Text>
                </Animatable.View>

                {isLoading ? (
                    <ActivityIndicator size="large" color={PRIMARY_COLOR} style={{marginTop: 30}}/>
                ) : (
                     <Animatable.View animation="fadeInUp" delay={600}>
                        <TouchableOpacity style={styles.button} onPress={handleSaveProfile}>
                            <Text style={styles.buttonText}>Save & Continue</Text>
                        </TouchableOpacity>
                    </Animatable.View>
                )}
            </ScrollView>
            <DateTimePickerModal
                isVisible={isDatePickerVisible}
                mode="date"
                date={dob || defaultPickerDate}
                onConfirm={handleConfirmDate}
                onCancel={() => setDatePickerVisibility(false)}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                minimumDate={new Date(new Date().setFullYear(new Date().getFullYear() - 100))}
                textColor="black"
                pickerContainerStyleIOS={{ justifyContent: 'center' }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F0F4F8' },
    container: { flexGrow: 1, padding: 20, paddingTop: 30 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#1E1E2D', textAlign: 'center' },
    subtitle: { fontSize: 16, color: '#6C757D', textAlign: 'center', marginBottom: 30, marginTop: 8 },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 4,
    },
    fieldHeader: { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 20 },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        paddingHorizontal: 15,
        marginBottom: 15,
        flex: 1
    },
    icon: { marginRight: 10 },
    inputText: {
        flex: 1,
        paddingVertical: Platform.OS === 'ios' ? 16 : 12,
        fontSize: 16,
        color: '#111827',
    },
    inputRow: { flexDirection: 'row', justifyContent: 'space-between' },
    label: { fontSize: 14, color: '#6B7280', marginBottom: 10, fontWeight: '500' },
    radioGroup: { flexDirection: 'row', marginBottom: 15, alignItems: 'center' },
    radioButtonContainer: { flexDirection: 'row', alignItems: 'center', marginRight: 40 },
    radioButton: { height: 22, width: 22, borderRadius: 11, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
    radioButtonSelected: { borderColor: PRIMARY_COLOR },
    radioButtonInner: { height: 12, width: 12, borderRadius: 6, backgroundColor: PRIMARY_COLOR },
    radioLabel: { marginLeft: 10, fontSize: 16, color: '#374151' },
    button: { backgroundColor: PRIMARY_COLOR, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 10,
    },
    consentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 10,
        paddingHorizontal: 10,
    },
    checkbox: {
        marginRight: 12,
    },
    consentText: {
        flex: 1,
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 20,
    }
});