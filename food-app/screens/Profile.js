// screens/Profile.js
import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';

const Profile = ({ navigation }) => {
  const handleLogout = () => {
    // This assumes your root stack navigator has an ID 'RootStack'
    // and a 'Login' route
    navigation.getParent('RootStack').replace('Login');
  };
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Profile Screen (Tab 4)</Text>
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0E68C' }, // Khaki
  text: { fontSize: 20 },
});
export default Profile;