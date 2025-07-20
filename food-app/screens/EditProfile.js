// screens/EditProfile.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, TextInput, Alert, StyleSheet, ActivityIndicator,
    ScrollView, TouchableOpacity, Switch, Platform, KeyboardAvoidingView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { api } from '../utils/api';

const RadioButton = ({ label, selected, onSelect }) => (
    <TouchableOpacity style={styles.radioButtonContainer} onPress={onSelect}>
        <View style={[styles.radioButton, selected && styles.radioButtonSelected]}>
            {selected && <View style={styles.radioButtonInner} />}
        </View>
        <Text style={styles.radioLabel}>{label}</Text>
    </TouchableOpacity>
);

export default function EditProfileScreen({ navigation }) {
    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
        dob: '',
        height: '',
        weight: '',
        gender: '',
        diabetes: null,
        isInsulin: false,
    });
    const [dobDate, setDobDate] = useState(null);
    const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
    const [loading, setLoading] = useState(true);

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
                    });
                })
                .catch(err => {
                    console.error(err);
                    Alert.alert('Error', 'Could not load profile');
                })
                .finally(() => setLoading(false));
        }, [])
    );

    const handleConfirmDate = (date) => {
        setDobDate(date);
        setForm(f => ({ ...f, dob: date.toISOString().split('T')[0] }));
        setDatePickerVisibility(false);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const updates = {
                first_name: form.first_name,
                last_name: form.last_name,
                email: form.email,
                dob: form.dob,
                gender: form.gender,
                height: parseFloat(form.height) || null,
                weight: parseFloat(form.weight) || null,
                diabetes: form.diabetes,
                isInsulin: form.isInsulin,
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
    
    if (loading) {
        return ( <View style={styles.center}><ActivityIndicator size="large" color="#007AFF" /></View> );
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: '#F9FAFB' }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
        >
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.section}>Personal Information</Text>
                
                <Text style={styles.label}>First Name</Text>
                <TextInput style={styles.input} value={form.first_name} onChangeText={t => setForm(f => ({ ...f, first_name: t }))} />

                <Text style={styles.label}>Last Name</Text>
                <TextInput style={styles.input} value={form.last_name} onChangeText={t => setForm(f => ({ ...f, last_name: t }))} />

                <Text style={styles.label}>Email</Text>
                <TextInput style={styles.input} value={form.email} onChangeText={t => setForm(f => ({ ...f, email: t }))} keyboardType="email-address" autoCapitalize='none' />
                
                <Text style={styles.label}>Date of Birth</Text>
                <TouchableOpacity style={styles.input} onPress={() => setDatePickerVisibility(true)}>
                    <Text style={{ color: form.dob ? '#111827' : '#9CA3AF', fontSize: 16 }}>
                        {dobDate ? dobDate.toLocaleDateString('en-GB', {day:'2-digit', month:'long', year:'numeric'}) : 'Select Date'}
                    </Text>
                </TouchableOpacity>

                <Text style={styles.label}>Gender</Text>
                <View style={styles.radioGroup}>
                    <RadioButton label="Male" selected={form.gender === 'Male'} onSelect={() => setForm(f => ({...f, gender: 'Male'}))} />
                    <RadioButton label="Female" selected={form.gender === 'Female'} onSelect={() => setForm(f => ({...f, gender: 'Female'}))} />
                    <RadioButton label="Other" selected={form.gender === 'Other'} onSelect={() => setForm(f => ({...f, gender: 'Other'}))} />
                </View>

                <Text style={styles.label}>Height (cm)</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={form.height} onChangeText={t => setForm(f => ({ ...f, height: t }))} />

                <Text style={styles.label}>Weight (kg)</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={form.weight} onChangeText={t => setForm(f => ({ ...f, weight: t }))} />
                
                <Text style={styles.section}>Health Information</Text>
                
                <Text style={styles.label}>Diabetes Type</Text>
                <View style={styles.radioGroup}>
                    <RadioButton label="Type 1" selected={form.diabetes === 1} onSelect={() => setForm(f => ({ ...f, diabetes: 1 }))} />
                    <RadioButton label="Type 2" selected={form.diabetes === 2} onSelect={() => setForm(f => ({ ...f, diabetes: 2 }))} />
                    <RadioButton label="None" selected={form.diabetes === 0} onSelect={() => setForm(f => ({ ...f, diabetes: 0 }))} />
                </View>
                
                <View style={styles.switchContainer}>
                    <Text style={styles.label}>Using Insulin?</Text>
                    <Switch
                        value={form.isInsulin}
                        onValueChange={value => setForm(f => ({ ...f, isInsulin: value }))}
                        trackColor={{ false: '#767577', true: '#81b0ff' }}
                        thumbColor={form.isInsulin ? '#007AFF' : '#f4f3f4'}
                    />
                </View>

                <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>
                
                <DateTimePickerModal
                    isVisible={isDatePickerVisible}
                    mode="date"
                    date={dobDate || new Date()}
                    onConfirm={handleConfirmDate}
                    onCancel={() => setDatePickerVisibility(false)}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    textColor="black"
                />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 20, backgroundColor: '#F9FAFB', flexGrow: 1, paddingBottom: 50 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
    section: { 
      fontSize: 20, fontWeight: 'bold', color: '#111827', 
      marginTop: 24, marginBottom: 16, borderBottomWidth: 1,
      borderBottomColor: '#E5E7EB', paddingBottom: 8,
    },
    label: {
      fontSize: 20, fontWeight: '500', color: '#374151',
      marginBottom: 8, marginLeft: 4,
    },
    input: {
      backgroundColor: '#FFFFFF', paddingHorizontal: 15,
      paddingVertical: Platform.OS === 'ios' ? 16 : 14,
      borderRadius: 12, fontSize: 16, marginBottom: 15,
      borderWidth: 1, borderColor: '#E5E7EB',
      color: '#111827', justifyContent: 'center',
    },
    saveButton: {
      marginTop: 30, backgroundColor: '#007AFF',
      paddingVertical: 16, borderRadius: 12,
      alignItems: 'center'
    },
    saveButtonText: {
      color: '#fff', fontWeight: 'bold',
      fontSize: 16, textAlign: 'center',
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
        borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' 
    },
    radioButtonSelected: { borderColor: '#007AFF' },
    radioButtonInner: { height: 10, width: 10, borderRadius: 5, backgroundColor: '#007AFF' },
    radioLabel: { marginLeft: 8, fontSize: 16, color: '#111827'},
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    }
});