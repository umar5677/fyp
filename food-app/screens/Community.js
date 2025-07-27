import React, { useState, useCallback } from 'react';
import { 
    View, Text, FlatList, StyleSheet, ActivityIndicator, 
    TouchableOpacity, RefreshControl, SafeAreaView, Alert,
    Platform,
    StatusBar
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { api } from '../utils/api';
import { useTheme } from '../context/ThemeContext';
import { showMessage } from "react-native-flash-message";
import { PostItem } from '../components/PostItem';

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
            Alert.alert("Error", "Could not fetch community posts.");
        } finally {
            setIsLoading(false);
        }
    };

    useFocusEffect(useCallback(() => {
        if (!isLoading) setIsLoading(true);
        fetchPosts();
    }, []));
    
    const onRefresh = useCallback(() => {
        setIsLoading(true);
        fetchPosts();
    }, []);

    const handleToggleLike = (postId, wasLiked) => {
        setPosts(currentPosts => 
            currentPosts.map(post => {
                if (post.id === postId) {
                    return { ...post, likedByUser: !wasLiked, likeCount: wasLiked ? post.likeCount - 1 : post.likeCount + 1 };
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

    const handleToggleBookmark = (postId, wasBookmarked) => {
        setPosts(currentPosts => 
            currentPosts.map(post => {
                if (post.id === postId) {
                    return { ...post, bookmarkedByUser: !wasBookmarked };
                }
                return post;
            })
        );
        if (wasBookmarked) {
            api.unbookmarkPost(postId).catch(() => fetchPosts());
        } else {
            api.bookmarkPost(postId).catch(() => fetchPosts());
        }
    };

    const handleReportPost = async (postId) => {
        try {
            const response = await api.reportPost(postId);
            showMessage({
                message: response.message,
                type: 'success',
                icon: 'success'
            });
        } catch (error) {
            Alert.alert("Error", error.message || "Could not report this post.");
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
                    <Text style={styles.headerTitle}>Community</Text>
                </View>
                <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate('AddPost')}>
                    <Ionicons name="add" size={16} color="#FFFFFF"/>
                    <Text style={styles.createButtonText}>Create Post</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                data={posts}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <PostItem 
                        item={item} 
                        onToggleLike={handleToggleLike} 
                        onToggleBookmark={handleToggleBookmark} 
                        onReport={handleReportPost} 
                        navigation={navigation} 
                    />
                )}
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
    container: { 
        flex: 1, 
        backgroundColor: colors.background,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
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
    emptyText: { color: colors.textSecondary, marginTop: 16, fontSize: 16 },
});