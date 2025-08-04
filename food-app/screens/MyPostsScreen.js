// fyp/food-app/screens/MyPostsScreen.js

import React, { useState, useCallback } from 'react';
import {
    View, Text, FlatList, StyleSheet, SafeAreaView,
    ActivityIndicator, RefreshControl, Alert, Platform, StatusBar
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../utils/api';
import { useTheme } from '../context/ThemeContext';
import { PostItem } from '../components/PostItem'; 
import { showMessage } from "react-native-flash-message";

export default function MyPostsScreen() {
    const navigation = useNavigation();
    const { colors } = useTheme();
    const styles = getStyles(colors);

    const [myPosts, setMyPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useFocusEffect(
      useCallback(() => {
        const fetchMyPosts = async () => {
            if (!isRefreshing) setIsLoading(true);
            try {
                // Use the new API endpoint
                const data = await api.getMyPosts();
                setMyPosts(data);
            } catch (err) {
                Alert.alert("Error", "Could not load your posts.");
            } finally {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        };

        fetchMyPosts();
      }, [isRefreshing])
    );
    
    const onRefresh = useCallback(() => {
        setIsRefreshing(true);
    }, []);

    const handleToggleLike = (postId, wasLiked) => {
        setMyPosts(currentPosts => 
            currentPosts.map(post => {
                if (post.id === postId) {
                    return { ...post, likedByUser: !wasLiked, likeCount: wasLiked ? post.likeCount - 1 : post.likeCount + 1 };
                }
                return post;
            })
        );
        if (wasLiked) {
            api.unlikePost(postId).catch(() => onRefresh());
        } else {
            api.likePost(postId).catch(() => onRefresh());
        }
    };
    
    const handleToggleBookmark = (postId, wasBookmarked) => {
        setMyPosts(currentPosts => 
            currentPosts.map(post => {
                if (post.id === postId) {
                    return { ...post, bookmarkedByUser: !wasBookmarked };
                }
                return post;
            })
        );
        if (wasBookmarked) {
            api.unbookmarkPost(postId).catch(() => onRefresh());
        } else {
            api.bookmarkPost(postId).catch(() => onRefresh());
        }
    };
    
    const handleReportPost = async (postId) => {
        try {
            const response = await api.reportPost(postId);
            showMessage({ message: response.message, type: 'success', icon: 'success' });
        } catch (error) {
            Alert.alert("Error", error.message || "Could not report this post.");
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {isLoading && !isRefreshing ? (
                 <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
            ) : (
                <FlatList
                    data={myPosts}
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
                    refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
                    ListEmptyComponent={
                        <View style={styles.centerEmpty}>
                            <Ionicons name="reader-outline" size={60} color={colors.textSecondary} />
                            <Text style={styles.emptyText}>You haven't created any posts yet.</Text>
                            <Text style={styles.emptySubtext}>Go to the Community tab and tap "Create Post" to share something with others.</Text>
                        </View>
                    }
                />
            )}
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
    centerEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: '30%', paddingHorizontal: 20 },
    list: { padding: 16 },
    emptyText: { marginTop: 16, fontSize: 18, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' },
    emptySubtext: { marginTop: 8, color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
});