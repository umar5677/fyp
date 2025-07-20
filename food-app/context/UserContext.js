// food-app/context/UserContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { api } from '../utils/api';
import * as SecureStore from 'expo-secure-store';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUser = async () => {
        const token = await SecureStore.getItemAsync('accessToken');
        if (!token) {
            setIsLoading(false);
            return;
        }

        try {
            const profileRes = await api.getProfile();
            setUser(profileRes.user);
        } catch (error) {
            console.error("Failed to fetch user in context", error);
            // Could handle token expiry and logout here
        } finally {
            setIsLoading(false);
        }
    };

    // We can also add the logout function to the context
    // const logout = async () => { ... }

    return (
        <UserContext.Provider value={{ user, isLoading, fetchUser }}>
            {children}
        </UserContext.Provider>
    );
};

// Custom hook to easily use the context
export const useUser = () => useContext(UserContext);