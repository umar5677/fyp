// components/ProviderAnserCard.js

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ProviderAnswerCard = ({ pendingCount, onNavigate }) => {
    return (
        <View style={styles.providerCard}>
            <View style={styles.providerHeader}>
                <Ionicons name="medkit-outline" size={24} color="#34C759" />
                <Text style={styles.providerTitle}>Provider Dashboard</Text>
            </View>
            <Text style={styles.providerDescription}>
                You have <Text style={{ fontWeight: 'bold' }}>{pendingCount}</Text> new questions awaiting your expertise.
            </Text>
            <TouchableOpacity style={styles.viewButton} onPress={onNavigate}>
                <Text style={styles.viewButtonText}>View Questions</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    providerCard: {
        backgroundColor: '#FFF', borderRadius: 15, padding: 20, marginVertical: 10,
        elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10,
    },
    providerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    providerTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
    providerDescription: { fontSize: 14, color: '#667', lineHeight: 20, marginBottom: 16 },
    viewButton: { backgroundColor: '#34C759', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
    viewButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});

export default ProviderAnswerCard;