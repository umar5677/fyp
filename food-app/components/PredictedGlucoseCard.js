import { View, Text, StyleSheet } from 'react-native';

export default function PredictedGlucoseCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Today's Predicted Glucose</Text>
      <Text style={styles.subtitle}>Based on recent patterns</Text>
      <View style={styles.predictionBox}>
        <Text style={styles.predictedValue}>230 mg/dL</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
    card: {
      backgroundColor: '#EAFBF0',
      borderRadius: 12,
      padding: 20,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    title: {
      color: '#1E1E2D', // better contrast than white
      fontSize: 18,
      fontWeight: '600',
    },
    subtitle: {
      color: '#555', // soft dark gray
      fontSize: 14,
      marginVertical: 8,
    },
    predictionBox: {
      backgroundColor: '#E8F0FE',
      padding: 27,
      borderRadius: 12,
      marginTop: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#F0E8D9', // soft outline to give it structure
    },
    predictedValue: {
      fontSize: 24,
      color: '#42A5F5', // accent blue
      fontWeight: 'bold',
    },
  });
