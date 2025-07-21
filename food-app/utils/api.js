// food-app/utils/api.js
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
            // Ideally, navigate to login screen here
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
            // Ideally, navigate to login screen here
            return response;
        }
    }
    return response;
}


async function authenticatedUploadFetch(endpoint, formData) {
    let accessToken = await SecureStore.getItemAsync('accessToken');
    
    const headers = { 
        'Authorization': `Bearer ${accessToken}`
        // Do not set 'Content-Type': 'multipart/form-data', let the browser do it.
    };

    let response = await fetch(`${BASE_URL}${endpoint}`, { 
        method: 'POST',
        headers: headers,
        body: formData
    });

    // Token refresh logic can be added here as well if needed
    if (!response.ok) {
        try {
            const error = await response.json();
            throw new Error(error.message || 'File upload failed');
        } catch(e) {
             throw new Error('An unexpected server error occurred during upload.');
        }
    }

    return response.json();
}


export const api = {
    getProfile: async () => {
        const response = await authenticatedFetch('/profile');
        if (!response.ok) {
            // Added error parsing for better debugging
            const err = await response.json().catch(() => ({ message: 'Failed to fetch profile' }));
            throw new Error(err.message);
        };
        return response.json();
    },

    updateProfileSetup: async (profileData) => {
        const response = await authenticatedFetch('/profile-setup', {
            method: 'PUT',
            body: JSON.stringify(profileData),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update profile.');
        }
        return response.json();
    },

    updateProfile: async (updateData) => {
        const response = await authenticatedFetch('/profile', {
            method: 'PUT',
            body: JSON.stringify(updateData),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update profile.');
        }
        return response.json();
    },

    getUserThresholds: async () => {
        const response = await authenticatedFetch('/user-settings/thresholds');
        if (!response.ok) throw new Error('Failed to fetch thresholds');
        return response.json();
    },

    getProviders: async () => {
        const response = await authenticatedFetch('/providers');
        if (!response.ok) throw new Error('Failed to fetch healthcare providers');
        return response.json();
    },

    saveUserThresholds: async (thresholds) => {
        const response = await authenticatedFetch('/user-settings/thresholds', {
            method: 'POST',
            body: JSON.stringify(thresholds),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to save thresholds.');
        }
        return response.json();
    },

    // User Settings - Provider
    getPreferredProvider: async () => {
        const response = await authenticatedFetch('/user-settings/provider');
        if (!response.ok) throw new Error('Failed to fetch provider');
        return response.json();
    },
    
    savePreferredProvider: async (provider) => {
        const payload = { providerUserID: provider.userID }; 

        const response = await authenticatedFetch('/user-settings/provider', {
            method: 'POST',
            body: JSON.stringify(payload), 
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to save provider.');
        }
        return response.json();
    },

    getReportPreference: async () => {
        const response = await authenticatedFetch('/user-settings/report-preference');
        if (!response.ok) throw new Error('Failed to get preference');
        return response.json();
    },

    saveReportPreference: async (frequency) => {
        const response = await authenticatedFetch('/user-settings/report-preference', {
            method: 'PUT',
            body: JSON.stringify({ frequency }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to save preference.');
        }
        return response.json();
    },

    // Report Generation
    generateReport: async (payload) => {
        const response = await authenticatedFetch('/generate-report', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to generate report.');
        }

        // Handle both JSON (email) and PDF (export) responses
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/pdf')) {
            return response; // Return the whole response for file handling
        } else {
            return response.json(); // Return JSON for email success message
        }
    },

    changePassword: async (passwordData) => {
        const response = await authenticatedFetch('/profile/change-password', {
            method: 'POST',
            body: JSON.stringify(passwordData),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to change password.');
        }
        return response.json();
    },

    deleteProfile: async () => {
        const response = await authenticatedFetch('/profile', {
            method: 'DELETE',
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete profile.');
        }
        return response.json();
    },

    uploadProfilePhoto: async (formData) => {
        return authenticatedUploadFetch('/upload/profile-picture', formData);
    },

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

    getGlucosePrediction: async () => {
        const response = await authenticatedFetch('/predictions/glucose');
        if (!response.ok) {
            try {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch prediction');
            } catch (e) {
                throw new Error(e.message || 'Failed to fetch prediction');
            }
        }
        return response.json();
    },

    addLog: async (logData) => {
        const response = await authenticatedFetch('/logs', {
            method: 'POST',
            body: JSON.stringify(logData),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to add log.');
        }
        return response.json();
    },

    updateLog: async (logId, updateData) => {
        const response = await authenticatedFetch(`/logs/${logId}`, {
            method: 'PUT',
            body: JSON.stringify(updateData),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update log.');
        }
        return response.json();
    },

    deleteLog: async (logId) => {
        const response = await authenticatedFetch(`/logs/${logId}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete log.');
        }
        return response.json();
    },

    scanImage: async (base64) => {
        const response = await authenticatedFetch('/ocr/aws-parse-image', {
            method: 'POST',
            body: JSON.stringify({ image: base64 }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to scan image.');
        }
        return response.json();
    },
};