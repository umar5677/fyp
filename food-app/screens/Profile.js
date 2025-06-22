// screens/Profile.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { Ionicons, Feather, Entypo } from '@expo/vector-icons';

const Profile = ({ navigation }) => {
  const handleLogout = async () => {
    try {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
      navigation.getParent('RootStack').replace('Login');
    } catch (error) {
      console.error('Error during logout:', error);
      Alert.alert(
        'Logout Failed',
        'An error occurred while logging out. Please try closing the app.'
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Avatar + Email */}
        <Image
          source={{ uri: 'https://randomuser.me/api/portraits/women/44.jpg' }}
          style={styles.avatar}
        />
        <Text style={styles.email}>example@gmail.com</Text>

        {/* Buttons */}
        <TouchableOpacity style={styles.buttonRow}>
          <Feather name="edit-3" size={18} color="black" style={styles.icon} />
          <Text style={styles.buttonText}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={18} color="black" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.buttonRow}>
          <Ionicons name="notifications-outline" size={18} color="black" style={styles.icon} />
          <Text style={styles.buttonText}>Reminders</Text>
          <Ionicons name="chevron-forward" size={18} color="black" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.buttonRow}>
          <Entypo name="share-alternative" size={18} color="black" style={styles.icon} />
          <Text style={styles.buttonText}>Alerts</Text>
          <Ionicons name="chevron-forward" size={18} color="black" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.buttonRow}>
          <Ionicons name="settings-outline" size={18} color="black" style={styles.icon} />
          <Text style={styles.buttonText}>Settings</Text>
          <Ionicons name="chevron-forward" size={18} color="black" />
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 12,
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 24,
    color: '#222',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#aaa',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginVertical: 6,
    width: '100%',
    backgroundColor: '#fff',
  },
  icon: {
    marginRight: 12,
  },
  buttonText: {
    flex: 1,
    fontSize: 16,
    color: '#1E1E2D',
    fontWeight: '500',
  },
  logoutButton: {
    marginTop: 30,
    backgroundColor: '#E85C1B',
    paddingVertical: 14,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Profile;