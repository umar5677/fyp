import React, { useState, useCallback } from 'react';
import {
    View, Text, FlatList, StyleSheet, SafeAreaView,
    ActivityIndicator, RefreshControl, Alert, Platform, StatusBar, TouchableOpacity
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../utils/api';
import { useTheme } from '../context/ThemeContext';
import { PostItem } from '../components/PostItem'; 
import { showMessage } from "react-native-flash-message";

export default function BookmarkedPostsScreen() {
    const navigation = useNavigation();
    const { colors } = useTheme();
    const styles = getStyles(colors);

    const [bookmarkedPosts, setBookmarkedPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useFocusEffect(
      useCallback(() => {
        // The async function is defined inside the callback
        const fetchBookmarked = async () => {
            if (!isRefreshing) {
                setIsLoading(true);
            }
            try {
                const data = await api.getBookmarkedPosts();
                setBookmarkedPosts(data);
            } catch (err) {
                Alert.alert("Error", "Could not load your bookmarked posts.");
            } finally {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        };

        // Call the async function immediately
        fetchBookmarked();
      }, [isRefreshing])
    );
    
    const onRefresh = useCallback(() => {
        setIsRefreshing(true);
    }, []);

    const handleToggleLike = (postId, wasLiked) => {
        setBookmarkedPosts(currentPosts => 
            currentPosts.map(post => {
                if (post.id === postId) {
                    return { ...post, likedByUser: !wasLiked, likeCount: wasLiked ? post.likeCount - 1 : post.likeCount + 1 };
                }
                return post;
            })
        );
        // API call to sync the change with the server
        if (wasLiked) {
            api.unlikePost(postId).catch(() => onRefresh());
        } else {
            api.likePost(postId).catch(() => onRefresh());
        }
    };
    
    const handleToggleBookmark = (postId, wasBookmarked) => {
        if (wasBookmarked) {
            setBookmarkedPosts(currentPosts => currentPosts.filter(p => p.id !== postId));
            api.unbookmarkPost(postId).catch(() => onRefresh()); // On error, refresh to sync state
        } else {
             api.bookmarkPost(postId).catch(() => onRefresh());
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

    return (
        <SafeAreaView style={styles.container}>
             {/* <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={28} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.title}>My Bookmarks</Text>
                <View style={styles.backButton} />
            </View> */}

            {isLoading && !isRefreshing ? (
                 <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
            ) : (
                <FlatList
                    data={bookmarkedPosts}
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
                            <Ionicons name="bookmark-outline" size={60} color={colors.textSecondary} />
                            <Text style={styles.emptyText}>You haven't bookmarked any posts yet.</Text>
                            <Text style={styles.emptySubtext}>Tap the bookmark icon on a post in the community feed to save it here.</Text>
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
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1,
        borderBottomColor: colors.border, backgroundColor: colors.card,
    },
    backButton: { width: 40 },
    title: { fontSize: 20, fontWeight: 'bold', color: colors.text },
    emptyText: { marginTop: 16, fontSize: 18, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' },
    emptySubtext: { marginTop: 8, color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
});