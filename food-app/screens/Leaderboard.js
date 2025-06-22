// screens/Leaderboard.js
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function LeaderboardScreen() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetch('https://randomuser.me/api/?results=20')
      .then((response) => response.json())
      .then((data) => {
        /** @type {User[]} */
        const formattedUsers = data.results.map((user, index) => {
          const first = user.name.first;
          const last = user.name.last;
          return {
            id: index + 1,
            name: `${first} ${last}`,
            avatar: user.picture.medium,
            calories: Math.floor(Math.random() * 1500) + 800,
          };
        });

        const yourCalories = Math.floor(Math.random() * 3000) + 1500;
        const you = {
          id: 999,
          name: 'You',
          avatar: data.results[12]?.picture.medium || '', // fallback if undefined
          calories: yourCalories,
        };

        formattedUsers.push(you);
        // Sort descending by calories
        formattedUsers.sort((a, b) => b.calories - a.calories);

        let topTen = formattedUsers.slice(0, 10);
        const youIndex = topTen.findIndex((user) => user.name === 'You');

        if (youIndex > 2) {
          // Move "You" to position 3 (index 2)
          const youUser = topTen.splice(youIndex, 1)[0];
          topTen.splice(2, 0, youUser);
        } else if (youIndex === -1) {
          // If "You" not in top 10, replace 3rd position
          topTen.splice(2, 1, you);
        }

        // Re-rank top ten with new IDs
        const rankedTopTen = topTen.map((user, index) => ({
          ...user,
          id: index + 1,
        }));

        setUsers(rankedTopTen);
      })
      .catch((error) => console.error('Error fetching users:', error));
  }, []);

  /** @param {{ item: User }} param0 */
  const renderItem = ({ item }) => (
    <View
      style={[
        styles.listItem,
        item.name === 'You' && styles.youRowFull, // Apply special style for 'You'
      ]}
    >
      <View style={styles.rankCol}>
        <Text style={[styles.rankText, item.name === 'You' && styles.youText]}>{item.id}</Text>
        {item.id === 1 && (
          <MaterialCommunityIcons
            name="crown"
            size={18}
            color="#FFD700"
            style={{ marginTop: 4 }}
          />
        )}
      </View>
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      <Text style={[styles.name, item.name === 'You' && styles.youText]}>{item.name}</Text>
      <View style={styles.caloriesBox}>
        <Text style={styles.caloriesText}>{item.calories} kcal</Text>
      </View>
    </View>
  );

  return (
    
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏆 Calories Leaderboard</Text>
      </View>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        //paddingTop: 40,
        //paddingHorizontal: 20,
        marginBottom:90,
    },
    header: {
        height: 100,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        zIndex: 100,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#313F43',
        marginTop:50,
    },
    titleBox: {
        backgroundColor: '#f2f2f2',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 1 },
        elevation: 1,
    },
    titleText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 12,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        borderRadius: 12,
        //marginBottom: 8,
        marginLeft:10,
        marginRight:10,
        marginTop:8,
    },
    youRowFull: {
        backgroundColor: '#f6fff6', // Same background color as before
        borderRadius: 12,
        //marginBottom: 8, // Keep consistent marginBottom
    },
    youText: {
        fontSize:20,
        fontWeight: 'bold',
        color:'orange',
    },
    rankCol: {
        width: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rankText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
    },
    avatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        marginHorizontal: 12,
    },
    name: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        color: '#000',
    },
    caloriesBox: {
        backgroundColor: '#e0f0ff',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    caloriesText: {
        fontWeight: 'bold',
        color: '#007AFF',
        fontSize: 15,
    },
});