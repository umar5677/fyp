// fyp/food-app/context/ThemeContext.js

import React, { createContext, useState, useEffect, useContext } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- NEW LIGHT THEME with a clear, accessible blue ---
export const lightColors = {
  background: '#F9FAFB',     
  card: '#FFFFFF',        
  text: '#334155',      
  textSecondary: '#64748B',
  border: '#E2E8F0',       
  icon: '#64748B',          
  logoutBackground: '#FFE4E6', 
  logoutText: '#BE123C',     
  logoutBorder: '#FECDD3',
  primary: '#007AFF',     
};


export const darkColors = {
  background: '#0F172A',   
  card: '#1E293B',          
  text: '#E2E8F0',         
  textSecondary: '#94A3B8',   
  border: '#334155',     
  icon: '#94A3B8',        
  logoutBackground: '#491C1C',  
  logoutText: '#FFAFAF',      
  logoutBorder: '#642121',   
  primary: '#58A6FF',
};


export const ThemeContext = createContext({
  theme: 'light',
  colors: lightColors,
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('user-theme');
        if (savedTheme) {
          setTheme(savedTheme);
        }
      } catch (error) {
        console.error("Failed to load theme from storage.", error);
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem('user-theme', newTheme);
    } catch (error) {
      console.error("Failed to save theme to storage.", error);
    }
  };
  
  const colors = theme === 'light' ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);