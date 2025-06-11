// screens/LogBloodSugarScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // For the edit icon

// --- Simulate fetching and saving data ---
// In a real app, these would be API calls
const fetchCurrentBloodSugar = async () => {
  return new Promise(resolve => setTimeout(() => resolve(110), 500)); // Simulate API delay, returns 110 mg/dL
};

const saveBloodSugarLog = async (value) => {
  console.log('Saving blood sugar:', value);
  return new Promise(resolve => setTimeout(() => resolve({ success: true, message: 'Blood sugar logged!' }), 1000));
};
// --- End Simulation ---

const LogBloodSugarScreen = ({ navigation }) => {
  const [currentReading, setCurrentReading] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [isEditing, setIsEditing] = useState(false); // Start in non-editing mode if displaying current
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingCurrent, setIsFetchingCurrent] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsFetchingCurrent(true);
      const fetchedReading = await fetchCurrentBloodSugar();
      setCurrentReading(fetchedReading);
      setInputValue(String(fetchedReading)); // Pre-fill input with current reading
      setIsFetchingCurrent(false);
      // setIsEditing(false); // Initially, just display, don't allow edit until "Edit" is pressed
    };
    loadData();
  }, []);

  const handleEditPress = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    const numericValue = parseFloat(inputValue);
    if (isNaN(numericValue) || numericValue <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid blood sugar value.');
      return;
    }
    setIsLoading(true);
    const result = await saveBloodSugarLog(numericValue);
    setIsLoading(false);
    if (result.success) {
      Alert.alert('Success', result.message);
      setCurrentReading(numericValue); // Update displayed current reading
      setIsEditing(false); // Exit editing mode
      // Optionally navigate back or refresh data elsewhere
      // navigation.goBack();
    } else {
      Alert.alert('Error', result.message || 'Failed to save data.');
    }
  };

  if (isFetchingCurrent) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text>Loading current blood sugar...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Log Blood Sugar</Text>

      <View style={styles.currentReadingContainer}>
        <Text style={styles.currentReadingLabel}>Last Reading:</Text>
        <Text style={styles.currentReadingValue}>
          {currentReading !== null ? `${currentReading} mg/dL` : 'N/A'}
        </Text>
        {!isEditing && currentReading !== null && (
          <TouchableOpacity onPress={handleEditPress} style={styles.editButtonIcon}>
            <Ionicons name="pencil" size={24} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>

      {isEditing || currentReading === null ? ( // Show input if editing or no current reading
        <>
          <Text style={styles.label}>Enter New Blood Sugar (mg/dL):</Text>
          <TextInput
            style={styles.input}
            value={inputValue}
            onChangeText={setInputValue}
            placeholder="e.g., 120"
            keyboardType="numeric"
            returnKeyType="done"
            editable={isEditing || currentReading === null} // Make editable based on state
          />
          <View style={styles.buttonContainer}>
            <Button
              title={isLoading ? 'Saving...' : 'Save Log'}
              onPress={handleSave}
              disabled={isLoading || !inputValue}
              color="#007AFF"
            />
            {isEditing && currentReading !== null && ( // Show cancel if was editing an existing value
                 <Button
                    title="Cancel Edit"
                    onPress={() => {
                        setIsEditing(false);
                        setInputValue(String(currentReading)); // Reset input
                    }}
                    color="#FF3B30"
                 />
            )}
          </View>
        </>
      ) : (
        <View style={styles.buttonContainer}>
          <Button title="Log New Reading" onPress={handleEditPress} color="#007AFF" />
        </View>
      )}

      {/* Close button if presented as modal */}
      <View style={styles.closeButtonContainer}>
        <Button title="Close" onPress={() => navigation.goBack()} color="#8E8E93"/>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F8F8F8',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  currentReadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  currentReadingLabel: {
    fontSize: 18,
    color: '#555',
    marginRight: 10,
  },
  currentReadingValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    flex: 1, // Take remaining space
  },
  editButtonIcon: {
    padding: 5,
  },
  label: {
    fontSize: 16,
    color: '#444',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#B0C4DE',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 18,
    marginBottom: 20,
    color: '#333',
  },
  buttonContainer: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-around', // For Save and Cancel
  },
  closeButtonContainer: {
    marginTop: 'auto', // Push to bottom
    marginBottom: 20,
  }
});

export default LogBloodSugarScreen;