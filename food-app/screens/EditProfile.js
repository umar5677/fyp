import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TextInput, Alert, StyleSheet, ActivityIndicator,
    ScrollView, TouchableOpacity, Switch, Platform, KeyboardAvoidingView
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import * as SecureStore from 'expo-secure-store';
import { api } from '../utils/api';
import { useTheme } from '../context/ThemeContext';

const getStyles = (colors) => StyleSheet.create({
    container: { padding: 20, flexGrow: 1, paddingBottom: 50 },
    keyboardAvoidingContainer: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    section: { 
      fontSize: 20, fontWeight: 'bold', color: colors.text, 
      marginTop: 24, marginBottom: 16, borderBottomWidth: 1,
      borderBottomColor: colors.border, paddingBottom: 8,
    },
    label: {
      fontSize: 16, fontWeight: '500', color: colors.text,
      marginBottom: 8, marginLeft: 4,
    },
    input: {
      backgroundColor: colors.card, paddingHorizontal: 15,
      paddingVertical: Platform.OS === 'ios' ? 16 : 14,
      borderRadius: 12, fontSize: 16, marginBottom: 15,
      borderWidth: 1, borderColor: colors.border,
      color: colors.text, justifyContent: 'center',
    },
    saveButton: {
      marginTop: 30, backgroundColor: colors.primary,
      paddingVertical: 16, borderRadius: 12,
      alignItems: 'center'
    },
    saveButtonText: {
      color: '#fff', fontWeight: 'bold',
      fontSize: 16, textAlign: 'center',
    },
    deleteButton: {
      marginTop: 20,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    deleteButtonText: {
      color: colors.logoutText,
      fontWeight: '600',
      fontSize: 16,
    },
    radioGroup: { 
        flexDirection: 'row', alignItems: 'center',
        marginBottom: 15,
    },
    radioButtonContainer: { 
        flexDirection: 'row', alignItems: 'center', 
        marginRight: 25,
    },
    radioButton: { 
        height: 20, width: 20, borderRadius: 10, borderWidth: 2, 
        borderColor: colors.textSecondary, alignItems: 'center', justifyContent: 'center' 
    },
    radioButtonSelected: { borderColor: colors.primary },
    radioButtonInner: { height: 10, width: 10, borderRadius: 5, backgroundColor: colors.primary },
    radioLabel: { marginLeft: 8, fontSize: 16, color: colors.text},
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    required: {
        color: colors.logoutText,
        fontSize: 16,
    }
});

const RadioButton = ({ label, selected, onSelect, colors }) => {
    const styles = getStyles(colors);
    return (
        <TouchableOpacity style={styles.radioButtonContainer} onPress={onSelect}>
            <View style={[styles.radioButton, selected && styles.radioButtonSelected]}>
                {selected && <View style={styles.radioButtonInner} />}
            </View>
            <Text style={styles.radioLabel}>{label}</Text>
        </TouchableOpacity>
    );
};

export default function EditProfileScreen({ navigation }) {
    const { theme, colors } = useTheme();
    const styles = getStyles(colors);

    const [form, setForm] = useState({
        first_name: '', last_name: '', email: '', dob: '',
        height: '', weight: '', gender: '',
        diabetes: null, isInsulin: false,
        calorieGoal: '',
    });
    const [dobDate, setDobDate] = useState(null);
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);

    useFocusEffect(
        useCallback(() => {
            setLoading(true);
            api.getProfile()
                .then(({ user }) => {
                    const dobValue = user.dob ? new Date(user.dob) : null;
                    setDobDate(dobValue);
                    setForm({
                        first_name: user.first_name || '',
                        last_name: user.last_name || '',
                        email: user.email || '',
                        dob: dobValue ? dobValue.toISOString().split('T')[0] : '',
                        gender: user.gender || null,
                        height: user.height?.toString() || '',
                        weight: user.weight?.toString() || '',
                        diabetes: user.diabetes,
                        isInsulin: !!user.isInsulin,
                        calorieGoal: user.calorieGoal?.toString() || '',
                    });
                })
                .catch(err => {
                    console.error(err);
                    Alert.alert('Error', 'Could not load profile');
                })
                .finally(() => setLoading(false));
        }, [])
    );

    useEffect(() => {
      navigation.setOptions({
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text },
      });
    }, [colors, navigation]);

    const handleConfirmDate = (date) => {
        setDobDate(date);
        setForm(f => ({ ...f, dob: date.toISOString().split('T')[0] }));
        setDatePickerVisibility(false);
    };

    const handleSave = async () => {
        if (!form.first_name?.trim() || !form.last_name?.trim() || !form.email?.trim() || 
            !form.dob || !form.height?.trim() || !form.weight?.trim() || !form.calorieGoal?.trim()) {
            Alert.alert('Incomplete Profile', 'Please fill out all required fields marked with (*).');
            return;
        }
        if (isNaN(parseInt(form.calorieGoal)) || parseInt(form.calorieGoal) <= 0) {
            Alert.alert('Invalid Goal', 'Please enter a valid number for your calorie goal.');
            return;
        }
        setLoading(true);
        try {
            const updates = {
                ...form,
                height: parseFloat(form.height) || null,
                weight: parseFloat(form.weight) || null,
                calorieGoal: parseInt(form.calorieGoal),
            };
            await api.updateProfile(updates);
            Alert.alert('Success', 'Your profile has been updated.');
            navigation.goBack();
        } catch (err) {
            console.error(err);
            Alert.alert('Error', err.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };
    
    const handleDeleteAccount = async () => {
        Alert.alert(
            "Delete Account", "This action is irreversible. Are you sure?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete", style: "destructive",
                    onPress: async () => {
                        setIsDeleting(true);
                        try {
                            await api.deleteProfile();
                            await SecureStore.deleteItemAsync('accessToken');
                            await SecureStore.deleteItemAsync('refreshToken');
                            navigation.getParent('RootStack').replace('Login');
                        } catch (err) {
                            setIsDeleting(false);
                            Alert.alert("Error", "Could not delete your account.");
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return ( <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> );
    }

    return (
        <KeyboardAvoidingView
            style={styles.keyboardAvoidingContainer}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
        >
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.section}>Personal Information</Text>
                
                <Text style={styles.label}>First Name <Text style={styles.required}>*</Text></Text>
                <TextInput style={styles.input} placeholderTextColor={colors.textSecondary} value={form.first_name} onChangeText={t => setForm(f => ({ ...f, first_name: t }))} />

                <Text style={styles.label}>Last Name <Text style={styles.required}>*</Text></Text>
                <TextInput style={styles.input} placeholderTextColor={colors.textSecondary} value={form.last_name} onChangeText={t => setForm(f => ({ ...f, last_name: t }))} />

                <Text style={styles.label}>Email <Text style={styles.required}>*</Text></Text>
                <TextInput style={styles.input} placeholderTextColor={colors.textSecondary} value={form.email} onChangeText={t => setForm(f => ({ ...f, email: t }))} keyboardType="email-address" autoCapitalize='none' />
                
                <Text style={styles.label}>Date of Birth <Text style={styles.required}>*</Text></Text>
                <TouchableOpacity style={styles.input} onPress={() => setDatePickerVisibility(true)}>
                    <Text style={{ color: form.dob ? colors.text : colors.textSecondary, fontSize: 16 }}>
                        {dobDate ? dobDate.toLocaleDateString('en-GB', {day:'2-digit', month:'long', year:'numeric'}) : 'Select Date'}
                    </Text>
                </TouchableOpacity>

                <Text style={styles.label}>Gender</Text>
                <View style={styles.radioGroup}>
                    <RadioButton label="Male" selected={form.gender === 'Male'} onSelect={() => setForm(f => ({...f, gender: 'Male'}))} colors={colors}/>
                    <RadioButton label="Female" selected={form.gender === 'Female'} onSelect={() => setForm(f => ({...f, gender: 'Female'}))} colors={colors}/>
                    <RadioButton label="Other" selected={form.gender === 'Other'} onSelect={() => setForm(f => ({...f, gender: 'Other'}))} colors={colors}/>
                </View>

                <Text style={styles.label}>Height (cm) <Text style={styles.required}>*</Text></Text>
                <TextInput style={styles.input} placeholderTextColor={colors.textSecondary} keyboardType="numeric" value={form.height} onChangeText={t => setForm(f => ({ ...f, height: t }))} />

                <Text style={styles.label}>Weight (kg) <Text style={styles.required}>*</Text></Text>
                <TextInput style={styles.input} placeholderTextColor={colors.textSecondary} keyboardType="numeric" value={form.weight} onChangeText={t => setForm(f => ({ ...f, weight: t }))} />
                
                <Text style={styles.section}>Health & Goals</Text>

                <Text style={styles.label}>Daily Calorie Goal <Text style={styles.required}>*</Text></Text>
                <TextInput style={styles.input} placeholderTextColor={colors.textSecondary} keyboardType="number-pad" value={form.calorieGoal} onChangeText={t => setForm(f => ({ ...f, calorieGoal: t }))} placeholder="e.g., 2000" />
                
                <Text style={styles.label}>Diabetes Type</Text>
                <View style={styles.radioGroup}>
                    <RadioButton label="Type 1" selected={form.diabetes === 1} onSelect={() => setForm(f => ({ ...f, diabetes: 1 }))} colors={colors}/>
                    <RadioButton label="Type 2" selected={form.diabetes === 2} onSelect={() => setForm(f => ({ ...f, diabetes: 2 }))} colors={colors}/>
                    <RadioButton label="None" selected={form.diabetes === 0} onSelect={() => setForm(f => ({ ...f, diabetes: 0 }))} colors={colors}/>
                </View>
                
                <View style={styles.switchContainer}>
                    <Text style={styles.label}>Using Insulin?</Text>
                    <Switch
                        value={form.isInsulin}
                        onValueChange={value => setForm(f => ({ ...f, isInsulin: value }))}
                        trackColor={{ false: '#767577', true: colors.primary }}
                        thumbColor={form.isInsulin ? colors.primary : '#f4f3f4'}
                    />
                </View>

                <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>

                {isDeleting ? (
                    <ActivityIndicator size="large" color={colors.logoutText} style={{ marginTop: 20 }} />
                ) : (
                    <TouchableOpacity onPress={handleDeleteAccount} style={styles.deleteButton}>
                        <Text style={styles.deleteButtonText}>Delete Account</Text>
                    </TouchableOpacity>
                )}
                
                <DateTimePickerModal
                    isVisible={isDatePickerVisible}
                    mode="date"
                    date={dobDate || new Date()}
                    onConfirm={handleConfirmDate}
                    onCancel={() => setDatePickerVisibility(false)}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    isDarkModeEnabled={theme === 'dark'}
                />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}