// utils/api.js
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

const BASE_URL = 'http://192.168.0.120:3000/api';

async function authenticatedFetch(endpoint, options = {}) {
    let accessToken = await SecureStore.getItemAsync('accessToken');
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }
    let response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });

    if (response.status === 403) {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        if (!refreshToken) {
            Alert.alert("Session Expired", "Please log in again.");
            return response;
        }
        try {
            const refreshResponse = await fetch(`${BASE_URL}/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: refreshToken }),
            });
            if (!refreshResponse.ok) throw new Error("Refresh failed");
            const newTokens = await refreshResponse.json();
            await SecureStore.setItemAsync('accessToken', newTokens.accessToken);
            headers['Authorization'] = `Bearer ${newTokens.accessToken}`;
            response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
        } catch (e) {
            await SecureStore.deleteItemAsync('accessToken');
            await SecureStore.deleteItemAsync('refreshToken');
            Alert.alert("Session Expired", "Please log in again.");
            return response;
        }
    }
    return response;
}

// --- FINAL, COMBINED AND SIMPLIFIED API OBJECT ---
export const api = {
    getHistory: async (types) => {
        // Use URLSearchParams to correctly format the array for the query string
        const params = new URLSearchParams({ types: types.join(',') });
        const response = await authenticatedFetch(`/logs/history?${params.toString()}`);
        if (!response.ok) throw new Error(`Failed to fetch history for types: ${types}`);
        return response.json();
    },

    addLog: async (logData) => {
        const response = await authenticatedFetch('/logs', {
            method: 'POST',
            body: JSON.stringify({ ...logData, date: new Date().toISOString() }),
        });
        return response.json();
    },

    updateLog: async (logId, amount) => {
        const response = await authenticatedFetch(`/logs/${logId}`, {
            method: 'PUT',
            body: JSON.stringify({ amount }),
        });
        return response.json();
    },

    deleteLog: async (logId) => {
        const response = await authenticatedFetch(`/logs/${logId}`, {
            method: 'DELETE',
        });
        return response.json();
    },

    scanImage: async (base64) => {
        const response = await authenticatedFetch('/ocr/aws-parse-image', {
            method: 'POST',
            body: JSON.stringify({ image: base64 }),
        });
        return response.json();
    },
};