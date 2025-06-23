// utils/api.js
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

// Ensure the IP address is correct for your local network or use your public deployment URL.
const BASE_URL = 'http://172.20.10.2:3000/api';

async function authenticatedFetch(endpoint, options = {}) {
    let accessToken = await SecureStore.getItemAsync('accessToken');
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    let response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });

    // If the access token expired (403 Forbidden), try to refresh it.
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
            
            // Retry the original request with the new token
            response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
        } catch (e) {
            // If refresh fails, the session is truly over. Clear tokens and alert user.
            await SecureStore.deleteItemAsync('accessToken');
            await SecureStore.deleteItemAsync('refreshToken');
            Alert.alert("Session Expired", "Please log in again.");
            return response;
        }
    }
    return response;
}

// FINAL, COMBINED AND SIMPLIFIED API OBJECT
export const api = {

    getHistory: async (types, period = 'day', targetDate = null, limit = null) => {
        const params = new URLSearchParams({ 
            types: types.join(','),
            period: period 
        });
        if (targetDate) {
            params.append('targetDate', targetDate);
        }
        if (limit) {
            params.append('limit', limit);
        }
        const response = await authenticatedFetch(`/logs/history?${params.toString()}`);
        if (!response.ok) throw new Error(`Failed to fetch history`);
        return response.json();
    },

    addLog: async (logData) => {
        const response = await authenticatedFetch('/logs', {
            method: 'POST',
            // The date is passed in from the frontend date picker.
            body: JSON.stringify(logData),
        });
        return response.json();
    },

    updateLog: async (logId, amount) => {
        const response = await authenticatedFetch(`/logs/${logId}`, {
            method: 'PUT',
            body: JSON.stringify({ amount }), // Only send the amount for an update.
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