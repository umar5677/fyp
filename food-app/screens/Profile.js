import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Switch,
  Alert, ScrollView, ActivityIndicator, Linking, StatusBar, Modal, Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Animatable from 'react-native-animatable';
import { api } from '../utils/api';
import { useTheme } from '../context/ThemeContext';
import HeaderBackground from '../components/HeaderBackground';
import { ReviewModal } from '../components/ReviewModal';

const getStyles = (colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background, },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, },
  scrollViewContent: { paddingHorizontal: 16, paddingTop: 80, paddingBottom: 40 },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3.84, elevation: 5, },
  avatarContainer: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(249, 115, 22, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16, },
  avatar: { width: 60, height: 60, borderRadius: 30, },
  avatarInitial: { fontSize: 24, color: '#F97316', fontWeight: 'bold', },
  profileInfoContainer: { flex: 1, },
  name: { fontSize: 20, fontWeight: 'bold', color: colors.text, },
  email: { fontSize: 14, color: colors.textSecondary, marginTop: 2, },
  editButton: { paddingVertical: 4, paddingHorizontal: 12, },
  editButtonText: { color: colors.primary, fontSize: 16, fontWeight: '600', },
  menuGroup: { backgroundColor: colors.card, borderRadius: 16, marginBottom: 24, overflow: 'hidden', },
  buttonRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.background, },
  buttonIcon: { width: 24, marginRight: 16, color: colors.icon, },
  buttonText: { flex: 1, fontSize: 16, color: colors.text, fontWeight: '500', },
  chevronIcon: { color: colors.textSecondary, },
  logoutButton: { backgroundColor: colors.logoutBackground, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', },
  logoutText: { color: colors.logoutText, fontSize: 16, fontWeight: '600', marginLeft: 8, },
  
  // Styles for the image viewer modal
  viewerContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  fullscreenImage: { width: '100%', height: '100%' },
  closeButton: { position: 'absolute', top: 60, right: 20, padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  
  // ** NEW STYLES for the custom Action Sheet **
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', },
  actionSheetContainer: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingTop: 20, },
  actionButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, },
  actionButtonText: { fontSize: 18, color: colors.text, marginLeft: 16, },
  cancelButton: { backgroundColor: colors.background, borderRadius: 12, marginTop: 10, paddingVertical: 16, alignItems: 'center', },
  cancelButtonText: { color: colors.primary, fontSize: 18, fontWeight: '600', },
});

// ** NEW COMPONENT: A beautiful, themed action sheet for avatar options **
const AvatarActionSheet = ({ isVisible, onClose, onView, onChange, hasProfilePic, colors }) => {
    const styles = getStyles(colors);
    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={isVisible}
            onRequestClose={onClose}
        >
            <Pressable style={styles.modalOverlay} onPress={onClose}>
                <Animatable.View animation="fadeInUpBig" duration={400} style={styles.actionSheetContainer}>
                    {/* Conditionally show the "View Picture" button */}
                    {hasProfilePic && (
                        <TouchableOpacity style={styles.actionButton} onPress={onView}>
                            <Ionicons name="eye-outline" size={24} color={colors.text} />
                            <Text style={styles.actionButtonText}>View Picture</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.actionButton} onPress={onChange}>
                        <Ionicons name="image-outline" size={24} color={colors.text} />
                        <Text style={styles.actionButtonText}>
                            {hasProfilePic ? "Change Picture" : "Choose New Picture"}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                </Animatable.View>
            </Pressable>
        </Modal>
    );
};


const ImageViewer = ({ visible, imageUri, onClose }) => {
    const styles = getStyles({}); 
    if (!imageUri) return null;
    return (
        <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <SafeAreaView style={styles.viewerContainer}>
                <Image source={{ uri: imageUri }} style={styles.fullscreenImage} resizeMode="contain" />
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <Ionicons name="close" size={32} color="#FFFFFF" />
                </TouchableOpacity>
            </SafeAreaView>
        </Modal>
    );
};


const ProfileMenuButton = ({ iconName, text, onPress, colors, isSwitch = false, switchValue, onSwitchChange }) => {
    const styles = getStyles(colors);
    return (
        <TouchableOpacity style={styles.buttonRow} onPress={onPress} disabled={isSwitch} activeOpacity={0.7}>
            <Ionicons name={iconName} size={22} style={styles.buttonIcon} />
            <Text style={styles.buttonText}>{text}</Text>
            {isSwitch ? (
              <Switch value={switchValue} onValueChange={onSwitchChange} trackColor={{ false: '#767577', true: 'rgba(249, 115, 22, 0.4)' }} thumbColor={switchValue ? colors.primary : '#f4f3f4'} />
            ) : (
              <Ionicons name="chevron-forward" size={20} style={styles.chevronIcon} />
            )}
        </TouchableOpacity>
    );
};

