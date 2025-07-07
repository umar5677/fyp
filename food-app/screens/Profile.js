// screens/Profile.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
  // --- NEW: Import Linking ---
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { api } from '../utils/api';

// Reusable button component for the profile screen
const ProfileButton = ({ icon, text, onPress, isLogout = false }) => (
    <TouchableOpacity
        style={[styles.buttonRow, isLogout && styles.logoutButton]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={styles.buttonIconContainer}>
            {icon}
        </View>
        <Text style={[styles.buttonText, isLogout && styles.logoutText]}>{text}</Text>
        {!isLogout && <Ionicons name="chevron-forward" size={20} color="#B0B0B0" />}
    </TouchableOpacity>
);

const ProfileScreen = ({ navigation }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch profile data when the screen comes into focus
    useFocusEffect(
        useCallback(() => {
            const fetchProfile = async () => {
                try {
                    const profileRes = await api.getProfile();
                    setUser(profileRes.user);
                } catch (error) {
                    console.error("Failed to load user profile:", error);
                    Alert.alert("Error", "Could not load your profile data.");
                } finally {
                    setIsLoading(false);
                }
            };
            fetchProfile();
        }, [])
    );

    // --- NEW: Handler for the feedback button ---
    const handleFeedback = async () => {
        const to = 'support@glucobites.com'; // Your support email
        const subject = 'GlucoBites App Feedback';
        const url = `mailto:${to}?subject=${subject}`;

        try {
            const canOpen = await Linking.canOpenURL(url);
            if (canOpen) {
                await Linking.openURL(url);
            } else {
                Alert.alert("Cannot Open Email", "No email application is available to send feedback.");
            }
        } catch (error) {
            Alert.alert("Error", "An unexpected error occurred.");
        }
    };
    
    const handleLogout = async () => {
        Alert.alert(
            "Log Out",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Log Out",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await SecureStore.deleteItemAsync('accessToken');
                            await SecureStore.deleteItemAsync('refreshToken');
                            navigation.getParent('RootStack').replace('Login');
                        } catch (error) {
                            console.error('Error during logout:', error);
                            Alert.alert('Logout Failed', 'An error occurred while logging out.');
                        }
                    },
                },
            ]
        );
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#E4691C" />
            </SafeAreaView>
        );
    }
    
    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <Animatable.View animation="fadeInDown" duration={600} style={styles.profileCard}>
                    <Image
                        source={{ uri: `https://i.pravatar.cc/150?u=${user?.email}` }} // Placeholder avatar
                        style={styles.avatar}
                    />
                    <Text style={styles.name}>{user?.first_name || ''} {user?.last_name || ''}</Text>
                    <Text style={styles.email}>{user?.email}</Text>
                </Animatable.View>

                <Animatable.View animation="fadeInUp" duration={600} delay={200} style={styles.menuContainer}>
                    <Text style={styles.sectionHeader}>Account</Text>
                    <ProfileButton
                        icon={<Feather name="user" size={20} color="#555" />}
                        text="Edit Profile"
                        onPress={() => Alert.alert("Navigate", "Navigate to Edit Profile screen.")}
                    />
                    <ProfileButton
                        icon={<MaterialCommunityIcons name="lock-outline" size={22} color="#555" />}
                        text="Change Password"
                        onPress={() => Alert.alert("Navigate", "Navigate to Change Password screen.")}
                    />
                    
                    <Text style={styles.sectionHeader}>Application</Text>
                     <ProfileButton
                        icon={<Ionicons name="alarm-outline" size={22} color="#555" />}
                        text="Reminders"
                        onPress={() => navigation.navigate('Reminders')}
                    />
                     <ProfileButton
                        icon={<MaterialCommunityIcons name="shield-alert-outline" size={22} color="#555" />}
                        text="Alerts & Sharing"
                        onPress={() => Alert.alert("Navigate", "Navigate to Alerts screen.")}
                    />
                    <ProfileButton
                        icon={<Ionicons name="settings-outline" size={20} color="#555" />}
                        text="Settings"
                        onPress={() => Alert.alert("Navigate", "Navigate to Settings screen.")}
                    />
                    
                    {/* --- NEW: Feedback Button --- */}
                    <ProfileButton
                        icon={<MaterialCommunityIcons name="comment-quote-outline" size={20} color="#555" />}
                        text="Feedback & Suggestions"
                        onPress={handleFeedback}
                    />

                     <ProfileButton
                        icon={<Ionicons name="help-circle-outline" size={22} color="#555" />}
                        text="Help & Support"
                        onPress={() => Alert.alert("Navigate", "Navigate to Help screen.")}
                    />

                    <View style={{ marginTop: 20 }}>
                        <ProfileButton
                            icon={<Ionicons name="log-out-outline" size={22} color="#D32F2F" />}
                            text="Log Out"
                            onPress={handleLogout}
                            isLogout={true}
                        />
                    </View>
                </Animatable.View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
    padding: 24,
    marginBottom: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2, },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#E4691C'
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E1E2D',
  },
  email: {
    fontSize: 16,
    color: '#6C757D',
    marginTop: 4,
  },
  menuContainer: {
    width: '100%',
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9E9E9E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 15,
    marginLeft: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  buttonIconContainer: {
      width: 30,
      alignItems: 'center',
      marginRight: 15,
  },
  buttonText: {
    flex: 1,
    fontSize: 16,
    color: '#1E1E2D',
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#FFF6F2',
    borderColor: '#FFDAD1',
  },
  logoutText: {
    color: '#D32F2F',
    fontWeight: 'bold',
  },
});

export default ProfileScreen;