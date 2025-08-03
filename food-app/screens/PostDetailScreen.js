// fyp/food-app/screens/PostDetailScreen.js
import React, { useState, useCallback, useEffect } from "react";
import { 
    View, Text, Image, StyleSheet, SafeAreaView,
    ActivityIndicator, TextInput, TouchableOpacity, FlatList,
    KeyboardAvoidingView, Platform, Alert, Modal, Pressable,
    ScrollView 
} from "react-native";
import { useHeaderHeight } from '@react-navigation/elements';
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { api } from "../utils/api";
import { useTheme } from "../context/ThemeContext";
import { showMessage } from "react-native-flash-message";

dayjs.extend(relativeTime);

const CommentItem = ({ item, colors, onToggleLike, onReport, currentUserId, onDelete }) => {
    const styles = getStyles(colors);
    const isOwnComment = item.userID === currentUserId;
    const commenterInitial = item.first_name ? item.first_name[0].toUpperCase() : '?';

    return (
        <View style={styles.commentContainer}>
            <View style={styles.commentAvatarContainer}>
                {item.pfpUrl ? (
                    <Image source={{ uri: item.pfpUrl }} style={styles.commentAvatar} />
                ) : (
                    <Text style={styles.commentAvatarInitial}>{commenterInitial}</Text>
                )}
            </View>
            <View style={styles.commentContent}>
                <View style={styles.commentBubble}>
                    <View style={styles.commentUsernameContainer}>
                        <Text style={styles.commentUsername}>{item.first_name} {item.last_name}</Text>
                        {item.commenterIsHpVerified && (
                            <MaterialCommunityIcons
                                name="check-decagram"
                                size={14}
                                color="#3498db"
                                style={styles.verifiedBadge}
                            />
                        )}
                    </View>
                    <Text style={styles.commentText}>{item.commentText}</Text>
                </View>
                <View style={styles.commentFooter}>
                    <Text style={styles.commentDate}>{dayjs(item.createdAt).fromNow()}</Text>
                    
                    <TouchableOpacity style={styles.likeButton} onPress={onToggleLike}>
                        <Ionicons 
                            name={item.likedByUser ? "heart" : "heart-outline"}
                            size={16}
                            color={item.likedByUser ? colors.logoutText : colors.textSecondary}
                        />
                        <Text style={[styles.likeCount, { color: item.likedByUser ? colors.logoutText : colors.textSecondary }]}>
                            {item.likeCount > 0 ? item.likeCount : ''}
                        </Text>
                    </TouchableOpacity>

                    {isOwnComment ? (
                        <TouchableOpacity style={styles.flagButton} onPress={onDelete}>
                            <Ionicons name="trash-outline" size={14} color={colors.logoutText} />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.flagButton} onPress={onReport}>
                            <Ionicons name="flag-outline" size={14} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </View>
    );
};

const imageViewerStyles = StyleSheet.create({
    viewerContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    fullscreenImage: { width: '100%', height: '100%' },
    closeButton: { position: 'absolute', top: 50, right: 20, padding: 10, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20 }
});

const ImageViewer = ({ visible, imageUri, onClose }) => {
    if (!imageUri) return null;
    return (
        <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <SafeAreaView style={imageViewerStyles.viewerContainer}>
                <Image source={{ uri: imageUri }} style={imageViewerStyles.fullscreenImage} resizeMode="contain" />
                <TouchableOpacity style={imageViewerStyles.closeButton} onPress={onClose}>
                    <Ionicons name="close" size={32} color="#FFFFFF" />
                </TouchableOpacity>
            </SafeAreaView>
        </Modal>
    );
};

export default function PostDetailScreen() {
    const route = useRoute();
    const { postId } = route.params;
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const headerHeight = useHeaderHeight();

    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [isPostingComment, setIsPostingComment] = useState(false);
    const [viewerVisible, setViewerVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [showOptionsMenu, setShowOptionsMenu] = useState(false); 
    
    useEffect(() => {
        const fetchCurrentUser = async () => {
            try {
                const { user } = await api.getProfile();
                setCurrentUser(user);
            } catch (e) {
                console.error("Failed to fetch current user profile for comments");
            }
        };
        fetchCurrentUser();
    }, []);

    const handleDeletePost = () => {
        Alert.alert( "Delete Post", "Are you sure you want to permanently delete this post?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete", style: "destructive",
                    onPress: async () => {
                        setShowOptionsMenu(false);
                        try {
                            await api.deletePost(postId);
                            Alert.alert("Success", "Post deleted.");
                            navigation.goBack();
                        } catch (error) {
                            Alert.alert("Error", error.message || "Failed to delete post.");
                        }
                    },
                },
            ]
        );
    };

    const handleDeleteComment = (commentId) => {
        Alert.alert(
            "Delete Comment",
            "Are you sure you want to permanently delete this comment?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await api.deleteComment(commentId);
                            setComments(currentComments =>
                                currentComments.filter(comment => comment.id !== commentId)
                            );
                            fetchData(); 
                            showMessage({ message: "Comment deleted", type: "success" });
                        } catch (error) {
                            Alert.alert("Error", "Could not delete your comment.");
                        }
                    },
                },
            ]
        );
    };

    useEffect(() => {
        navigation.setOptions({
            headerStyle: { backgroundColor: colors.card }, headerTintColor: colors.text, title: 'Post',
        });
        if (post?.isOwner) {
            navigation.setOptions({
                headerRight: () => (
                    <TouchableOpacity onPress={() => setShowOptionsMenu(true)} style={{ padding: 5, marginRight: 10 }}>
                        <Ionicons name="ellipsis-vertical-outline" size={24} color={colors.textSecondary} />
                    </TouchableOpacity>
                ),
            });
        }
    }, [post, navigation, colors]);

    const fetchData = async () => {
        try {
            const [postDetails, postComments] = await Promise.all([
                api.getPostDetails(postId),
                api.getPostComments(postId)
            ]);
            setPost(postDetails);
            setComments(postComments);
        } catch (error) {
            console.error("Failed to fetch post details:", error);
            Alert.alert("Error", "Could not load post details.");
        } finally {
            setIsLoading(false);
        }
    };
    
    useFocusEffect(useCallback(() => {
        if (!isLoading) setIsLoading(true);
        fetchData();
    }, [postId]));
    
    const handleToggleLike = () => {
        if (!post) return;
        const wasLiked = post.likedByUser;
        setPost(p => ({ ...p, likedByUser: !wasLiked, likeCount: wasLiked ? p.likeCount - 1 : p.likeCount + 1 }));
        if (wasLiked) {
            api.unlikePost(postId).catch(() => fetchData());
        } else {
            api.likePost(postId).catch(() => fetchData());
        }
    };
    
    const handleAddComment = async () => {
        if (!newComment.trim()) return;
        setIsPostingComment(true);
        try {
            await api.addComment(postId, newComment.trim());
            setNewComment('');
            fetchData();
        } catch (error) {
            Alert.alert("Error", "Could not post your comment.");
        } finally {
            setIsPostingComment(false);
        }
    };
    
    const handleToggleCommentLike = (commentId, wasLiked) => {
        setComments(cs => cs.map(c => c.id === commentId ? { ...c, likedByUser: !wasLiked, likeCount: wasLiked ? c.likeCount - 1 : c.likeCount + 1 } : c));
        if (wasLiked) {
            api.unlikeComment(commentId).catch(() => fetchData());
        } else {
            api.likeComment(commentId).catch(() => fetchData());
        }
    };

    const handleReportComment = (commentId) => {
        Alert.alert( "Report Comment", "Are you sure you want to report this comment for review?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Report", style: "destructive",
                    onPress: async () => {
                        try {
                            const response = await api.reportComment(commentId);
                            showMessage({ message: response.message, type: "success", icon: "success" });
                        } catch (error) {
                            Alert.alert("Error", error.message || "Could not report this comment.");
                        }
                    },
                },
            ]
        );
    };

    const openImageViewer = (imageUri) => {
        setSelectedImage(imageUri);
        setViewerVisible(true);
    };

    const navigateToEditPost = () => {
        setShowOptionsMenu(false);
        navigation.navigate('EditPost', { post });
    };

    if (isLoading || !post || !currentUser) {
        return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
    }
    
    const postAuthorInitial = post.first_name ? post.first_name[0].toUpperCase() : '?';
    
    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                style={{flex: 1}}
                keyboardVerticalOffset={headerHeight}
            >
                <FlatList
                    data={comments}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <CommentItem 
                            item={item} 
                            colors={colors}
                            onToggleLike={() => handleToggleCommentLike(item.id, item.likedByUser)}
                            onReport={() => handleReportComment(item.id)}
                            currentUserId={currentUser.userID}
                            onDelete={() => handleDeleteComment(item.id)}
                        />
                    )}
                    ListHeaderComponent={
                        <View style={{paddingBottom: 16}}>
                            <View style={styles.cardHeader}>
                                <View style={styles.avatarContainer}>
                                    {post.pfpUrl ? (
                                        <Image source={{ uri: post.pfpUrl }} style={styles.avatar} />
                                    ) : (
                                        <Text style={styles.avatarInitial}>{postAuthorInitial}</Text>
                                    )}
                                </View>
                                <View>
                                    <View style={styles.usernameContainer}>
                                        <Text style={styles.username}>{post.first_name} {post.last_name}</Text>
                                        {post.authorIsHpVerified && (
                                            <MaterialCommunityIcons
                                                name="check-decagram"
                                                size={16}
                                                color="#3498db"
                                                style={styles.verifiedBadge}
                                            />
                                        )}
                                    </View>
                                    <Text style={styles.date}>{dayjs(post.createdAt).format("MMM DD, YYYY · HH:mm")}</Text>
                                </View>
                            </View>
                            <Text style={styles.title}>{post.title}</Text>
                            <Text style={styles.content}>{post.content}</Text>
                            
                            {post.images && post.images.length > 0 ? (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScrollContainer}>
                                    {post.images.map((img, idx) => (
                                        <TouchableOpacity key={idx} onPress={() => openImageViewer(img)}>
                                            <Image source={{ uri: img }} style={styles.image} />
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            ) : null}

                            <View style={styles.actionBar}>
                                <TouchableOpacity style={styles.actionButton} onPress={handleToggleLike}>
                                    <Ionicons name={post.likedByUser ? "heart" : "heart-outline"} size={24} color={post.likedByUser ? colors.logoutText : colors.textSecondary} />
                                    <Text style={[styles.actionText, { color: post.likedByUser ? colors.logoutText : colors.textSecondary }]}>{post.likeCount} Likes</Text>
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.commentsTitle}>Comments ({comments.length})</Text>
                        </View>
                    }
                    ListEmptyComponent={<Text style={styles.emptyCommentText}>No comments yet. Be the first to comment!</Text>}
                    contentContainerStyle={{ paddingHorizontal: 16 }}
                />
                
                <View style={[styles.commentInputContainer, { paddingBottom: insets.bottom || 12 }]}>
                    <TextInput
                        style={styles.commentInput}
                        placeholder="Add a comment..."
                        placeholderTextColor={colors.textSecondary}
                        value={newComment}
                        onChangeText={setNewComment}
                    />
                    <TouchableOpacity onPress={handleAddComment} disabled={isPostingComment} style={styles.sendButton}>
                        {isPostingComment ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="send" size={24} color={colors.primary} />}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
            
            <ImageViewer visible={viewerVisible} imageUri={selectedImage} onClose={() => setViewerVisible(false)} />

            <Modal
                transparent={true}
                animationType="fade"
                visible={showOptionsMenu}
                onRequestClose={() => setShowOptionsMenu(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowOptionsMenu(false)}>
                    <View style={[styles.optionsMenu, { top: Platform.OS === 'ios' ? 90 : 50, right: 20 }]}>
                        <TouchableOpacity style={styles.menuItem} onPress={navigateToEditPost}>
                            <Ionicons name="pencil-outline" size={20} color={colors.text} style={styles.menuItemIcon} />
                            <Text style={styles.menuItemText}>Edit Post</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem} onPress={handleDeletePost}>
                            <Ionicons name="trash-outline" size={20} color={colors.logoutText} style={styles.menuItemIcon} />
                            <Text style={[styles.menuItemText, { color: colors.logoutText }]}>Delete Post</Text>
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingTop: 16 },
    avatar: { width: 50, height: 50, borderRadius: 25 },
    avatarContainer: { 
        width: 50, height: 50, borderRadius: 25, 
        marginRight: 12, backgroundColor: colors.border,
        justifyContent: 'center', alignItems: 'center' 
    },
    avatarInitial: {
        fontSize: 22, color: colors.primary, fontWeight: 'bold'
    },
    usernameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    username: { fontWeight: 'bold', fontSize: 16, color: colors.text },
    verifiedBadge: {
        marginLeft: 5,
    },
    date: { fontSize: 12, color: colors.textSecondary },
    title: { fontSize: 24, fontWeight: "bold", marginBottom: 8, color: colors.text },
    content: { fontSize: 16, color: colors.text, lineHeight: 24 },
    imageScrollContainer: { marginTop: 16 },
    image: { width: 250, height: 250, marginRight: 10, borderRadius: 12, backgroundColor: colors.border },
    actionBar: { flexDirection: 'row', paddingVertical: 12, marginTop: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
    actionButton: { flexDirection: 'row', alignItems: 'center' },
    actionText: { marginLeft: 8, fontSize: 14, fontWeight: '600' },
    commentsTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 24, marginBottom: 8, color: colors.text },
    emptyCommentText: { textAlign: 'center', color: colors.textSecondary, marginTop: 20 },
    commentContainer: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-start' },
    commentAvatar: { width: 36, height: 36, borderRadius: 18 },
    commentAvatarContainer: { 
        width: 36, height: 36, borderRadius: 18, 
        marginRight: 12, backgroundColor: colors.border,
        justifyContent: 'center', alignItems: 'center'
    },
    commentAvatarInitial: {
        fontSize: 16, color: colors.primary, fontWeight: 'bold'
    },
    commentContent: { flex: 1 },
    commentBubble: { flex: 1, backgroundColor: colors.card, padding: 12, borderRadius: 12 },
    commentUsernameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    commentUsername: { fontWeight: 'bold', color: colors.text, fontSize: 13 },
    commentText: { color: colors.text, lineHeight: 20 },
    commentFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 6, paddingLeft: 4 },
    commentDate: { fontSize: 11, color: colors.textSecondary },
    likeButton: { flexDirection: 'row', alignItems: 'center', marginLeft: 16, paddingVertical: 4 },
    likeCount: { fontSize: 12, marginLeft: 4, fontWeight: '600' },
    flagButton: { marginLeft: 'auto', padding: 6 },
    commentInputContainer: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card },
    commentInput: { flex: 1, backgroundColor: colors.background, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 16, color: colors.text, marginRight: 12 },
    sendButton: { padding: 4, justifyContent: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
    optionsMenu: { position: 'absolute', backgroundColor: colors.card, borderRadius: 8, paddingVertical: 5, right: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 5, elevation: 6, minWidth: 150 },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 15 },
    menuItemIcon: { marginRight: 10 },
    menuItemText: { fontSize: 16, color: colors.text },
});