const ProfileScreen = ({ navigation }) => {
    const { theme, colors, toggleTheme } = useTheme();
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [cacheBuster, setCacheBuster] = useState(Date.now());
    const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
    const [isViewerVisible, setIsViewerVisible] = useState(false);
    const [isActionSheetVisible, setIsActionSheetVisible] = useState(false); // State for the new modal
    const styles = getStyles(colors);

    useFocusEffect(
        useCallback(() => {
            const fetchProfile = async () => {
                if (!isLoading) setIsLoading(true);
                try {
                    const profileRes = await api.getProfile();
                    setUser(profileRes.user);
                } catch (error) {
                    Alert.alert("Error", "Could not load your profile data.");
                } finally {
                    setIsLoading(false);
                }
            };
            fetchProfile();
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
        const fileType = fileName.includes('.') ? fileName.split('.').pop() : 'jpg';

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

    const handleLogout = async () => {
        Alert.alert("Log Out", "Are you sure you want to log out from this account?", [
            { text: "Cancel", style: "cancel" },
            { text: "Log Out", style: "destructive",
                onPress: async () => {
                    const rootNavigator = navigation.getParent('RootStack');
                    await SecureStore.deleteItemAsync('accessToken');
                    await SecureStore.deleteItemAsync('refreshToken');
                    if (rootNavigator) {
                        rootNavigator.replace('Login');
                    } else {
                        navigation.navigate('Login');
                    }
                },
            },
        ]);
    };

    // This single handler now opens our custom action sheet
    const handleAvatarPress = () => {
        setIsActionSheetVisible(true);
    };

    if (isLoading || !user) {
        return <SafeAreaView style={styles.loadingContainer}><ActivityIndicator size="large" color="#F97316" /></SafeAreaView>;
    }

    const imageUri = user.pfpUrl ? `${user.pfpUrl}?t=${cacheBuster}` : null;
    const userInitial = user.first_name ? user.first_name[0].toUpperCase() : 'U';

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" />
            <HeaderBackground />
            <ScrollView contentContainerStyle={styles.scrollViewContent}>
                <View style={styles.profileCard}>
                    <TouchableOpacity onPress={handleAvatarPress}>
                         <View style={styles.avatarContainer}>
                            {imageUri ? (
                                <Image source={{ uri: imageUri }} style={styles.avatar} />
                            ) : (
                                <Text style={styles.avatarInitial}>{userInitial}</Text>
                            )}
                        </View>
                    </TouchableOpacity>
                    <View style={styles.profileInfoContainer}>
                        <Text style={styles.name} numberOfLines={1}>{user.first_name || ''} {user.last_name || ''}</Text>
                        <Text style={styles.email} numberOfLines={1}>{user.email}</Text>
                    </View>
                    <TouchableOpacity style={styles.editButton} onPress={() => navigation.navigate('EditProfile')}>
                        <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.menuGroup}>
                     <ProfileMenuButton iconName="person-outline" text="Edit Profile" onPress={() => navigation.navigate('EditProfile')} colors={colors} />
                     <ProfileMenuButton iconName="lock-closed-outline" text="Change Password" onPress={() => navigation.navigate('ChangePassword')} colors={colors} />
                </View>

                <View style={styles.menuGroup}>
                    {!user.isProvider && (
                        <>
                            <ProfileMenuButton iconName="alarm-outline" text="Reminders" onPress={() => navigation.navigate('Reminders')} colors={colors} />
                            <ProfileMenuButton iconName="shield-checkmark-outline" text="Alerts and Sharing" onPress={() => navigation.navigate('Alerts')} colors={colors} />
                        </>
                    )}
                    <ProfileMenuButton iconName="bookmark-outline" text="Bookmarked Posts" onPress={() => navigation.navigate('BookmarkedPosts')} colors={colors} />
                    <ProfileMenuButton
                        iconName="star-outline"
                        text="Leave a Review"
                        onPress={() => setIsReviewModalVisible(true)}
                        colors={colors}
                    />
                     <ProfileMenuButton iconName="settings-outline" text="Dark Mode" isSwitch={true} switchValue={theme === 'dark'} onSwitchChange={toggleTheme} colors={colors} />
                     <ProfileMenuButton iconName="chatbubble-ellipses-outline" text="Contact Us" onPress={() => Linking.openURL('mailto:glucobites.org@gmail.com')} colors={colors} />
                </View>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                     <Ionicons name="log-out-outline" size={24} color="#EF4444" />
                     <Text style={styles.logoutText}>Log out from this account</Text>
                </TouchableOpacity>
            </ScrollView>
            
            <ReviewModal 
                isVisible={isReviewModalVisible}
                onClose={() => setIsReviewModalVisible(false)}
            />
            <ImageViewer
                visible={isViewerVisible}
                imageUri={imageUri}
                onClose={() => setIsViewerVisible(false)}
            />
            <AvatarActionSheet 
                isVisible={isActionSheetVisible}
                onClose={() => setIsActionSheetVisible(false)}
                onView={() => {
                    setIsActionSheetVisible(false);
                    setIsViewerVisible(true);
                }}
                onChange={() => {
                    setIsActionSheetVisible(false);
                    pickImageAndUpload();
                }}
                hasProfilePic={!!user.pfpUrl}
                colors={colors}
            />
        </SafeAreaView>
    );
};

export default ProfileScreen;