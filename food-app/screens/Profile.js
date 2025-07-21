// screens/Profile.js
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Switch,
  Alert, ScrollView, ActivityIndicator, Linking, Platform, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../utils/api';
import { useTheme } from '../context/ThemeContext';

const DEFAULT_AVATAR = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png';

const getStyles = (colors) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: colors.card,
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
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  email: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 4,
  },
  cameraIconContainer: {
      position: 'absolute',
      bottom: 20,
      right: 5,
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: 8,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: '#FFF'
  },
  menuContainer: {
    width: '100%',
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 15,
    marginLeft: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonIconContainer: {
      width: 30,
      alignItems: 'center',
      marginRight: 15,
  },
  buttonText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: colors.logoutBackground,
    borderColor: colors.logoutBorder,
  },
  logoutText: {
    color: colors.logoutText,
    fontWeight: 'bold',
  },
});

const ProfileButton = ({ icon, text, onPress, isLogout = false, isSwitch = false, switchValue, onSwitchChange, colors }) => {
    const styles = getStyles(colors);
    return (
        <TouchableOpacity
            style={[styles.buttonRow, isLogout && styles.logoutButton]}
            onPress={onPress}
            activeOpacity={0.7}
            disabled={isSwitch}
        >
            <View style={styles.buttonIconContainer}>
                {icon}
            </View>
            <Text style={[styles.buttonText, isLogout && styles.logoutText]}>{text}</Text>
            
            {isSwitch ? (
              <Switch value={switchValue} onValueChange={onSwitchChange} />
            ) : !isLogout && (
              <Ionicons name="chevron-forward" size={20} color="#B0B0B0" />
            )}
        </TouchableOpacity>
    );
};

const ProfileScreen = ({ navigation }) => {
    const { theme, colors, toggleTheme } = useTheme();
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [cacheBuster, setCacheBuster] = useState(Date.now());
    const styles = getStyles(colors);

    useFocusEffect(
        useCallback(() => {
            let isActive = true;
            const fetchProfile = async () => {
                if (isActive) {
                    setIsLoading(true); 
                }
                
                try {
                    const profileRes = await api.getProfile();
                    if (isActive) {
                        setUser(profileRes.user);
                        setCacheBuster(Date.now());
                    }
                } catch (error) {
                    console.error("Failed to load user profile:", error);
                    if (isActive) {
                        Alert.alert("Error", "Could not load your profile data.");
                    }
                } finally {
                    if (isActive) {
                        setIsLoading(false);
                    }
                }
            };
            fetchProfile();

            return () => {
              isActive = false;
            };
        }, [])
    );

    const pickImageAndUpload = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
            Alert.alert("Permission Required", "You need to allow access to your photos to change your profile picture.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (result.canceled) return;

        const asset = result.assets[0];
        const uri = asset.uri;

        const formData = new FormData();
        const fileName = uri.split('/').pop();
        const fileType = fileName.split('.').pop();
        
        formData.append('photo', { uri, name: fileName, type: `image/${fileType}` });

        try {
            const data = await api.uploadProfilePhoto(formData);

            if (data.imageUrl) {
                setUser(currentUser => ({ ...currentUser, pfpUrl: data.imageUrl }));
                setCacheBuster(Date.now());
                Alert.alert('Success!', 'Your profile picture has been updated.');
            } else {
                Alert.alert('Upload Failed', data.message || 'The server did not return an image URL.');
            }
        } catch (err) {
            console.error('Upload error:', err);
            Alert.alert('Error', err.message || 'Something went wrong during the upload.');
        }
    };

    const handleFeedback = async () => {
        const to = 'support@glucobites.com';
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

    const imageUri = user?.pfpUrl ? `${user.pfpUrl}?t=${cacheBuster}` : DEFAULT_AVATAR;

    if (isLoading) {
        return (
            <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }
    
    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <Animatable.View animation="fadeInDown" duration={600} style={styles.profileCard}>
                    <TouchableOpacity onPress={pickImageAndUpload}>
                        <Image
                            source={{ uri: imageUri }}
                            style={[styles.avatar, { borderColor: colors.primary }]}
                        />
                        <View style={styles.cameraIconContainer}>
                            <Ionicons name="camera-reverse" size={18} color="#FFF" />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.name}>{user?.first_name || ''} {user?.last_name || ''}</Text>
                    <Text style={styles.email}>{user?.email}</Text>
                </Animatable.View>

                <Animatable.View animation="fadeInUp" duration={600} delay={200} style={styles.menuContainer}>
                    <Text style={styles.sectionHeader}>Account</Text>
                    <ProfileButton
                        icon={<Feather name="user" size={20} color={colors.icon} />}
                        text="Edit Profile"
                        onPress={() => navigation.navigate('EditProfile')}
                        colors={colors}
                    />
                    <ProfileButton
                        icon={<MaterialCommunityIcons name="lock-outline" size={22} color={colors.icon} />}
                        text="Change Password"
                        onPress={() => navigation.navigate('ChangePassword')}
                        colors={colors}
                    />
                    
                    <Text style={styles.sectionHeader}>Application</Text>
                    <ProfileButton
                        icon={<Ionicons name="contrast" size={22} color={colors.icon} />}
                        text="Dark Mode"
                        isSwitch={true}
                        switchValue={theme === 'dark'}
                        onSwitchChange={toggleTheme}
                        colors={colors}
                    />
                     <ProfileButton
                        icon={<Ionicons name="alarm-outline" size={22} color={colors.icon} />}
                        text="Reminders"
                        onPress={() => navigation.navigate('Reminders')}
                        colors={colors}
                    />
                     <ProfileButton
                        icon={<MaterialCommunityIcons name="shield-alert-outline" size={22} color={colors.icon} />}
                        text="Alerts & Sharing"
                        onPress={() => navigation.navigate('Alerts')}
                        colors={colors}
                    />
                    <ProfileButton
                        icon={<MaterialCommunityIcons name="comment-quote-outline" size={20} color={colors.icon} />}
                        text="Feedback & Suggestions"
                        onPress={handleFeedback}
                        colors={colors}
                    />

                    <View style={{ marginTop: 20 }}>
                        <ProfileButton
                            icon={<Ionicons name="log-out-outline" size={22} color={colors.logoutText} />}
                            text="Log Out"
                            onPress={handleLogout}
                            isLogout={true}
                            colors={colors}
                        />
                    </View>
                </Animatable.View>
            </ScrollView>
        </SafeAreaView>
    );
};

export default ProfileScreen;