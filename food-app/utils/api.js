import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

const BASE_URL = 'http://172.20.10.5:3000/api';

const handlePublicFetch = async (response) => {
    const data = await response.json();
    if (!response.ok) {
        // Throws an error with the message from the server's JSON response
        throw new Error(data.message || 'An unknown error occurred.');
    }
    return data;
};

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

    // If the access token is expired (403), try to refresh it
    if (response.status === 403) {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        if (!refreshToken) {
            Alert.alert("Session Expired", "Please log in again.");
            // navigate to the login screen here
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
            
            // Retry the original request with the new, valid token
            response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });

        } catch (e) {
            // If the refresh token is also invalid, clear session and throw
            await SecureStore.deleteItemAsync('accessToken');
            await SecureStore.deleteItemAsync('refreshToken');
            Alert.alert("Session Expired", "Please log in again.");
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
    
    // Handle PDF responses for report downloads
    if (response.headers.get('content-type')?.includes('application/pdf')) {
        return response;
    }

    // For all other successful responses, parse the JSON
    return response.json();
}

export const api = {
    //  Public Routes (No Token Required) 
    login: (credentials) => fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
    }).then(handlePublicFetch),

    requestPasswordReset: (email) => fetch(`${BASE_URL}/password-reset/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    }).then(handlePublicFetch),

    confirmPasswordReset: (data) => fetch(`${BASE_URL}/password-reset/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    }).then(handlePublicFetch),

    // Authenticated Routes (Token Required)
    
    // Profile & User
    getProfile: () => authenticatedFetch('/profile'),
    updateProfileSetup: (profileData) => authenticatedFetch('/profile-setup', { method: 'PUT', body: JSON.stringify(profileData) }),
    updateProfile: (updateData) => authenticatedFetch('/profile', { method: 'PUT', body: JSON.stringify(updateData) }),
    changePassword: (passwordData) => authenticatedFetch('/profile/change-password', { method: 'POST', body: JSON.stringify(passwordData) }),
    deleteProfile: () => authenticatedFetch('/profile', { method: 'DELETE' }),
    uploadProfilePhoto: (formData) => authenticatedFetch('/upload/profile-picture', { method: 'POST', body: formData }),

    // Data Logging
    getHistory: (types, period = 'day', startDate = null, endDate = null, limit = null) => {
        const params = new URLSearchParams();
        params.append('types', types.join(','));
        params.append('period', period);

        // Correctly append the new date parameters if they exist
        if (startDate) {
            params.append('startDate', startDate);
        }
        if (endDate) {
            params.append('endDate', endDate);
        }

        if (limit) {
            params.append('limit', limit.toString());
        }
        
        return authenticatedFetch(`/logs/history?${params.toString()}`);
    },

    addLog: (logData) => authenticatedFetch('/logs', { method: 'POST', body: JSON.stringify(logData) }),
    updateLog: (logId, updateData) => authenticatedFetch(`/logs/${logId}`, { method: 'PUT', body: JSON.stringify(updateData) }),
    deleteLog: (logId) => authenticatedFetch(`/logs/${logId}`, { method: 'DELETE' }),

    // For sending data received from the Pi via BLE to the server
    addExerciseLog: (calorieData) => authenticatedFetch('/exercise/log', { 
        method: 'POST', 
        body: JSON.stringify(calorieData) 
    }),
    
    // For fetching the aggregated summary to display in the CalorieBurnt component
    getExerciseSummary: () => {
        // Calculate the client's timezone offset in ±HH:MM format
        const offsetMinutes = new Date().getTimezoneOffset();
        const sign = offsetMinutes > 0 ? '-' : '+';
        const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
        const offsetMinsPart = Math.abs(offsetMinutes) % 60;
        const formattedOffset = `${sign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinsPart).padStart(2, '0')}`;
        
        // Append the offset to the request URL
        return authenticatedFetch(`/exercise/summary?offset=${encodeURIComponent(formattedOffset)}`);
    },
    getLeaderboard: (period, date) => {
        const dateQuery = date ? `&date=${date.toISOString()}` : '';
        return authenticatedFetch(`/exercise/leaderboard?period=${period}${dateQuery}`);
    },

    // AI, OCR, & Predictions
    getGlucosePrediction: () => authenticatedFetch('/predictions/glucose'),
    scanImage: (base64) => authenticatedFetch('/ocr/aws-parse-image', { method: 'POST', body: JSON.stringify({ image: base64 }) }),
    identifyFoodFromImage: (base64) => authenticatedFetch('/ai/identify-food', { method: 'POST', body: JSON.stringify({ image: base64 }) }),
    getNutritionForFood: (foodName) => authenticatedFetch('/ai/get-nutrition', { method: 'POST', body: JSON.stringify({ foodName }) }),
    lookupBarcode: (barcode) => authenticatedFetch('/barcode/lookupBarcode', {
        method: 'POST',
        body: JSON.stringify({ barcode })
    }),
    
    // Notifications & Reminders
    getNotifications: () => authenticatedFetch('/notifications'),
    clearNotifications: () => authenticatedFetch('/notifications', { method: 'DELETE' }),
    addNotification: (notificationData) => authenticatedFetch('/notifications', { 
        method: 'POST', 
        body: JSON.stringify(notificationData) 
    }),
    getReminders: () => authenticatedFetch('/reminders'),
    addReminder: (data) => authenticatedFetch('/reminders', { method: 'POST', body: JSON.stringify(data) }),
    updateReminder: (id, data) => authenticatedFetch(`/reminders/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteReminder: (id) => authenticatedFetch(`/reminders/${id}`, { method: 'DELETE' }),

    // Community & Posts
    getPosts: () => authenticatedFetch('/posts'),
    getPostDetails: (postId) => authenticatedFetch(`/posts/${postId}`),
    getMyPosts: () => authenticatedFetch('/posts/my-posts'),
    createPost: (formData) => authenticatedFetch('/posts', { method: 'POST', body: formData }),
    updatePost: (postId, formData) => authenticatedFetch(`/posts/${postId}`, { method: 'PUT', body: formData }),
    deletePost: (postId) => authenticatedFetch(`/posts/${postId}`, { method: 'DELETE' }),
    likePost: (postId) => authenticatedFetch(`/posts/${postId}/like`, { method: 'POST' }),
    reportPost: (postId) => authenticatedFetch(`/posts/${postId}/report`, { method: 'POST' }),
    unreportPost: (postId) => authenticatedFetch(`/posts/${postId}/report`, { method: 'DELETE' }),
    bookmarkPost: (postId) => authenticatedFetch(`/posts/${postId}/bookmark`, { method: 'POST' }),
    unbookmarkPost: (postId) => authenticatedFetch(`/posts/${postId}/bookmark`, { method: 'DELETE' }),
    getBookmarkedPosts: () => authenticatedFetch('/posts/bookmarked'),
    unlikePost: (postId) => authenticatedFetch(`/posts/${postId}/like`, { method: 'DELETE' }),
    getPostComments: (postId) => authenticatedFetch(`/posts/${postId}/comments`),
    addComment: (postId, commentText) => authenticatedFetch(`/posts/${postId}/comment`, { method: 'POST', body: JSON.stringify({ commentText }) }),
    likeComment: (commentId) => authenticatedFetch(`/posts/comments/${commentId}/like`, { method: 'POST' }),
    unlikeComment: (commentId) => authenticatedFetch(`/posts/comments/${commentId}/like`, { method: 'DELETE' }),
    reportComment: (commentId) => authenticatedFetch(`/posts/comments/${commentId}/report`, { method: 'POST' }),
    unreportComment: (commentId) => authenticatedFetch(`/posts/comments/${commentId}/report`, { method: 'DELETE' }),
    deleteComment: (commentId) => authenticatedFetch(`/posts/comments/${commentId}`, { method: 'DELETE' }),

    // Settings, Providers & Reports
    getUserThresholds: () => authenticatedFetch('/user-settings/thresholds'),
    saveUserThresholds: (thresholds) => authenticatedFetch('/user-settings/thresholds', { method: 'POST', body: JSON.stringify(thresholds) }),
    getPreferredProvider: () => authenticatedFetch('/user-settings/provider'),
    savePreferredProvider: (provider) => authenticatedFetch('/user-settings/provider', { method: 'POST', body: JSON.stringify({ providerUserID: provider.userID }) }),
    getReportPreference: () => authenticatedFetch('/user-settings/report-preference'),
    saveReportPreference: (frequency) => authenticatedFetch('/user-settings/report-preference', { method: 'PUT', body: JSON.stringify({ frequency }) }),
    generateReport: (payload) => authenticatedFetch('/generate-report', { method: 'POST', body: JSON.stringify(payload) }),
    
    // Q&A with Providers
    getProviders: () => authenticatedFetch('/providers'),
    getQnaStatus: () => authenticatedFetch('/qna/status'),
    getMyQuestions: () => authenticatedFetch('/qna/my-questions'),
    deleteQuestion: (questionId) => authenticatedFetch(`/qna/my-questions/${questionId}`, { method: 'DELETE' }),
    deleteProviderQuestion: (questionId) => authenticatedFetch(`/provider/questions/${questionId}`, { method: 'DELETE' }),
    submitQuestion: (data) => authenticatedFetch('/qna/ask', { method: 'POST', body: JSON.stringify(data) }),
    getProviderQuestions: () => authenticatedFetch('/provider/questions'),
    getProviderAnsweredQuestions: () => authenticatedFetch('/provider/questions/answered'),
    submitProviderAnswer: (questionId, answerText) => authenticatedFetch(`/provider/answer/${questionId}`, { method: 'POST', body: JSON.stringify({ answerText }) }),

    // Reviews
    submitReview: (reviewData) => authenticatedFetch('/reviews',{ method: 'POST', body: JSON.stringify(reviewData) }
    ),
};