// screens/Community.js
import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Adjust these if you change your tab bar or FAB sizes
const TAB_BAR_HEIGHT = 85;
const FAB_SIZE = 56;

// Sample data as plain JavaScript array
const sampleData = [
  {
    id: '1',
    user: { name: 'Jane Doe', avatar: 'https://i.pravatar.cc/100?img=12' },
    time: '2h ago',
    content:
      'Just tried this avocado-chia pudding for breakfast—only 8g net carbs and full of healthy fats! 🥑✨',
    image:
      'https://www.australianavocados.com.au/wp-content/uploads/2021/12/Avocado-Chia-Pudding-1.png',
    likes: 24,
    comments: 5,
  },
  {
    id: '2',
    user: { name: 'Coach Mia Tan', avatar: 'https://i.pravatar.cc/100?img=47', isProvider: true },
    time: '4h ago',
    content:
      '💪 Just wrapped up a morning “Move with Mia” fitness session focused on improving insulin sensitivity for Type 2 diabetics! Exercise is medicine—stay active, stay empowered. 🏃‍♀️💙',
    image:
      'https://www.fitnessgymyoga.com/wp-content/uploads/2018/01/group-fitness-outside-11301699txjzd-new-mother-nature-s-gym-of-group-fitness-outside-286596r-16991130.jpg',
    likes: 118,
    comments: 40,
  },
];

const { width } = Dimensions.get('window');

export default function CommunityScreen() {
  const [posts] = useState(sampleData);
  const insets = useSafeAreaInsets();
  const [liked, setLiked] = useState({});
  const [flagged, setFlagged] = useState({});
  const navigation = useNavigation();

  const toggleLike = (postId) => {
    setLiked(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const toggleFlag = (postId) => {
    setFlagged(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  /** @param {{ item: CommunityPost }} param0 */
  const renderPost = ({ item }) => {
    const isLiked = liked[item.id];
    const isFlagged = flagged[item.id];
    return(
    <View style={styles.card}>
      {/* Header with user info and flag icon */}
      <View style={styles.communityHeader}>
        <View style={styles.userInfo}>
          <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
          <View>
            <View style={styles.nameRow}>
              <Text style={styles.username}>{item.user.name}</Text>
              {item.user.isProvider && (
                <MaterialCommunityIcons
                  name="check-decagram"
                  size={16}
                  color="#007AFF"
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>
            <Text style={styles.time}>{item.time}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => toggleFlag(item.id)}>
          <Ionicons name={isFlagged ? "flag" : "flag-outline"} size={20} color={isFlagged ? "red" : "grey"}/>
        </TouchableOpacity>
      </View>

      {/* Post content */}
      <Text style={styles.content}>{item.content}</Text>

      {/* Post image if available */}
      {item.image && (
        <Image source={{ uri: item.image }} style={styles.postImage} resizeMode="cover" />
      )}

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => toggleLike(item.id)}
        >
          <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={20} color={isLiked ? 'red' : 'gray'} />
          <Text style={styles.actionTxt}>{item.likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => alert('Comments on post ' + item.id)}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#555" />
          <Text style={styles.actionTxt}>{item.comments}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => alert('Share post ' + item.id)}
        >
          <Ionicons name="share-social-outline" size={20} color="#555" />
          <Text style={styles.actionTxt}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>GlucoBites</Text>
      </View>
      <View style={styles.screen}><Text>Community</Text></View>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 16,
        }}
      />

      {/* Floating action button */}
      <TouchableOpacity
        style={[
          { bottom: insets.bottom + 90, left:250 },
        ]}
        onPress={() => navigation.navigate('AddPost')}
      >
        <View style={{backgroundColor:'#f78161',
          width:120,
          height:45,
          borderRadius:30,
          alignItems:'center',
          justifyContent:'center',
          flexDirection:'row',
          }}>
        <MaterialCommunityIcons name="square-edit-outline" 
          size={35} 
          color="white" 
          
          />
          <Text style={styles.fabText}> Add Post</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
    screen: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    container: { 
        flex: 1, 
        backgroundColor: '#f2f2f7' 
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 1 },
        elevation: 2,
        overflow: 'hidden',
    },
    communityHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
    },
    userInfo: { 
        flexDirection: 'row', 
        alignItems: 'center' 
    },
    nameRow: { 
        flexDirection: 'row', 
        alignItems: 'center' 
    },
    avatar: { width: 36, 
        height: 36, 
        borderRadius: 18, 
        marginRight: 8 
    },
    username: { 
        fontWeight: '600', 
        fontSize: 14 
    },
    time: { 
        color: '#666', 
        fontSize: 12 
    },
    content: { 
        paddingHorizontal: 12, 
        paddingBottom: 8, 
        fontSize: 15, 
        lineHeight: 22 
    },
    postImage: {
        width: '100%',
        aspectRatio: 16 / 9,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        padding: 12,
    },
    actionBtn: { 
        flexDirection: 'row', 
        alignItems: 'center' 
    },
    actionTxt: { 
        marginLeft: 6, 
        fontSize: 14, 
        color: '#555' 
    },
    fabText: {
        marginLeft: 0,  // Space between icon and text
        color: 'white',  // Text color inside the FAB
        fontSize: 14,  // Font size for the text
        fontWeight: 'bold',  // Make the text bold
    },
});