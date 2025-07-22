// fyp/food-app/utils/api.js
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

const BASE_URL = 'http://192.168.10.120:3000/api';

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
    
    if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'An API error occurred');
        } else {
            const errorText = await response.text();
            console.error("Received non-JSON server response:", errorText);
            throw new Error(`Server returned a non-JSON error (Status: ${response.status})`);
        }
    }

    return response;
}

async function authenticatedUploadFetch(endpoint, formData) {
    let accessToken = await SecureStore.getItemAsync('accessToken');
    const headers = { 'Authorization': `Bearer ${accessToken}` };
    let response = await fetch(`${BASE_URL}${endpoint}`, { method: 'POST', headers: headers, body: formData });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'File upload failed');
    }
    return response.json();
}

export const api = {
    // Core User Functions
    getProfile: async () => {
        const response = await authenticatedFetch('/profile');
        return response.json();
    },
    updateProfileSetup: async (profileData) => {
        const response = await authenticatedFetch('/profile-setup', { method: 'PUT', body: JSON.stringify(profileData) });
        return response.json();
    },
    updateProfile: async (updateData) => {
        const response = await authenticatedFetch('/profile', { method: 'PUT', body: JSON.stringify(updateData) });
        return response.json();
    },
    changePassword: async (passwordData) => {
        const response = await authenticatedFetch('/profile/change-password', { method: 'POST', body: JSON.stringify(passwordData) });
        return response.json();
    },
    deleteProfile: async () => {
        const response = await authenticatedFetch('/profile', { method: 'DELETE' });
        return response.json();
    },
    uploadProfilePhoto: async (formData) => {
        return authenticatedUploadFetch('/upload/profile-picture', formData);
    },

    // Logging Functions
    getHistory: async (types, period = 'day', targetDate = null, limit = null) => {
        const params = new URLSearchParams({ types: types.join(','), period: period });
        if (targetDate) {
            params.append('targetDate', targetDate);
        }
        if (limit) {
            params.append('limit', limit);
        }
        const response = await authenticatedFetch(`/logs/history?${params.toString()}`);
        return response.json();
    },
    addLog: async (logData) => {
        const response = await authenticatedFetch('/logs', { method: 'POST', body: JSON.stringify(logData) });
        return response.json();
    },
    updateLog: async (logId, updateData) => {
        const response = await authenticatedFetch(`/logs/${logId}`, { method: 'PUT', body: JSON.stringify(updateData) });
        return response.json();
    },
    deleteLog: async (logId) => {
        const response = await authenticatedFetch(`/logs/${logId}`, { method: 'DELETE' });
        return response.json();
    },

    // AI & OCR Functions
    getGlucosePrediction: async () => {
        const response = await authenticatedFetch('/predictions/glucose');
        return response.json();
    },
    scanImage: async (base64) => {
        const response = await authenticatedFetch('/ocr/aws-parse-image', {
            method: 'POST',
            body: JSON.stringify({ image: base64 }),
        });
        return response.json();
    },

    //Notifications & Reminders
    getNotifications: async () => {
        const response = await authenticatedFetch('/notifications');
        return response.json();
    },

    clearNotifications: async () => {
        const response = await authenticatedFetch('/notifications', { method: 'DELETE' });
        return response.json();
    },

    getReminders: async () => {
        const response = await authenticatedFetch('/reminders');
        return response.json();
    },
    addReminder: async (reminderData) => {
        const response = await authenticatedFetch('/reminders', {
            method: 'POST',
            body: JSON.stringify(reminderData)
        });
        return response.json();
    },
    updateReminder: async (id, reminderData) => {
        const response = await authenticatedFetch(`/reminders/${id}`, {
            method: 'PUT',
            body: JSON.stringify(reminderData)
        });
        return response.json();
    },
    deleteReminder: async (id) => {
        const response = await authenticatedFetch(`/reminders/${id}`, { method: 'DELETE' });
        return response.json();
    },

    // Posts & Social Features
    likePost: async (postId) => {
        const response = await authenticatedFetch(`/posts/${postId}/like`, { method: 'POST' });
        return response.json();
    },

    unlikePost: async (postId) => {
        const response = await authenticatedFetch(`/posts/${postId}/like`, { method: 'DELETE' });
        return response.json();
    },

    getPosts: async () => {
        const response = await authenticatedFetch('/posts');
        return response.json();
    },
    createPost: async (formData) => {
        return authenticatedUploadFetch('/posts', formData);
    },
    likePost: async (postId) => {
        const response = await authenticatedFetch(`/posts/${postId}/like`, { method: 'POST' });
        return response.json();
    },
    unlikePost: async (postId) => {
        const response = await authenticatedFetch(`/posts/${postId}/like`, { method: 'DELETE' });
        return response.json();
    },

    getPostDetails: async (postId) => {
        const response = await authenticatedFetch(`/posts/${postId}`);
        return response.json();
    },

    getPostComments: async (postId) => {
        const response = await authenticatedFetch(`/posts/${postId}/comments`);
        return response.json();
    },

    addComment: async (postId, commentText) => {
        const response = await authenticatedFetch(`/posts/${postId}/comment`, {
            method: 'POST',
            body: JSON.stringify({ commentText })
        });
        return response.json();
    },
    
    // User Settings & Reports
    getUserThresholds: async () => {
        const response = await authenticatedFetch('/user-settings/thresholds');
        return response.json();
    },
    saveUserThresholds: async (thresholds) => {
        const response = await authenticatedFetch('/user-settings/thresholds', {
            method: 'POST',
            body: JSON.stringify(thresholds),
        });
        return response.json();
    },

    //Profile Settings
    getPreferredProvider: async () => {
        const response = await authenticatedFetch('/user-settings/provider');
        return response.json();
    },
    savePreferredProvider: async (provider) => {
        const response = await authenticatedFetch('/user-settings/provider', {
            method: 'POST',
            body: JSON.stringify({ providerUserID: provider.userID }),
        });
        return response.json();
    },
    getReportPreference: async () => {
        const response = await authenticatedFetch('/user-settings/report-preference');
        return response.json();
    },
    saveReportPreference: async (frequency) => {
        const response = await authenticatedFetch('/user-settings/report-preference', {
            method: 'PUT',
            body: JSON.stringify({ frequency }),
        });
        return response.json();
    },
    generateReport: async (payload) => {
        const response = await authenticatedFetch('/generate-report', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        if (response.headers.get('content-type')?.includes('application/pdf')) {
            return response;
        }
        return response.json();
    },

    //AI Functions
    identifyFoodFromImage: async (base64) => {
        const response = await authenticatedFetch('/ai/identify-food', {
            method: 'POST',
            body: JSON.stringify({ image: base64 }),
        });
        return response.json();
    },

    getNutritionForFood: async (foodName) => {
        const response = await authenticatedFetch('/ai/get-nutrition', {
            method: 'POST',
            body: JSON.stringify({ foodName }),
        });
        return response.json();
    },
    
    // Q&A FEATURE FUNCTIONS
    getProviders: async () => {
        const response = await authenticatedFetch('/providers');
        return response.json();
    },
    
    getQnaStatus: async () => {
        const response = await authenticatedFetch('/qna/status');
        return response.json();
    },
    getMyQuestions: async () => {
        const response = await authenticatedFetch('/qna/my-questions');
        return response.json();
    },
    submitQuestion: async (questionData) => {
        const response = await authenticatedFetch('/qna/ask', { method: 'POST', body: JSON.stringify(questionData) });
        return response.json();
    },
    getProviderQuestions: async () => {
        const response = await authenticatedFetch('/provider/questions');
        return response.json();
    },
    submitProviderAnswer: async (questionId, answerText) => {
        const response = await authenticatedFetch(`/provider/answer/${questionId}`, { method: 'POST', body: JSON.stringify({ answerText }) });
        return response.json();
    },
};