import React, { useState, useCallback } from 'react';
import { 
    View, Text, FlatList, StyleSheet, ActivityIndicator, 
    TouchableOpacity, RefreshControl, SafeAreaView, Alert,
    Platform,
    StatusBar
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../utils/api';
import { useTheme } from '../context/ThemeContext';
import { showMessage } from "react-native-flash-message";
import { PostItem } from '../components/PostItem';

// --- NEW REUSABLE COMPONENT for the tab switcher ---
const SegmentedControl = ({ activeTab, onSelect, colors }) => {
    const styles = getStyles(colors);
    return (
        <View style={styles.segmentedControlContainer}>
            <TouchableOpacity 
                style={[styles.segmentButton, activeTab === 'all' && styles.segmentButtonActive]}
                onPress={() => onSelect('all')}
            >
                <Text style={[styles.segmentButtonText, activeTab === 'all' && styles.segmentButtonTextActive]}>
                    All Posts
                </Text>
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.segmentButton, activeTab === 'my' && styles.segmentButtonActive]}
                onPress={() => onSelect('my')}
            >
                <Text style={[styles.segmentButtonText, activeTab === 'my' && styles.segmentButtonTextActive]}>
                    My Posts
                </Text>
            </TouchableOpacity>
        </View>
    );
};

export default function CommunityScreen() {
    const navigation = useNavigation();
    const { colors } = useTheme();
    const styles = getStyles(colors);

    const [posts, setPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all'); // State to manage which tab is selected

    // --- MODIFIED DATA FETCHING LOGIC ---
    const fetchData = async () => {
        try {
            let data;
            if (activeTab === 'all') {
                data = await api.getPosts();
            } else {
                data = await api.getMyPosts();
            }
            setPosts(data);
        } catch (err) {
            console.error(`Failed to fetch ${activeTab} posts`, err);
            Alert.alert("Error", `Could not fetch ${activeTab === 'all' ? 'community' : 'your'} posts.`);
        } finally {
            setIsLoading(false);
        }
    };

    // --- UPDATED useFocusEffect to re-fetch when tab changes ---
    useFocusEffect(useCallback(() => {
        setIsLoading(true);
        fetchData();
    }, [activeTab])); // Dependency array now includes activeTab
    
    const onRefresh = useCallback(() => {
        setIsLoading(true);
        fetchData();
    }, [activeTab]); // Also add activeTab here for refresh consistency

    // Handler functions remain the same as they operate on the `posts` state
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
            api.unlikePost(postId).catch(() => fetchData());
        } else {
            api.likePost(postId).catch(() => fetchData());
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
            api.unbookmarkPost(postId).catch(() => fetchData());
        } else {
            api.bookmarkPost(postId).catch(() => fetchData());
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
    
    const renderEmptyComponent = () => (
        <View style={styles.centerEmpty}>
            <Ionicons name={activeTab === 'all' ? "people-outline" : "reader-outline"} size={60} color={colors.textSecondary} />
            <Text style={styles.emptyText}>
                {activeTab === 'all' 
                    ? "No posts yet. Be the first to share!" 
                    : "You haven't created any posts yet."}
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.logoContainer}>
                    <Text style={styles.headerTitle}>Community</Text>
                </View>
                <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate('AddPost')}>
                    <Ionicons name="add" size={16} color="#FFFFFF"/>
                    <Text style={styles.createButtonText}>Create</Text>
                </TouchableOpacity>
            </View>

            <SegmentedControl activeTab={activeTab} onSelect={setActiveTab} colors={colors} />

            {isLoading ? (
                 <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
            ) : (
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
                    ListEmptyComponent={renderEmptyComponent}
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
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    centerEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: '30%', paddingHorizontal: 20 },
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
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text },
    createButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center'
    },
    createButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        marginLeft: 4,
    },
    segmentedControlContainer: {
        flexDirection: 'row',
        padding: 16,
        paddingTop: 16,
        paddingBottom: 8,
        backgroundColor: colors.background,
    },
    segmentButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    segmentButtonActive: {
        borderBottomColor: colors.primary,
    },
    segmentButtonText: {
        fontSize: 16,
        color: colors.textSecondary,
        fontWeight: '500'
    },
    segmentButtonTextActive: {
        color: colors.primary,
        fontWeight: 'bold',
    },
    list: { paddingHorizontal: 16, paddingTop: 8 },
    emptyText: { color: colors.textSecondary, marginTop: 16, fontSize: 16, textAlign: 'center' },
});