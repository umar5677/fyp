// fyp/food-app/screens/Community.js
import React, { useState, useCallback } from 'react';
import { 
    View, Text, Image, FlatList, StyleSheet, ActivityIndicator, 
    TouchableOpacity, RefreshControl, SafeAreaView 
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { api } from '../utils/api';
import { useTheme } from '../context/ThemeContext';

const PostItem = ({ item, onToggleLike, navigation, colors }) => {
    const styles = getStyles(colors);
    const [isBookmarked, setIsBookmarked] = useState(false);

    return (
        <View style={styles.card}>
            {/* --- Card Header --- */}
            <View style={styles.cardHeader}>
                <Image source={{ uri: item.pfpUrl || `https://i.pravatar.cc/100?u=${item.userID}` }} style={styles.avatar} />
                <View style={styles.userInfo}>
                    <Text style={styles.username}>{item.first_name} {item.last_name}</Text>
                    {/* --- THIS IS THE FIX --- */}
                    <Text style={styles.date}>{dayjs(item.createdAt).format("MMM DD, YYYY · h:mm A")}</Text>
                </View>
                <TouchableOpacity onPress={() => setIsBookmarked(!isBookmarked)}>
                    <Ionicons name={isBookmarked ? "bookmark" : "bookmark-outline"} size={22} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* --- Card Content --- */}
            <TouchableOpacity onPress={() => navigation.navigate("PostDetail", { postId: item.id })}>
                <Text style={styles.content}>{item.content}</Text>
                {item.images && item.images.length > 0 && (
                    <Image source={{ uri: item.images[0] }} style={styles.postImage} />
                )}
            </TouchableOpacity>
            
            {/* --- Action Bar (Likes, Comments) --- */}
            <View style={styles.actionBar}>
                <TouchableOpacity style={styles.actionButton} onPress={() => onToggleLike(item.id, item.likedByUser)}>
                    <Ionicons name={item.likedByUser ? "heart" : "heart-outline"} size={26} color={item.likedByUser ? '#EF4444' : colors.textSecondary} />
                    <Text style={[styles.actionText, { color: item.likedByUser ? '#EF4444' : colors.textSecondary }]}>
                        {item.likeCount}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate("PostDetail", { postId: item.id })}>
                    <Ionicons name={"chatbubble-outline"} size={24} color={colors.textSecondary} />
                    <Text style={[styles.actionText, { color: colors.textSecondary }]}>
                        {item.commentCount}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default function CommunityScreen() {
    const navigation = useNavigation();
    const { colors } = useTheme();
    const styles = getStyles(colors);

    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchPosts = async () => {
        try {
            const data = await api.getPosts();
            setPosts(data);
        } catch (err) {
            console.error("Failed to fetch posts", err);
        } finally {
            setIsLoading(false);
        }
    };

    useFocusEffect(useCallback(() => {
        setIsLoading(true);
        fetchPosts();
    }, []));
    
    const onRefresh = useCallback(() => {
        fetchPosts();
    }, []);

    const handleToggleLike = (postId, wasLiked) => {
        setPosts(currentPosts => 
            currentPosts.map(post => {
                if (post.id === postId) {
                    return { ...post, likedByUser: !wasLiked, likeCount: wasLiked ? post.likeCount - 1 : post.likeCount + 1, };
                }
                return post;
            })
        );
        if (wasLiked) {
            api.unlikePost(postId).catch(() => fetchPosts());
        } else {
            api.likePost(postId).catch(() => fetchPosts());
        }
    };

    if (isLoading) {
        return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.logoContainer}>
                    <View style={styles.logoIcon} />
                    <Text style={styles.headerTitle}>GlucoBites</Text>
                </View>
                <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate('AddPost')}>
                    <Ionicons name="add" size={16} color="#FFFFFF"/>
                    <Text style={styles.createButtonText}>Create Post</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                data={posts}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => <PostItem item={item} onToggleLike={handleToggleLike} navigation={navigation} colors={colors} />}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary}/>}
                ListEmptyComponent={
                    <View style={styles.centerEmpty}>
                        <Ionicons name="people-outline" size={60} color={colors.textSecondary} />
                        <Text style={styles.emptyText}>No posts yet. Be the first to share!</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    centerEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 150 },
    header: { 
        paddingVertical: 12, 
        paddingHorizontal: 16, 
        borderBottomWidth: 1, 
        borderBottomColor: colors.border, 
        backgroundColor: colors.card,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    logoIcon: {
        width: 12,
        height: 12,
        borderRadius: 3,
        backgroundColor: colors.primary,
        marginRight: 8,
    },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text },
    createButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center'
    },
    createButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        marginLeft: 4,
    },
    list: { paddingVertical: 16 },
    card: { backgroundColor: colors.card, marginBottom: 16, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16 },
    avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12, backgroundColor: colors.border },
    userInfo: { flex: 1 },
    username: { fontWeight: 'bold', color: colors.text, fontSize: 16 },
    date: { fontSize: 12, color: colors.textSecondary },
    content: { fontSize: 15, color: colors.text, lineHeight: 22, paddingHorizontal: 16, marginVertical: 8 },
    postImage: { width: '`100%`', height: 250, backgroundColor: colors.border, marginTop: 4 },
    emptyText: { color: colors.textSecondary, marginTop: 16, fontSize: 16 },
    actionBar: { 
        flexDirection: 'row', 
        justifyContent: 'space-around',
        paddingVertical: 12, 
        borderTopWidth: 1, 
        borderTopColor: colors.border,
    },
    actionButton: { 
        flexDirection: 'row', 
        alignItems: 'center',
    },
    actionText: { 
        marginLeft: 8, 
        fontSize: 14, 
        fontWeight: '600',
    }
});