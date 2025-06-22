import { View, Text, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function SummaryCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Calories</Text>
      <Text style={styles.formula}>Remaining = Goal - Food + Exercise</Text>

      <View style={styles.circleWrapper}>
        {/* Central Circle */}
        <View style={styles.circle}>
          <Text style={styles.mainValue}>2,100</Text>
          <Text style={styles.unit}>Remaining</Text>
        </View>

        {/* Side Details */}
        <View style={styles.details}>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="flag-checkered" size={20} color="#66BB6A"/>
            <Text style={styles.detailText}>Base Goal: 2,100</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="restaurant-outline" size={20} color="#42A5F5"/>
            <Text style={styles.detailText}>Food: 0</Text>
          </View>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="spoon-sugar" size={25} color="#42A5F5"/>
            <Text style={styles.detailText}>Sugar: 0</Text>
          </View>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="fire" size={23} color="#FFA726"/>
            <Text style={styles.detailText}>Exercise: 0</Text>
          </View>
        </View>
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
    shadowRadius: 6,
    elevation: 4,
  },
  title: {
    color: '#1E1E2D', // dark text
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  formula: {
    color: '#555', // soft dark grey
    fontSize: 13,
    marginBottom: 16,
  },
  circleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 5,
    borderColor: '#3D88F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#E0E0E0', // slightly darker grey for contrast
  },
  mainValue: {
    color: '#1E1E2D',
    fontSize: 24,
    fontWeight: 'bold',
  },
  unit: {
    color: '#333',
    fontSize: 12,
  },
  details: {
    justifyContent: 'center',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    color: '#1E1E2D',
    marginLeft: 8,
    fontSize: 14,
  },
});
