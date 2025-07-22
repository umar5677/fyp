// fyp/food-app/utils/api.js
import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

const BASE_URL = 'http://192.168.10.120:3000/api';

async function authenticatedFetch(endpoint, options = {}) {
    let accessToken = await SecureStore.getItemAsync('accessToken');
    
    const isFormData = options.body instanceof FormData;
    const headers = { ...options.headers };

    if (!isFormData && options.body) {
        headers['Content-Type'] = 'application/json';
    }

    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    let response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });

    // If token is expired, try to refresh it
    if (response.status === 403) {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        if (!refreshToken) {
            Alert.alert("Session Expired", "Please log in again.");
            throw new Error("Session Expired");
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
            await SecureStore.deleteItemAsync('accessToken');
            await SecureStore.deleteItemAsync('refreshToken');
            Alert.alert("Session Expired", "Please log in again.");
            // Navigate to login screen would be ideal here.
            throw new Error("Session Expired");
        }
    }
    
    // Handle other non-successful responses
    if (!response.ok) {
        const contentType = response.headers.get('content-type');
        let errorData;
        if (contentType && contentType.includes('application/json')) {
            errorData = await response.json();
        } else {
            errorData = { message: `Server error: ${response.status}` };
        }
        throw new Error(errorData.message || 'An API error occurred');
    }
    
    // For PDF responses, return the raw response to be handled by the caller
    if (response.headers.get('content-type')?.includes('application/pdf')) {
        return response;
    }

    // For other successful responses, parse as JSON
    return response.json();
}

export const api = {
    getProfile: () => authenticatedFetch('/profile'),
    updateProfileSetup: (profileData) => authenticatedFetch('/profile-setup', { method: 'PUT', body: JSON.stringify(profileData) }),
    updateProfile: (updateData) => authenticatedFetch('/profile', { method: 'PUT', body: JSON.stringify(updateData) }),
    changePassword: (passwordData) => authenticatedFetch('/profile/change-password', { method: 'POST', body: JSON.stringify(passwordData) }),
    deleteProfile: () => authenticatedFetch('/profile', { method: 'DELETE' }),
    uploadProfilePhoto: (formData) => authenticatedFetch('/upload/profile-picture', { method: 'POST', body: formData }),

    //  Data Logging Functions 
    getHistory: (types, period = 'day', targetDate = null, limit = null) => {
        const params = new URLSearchParams({ types: types.join(','), period });
        if (targetDate) params.append('targetDate', targetDate);
        if (limit) params.append('limit', limit.toString());
        return authenticatedFetch(`/logs/history?${params.toString()}`);
    },
    addLog: (logData) => authenticatedFetch('/logs', { method: 'POST', body: JSON.stringify(logData) }),
    updateLog: (logId, updateData) => authenticatedFetch(`/logs/${logId}`, { method: 'PUT', body: JSON.stringify(updateData) }),
    deleteLog: (logId) => authenticatedFetch(`/logs/${logId}`, { method: 'DELETE' }),

    // AI, OCR, and Prediction Functions 
    getGlucosePrediction: () => authenticatedFetch('/predictions/glucose'),
    scanImage: (base64) => authenticatedFetch('/ocr/aws-parse-image', { method: 'POST', body: JSON.stringify({ image: base64 }) }),
    identifyFoodFromImage: (base64) => authenticatedFetch('/ai/identify-food', { method: 'POST', body: JSON.stringify({ image: base64 }) }),
    getNutritionForFood: (foodName) => authenticatedFetch('/ai/get-nutrition', { method: 'POST', body: JSON.stringify({ foodName }) }),
    
    //  Notifications & Reminders
    getNotifications: () => authenticatedFetch('/notifications'),
    clearNotifications: () => authenticatedFetch('/notifications', { method: 'DELETE' }),
    getReminders: () => authenticatedFetch('/reminders'),
    addReminder: (data) => authenticatedFetch('/reminders', { method: 'POST', body: JSON.stringify(data) }),
    updateReminder: (id, data) => authenticatedFetch(`/reminders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteReminder: (id) => authenticatedFetch(`/reminders/${id}`, { method: 'DELETE' }),

    // Posts & Community/Social Features
    getPosts: () => authenticatedFetch('/posts'),
    getPostDetails: (postId) => authenticatedFetch(`/posts/${postId}`),
    createPost: (formData) => authenticatedFetch('/posts', { method: 'POST', body: formData }),
    updatePost: (postId, formData) => authenticatedFetch(`/posts/${postId}`, { method: 'PUT', body: formData }),
    deletePost: (postId) => authenticatedFetch(`/posts/${postId}`, { method: 'DELETE' }),
    likePost: (postId) => authenticatedFetch(`/posts/${postId}/like`, { method: 'POST' }),
    unlikePost: (postId) => authenticatedFetch(`/posts/${postId}/like`, { method: 'DELETE' }),
    getPostComments: (postId) => authenticatedFetch(`/posts/${postId}/comments`),
    addComment: (postId, commentText) => authenticatedFetch(`/posts/${postId}/comment`, { method: 'POST', body: JSON.stringify({ commentText }) }),

    // User Settings, Providers & Reports
    getUserThresholds: () => authenticatedFetch('/user-settings/thresholds'),
    saveUserThresholds: (thresholds) => authenticatedFetch('/user-settings/thresholds', { method: 'POST', body: JSON.stringify(thresholds) }),
    getPreferredProvider: () => authenticatedFetch('/user-settings/provider'),
    savePreferredProvider: (provider) => authenticatedFetch('/user-settings/provider', { method: 'POST', body: JSON.stringify({ providerUserID: provider.userID }) }),
    getReportPreference: () => authenticatedFetch('/user-settings/report-preference'),
    saveReportPreference: (frequency) => authenticatedFetch('/user-settings/report-preference', { method: 'PUT', body: JSON.stringify({ frequency }) }),
    generateReport: (payload) => authenticatedFetch('/generate-report', { method: 'POST', body: JSON.stringify(payload) }),
    
    // Q&A (Ask a Provider) Functions
    getProviders: () => authenticatedFetch('/providers'),
    getQnaStatus: () => authenticatedFetch('/qna/status'),
    getMyQuestions: () => authenticatedFetch('/qna/my-questions'),
    submitQuestion: (data) => authenticatedFetch('/qna/ask', { method: 'POST', body: JSON.stringify(data) }),
    getProviderQuestions: () => authenticatedFetch('/provider/questions'),
    submitProviderAnswer: (questionId, answerText) => authenticatedFetch(`/provider/answer/${questionId}`, { method: 'POST', body: JSON.stringify({ answerText }) }),
};