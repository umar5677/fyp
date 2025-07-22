// fyp/food-app/screens/PostDetailScreen.js
import React, { useState, useCallback, useEffect } from "react";
import { 
    View, Text, Image, StyleSheet, ScrollView, SafeAreaView,
    ActivityIndicator, TextInput, TouchableOpacity, FlatList,
    KeyboardAvoidingView, Platform, Alert, Modal
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import dayjs from "dayjs";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../utils/api";
import { useTheme } from "../context/ThemeContext";

const CommentItem = ({ item, colors }) => {
    const styles = getStyles(colors);
    return (
        <View style={styles.commentContainer}>
            <Image source={{ uri: item.pfpUrl || `https://i.pravatar.cc/100?u=${item.userID}` }} style={styles.commentAvatar} />
            <View style={styles.commentBubble}>
                <Text style={styles.commentUsername}>{item.first_name} {item.last_name}</Text>
                <Text style={styles.commentText}>{item.commentText}</Text>
                <Text style={styles.commentDate}>{dayjs(item.createdAt).format("MMM DD, YYYY")}</Text>
            </View>
        </View>
    );
};

const ImageViewer = ({ visible, imageUri, onClose }) => {
    if (!imageUri) return null;
    return (
        <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
            <SafeAreaView style={styles.viewerContainer}>
                <Image source={{ uri: imageUri }} style={styles.fullscreenImage} resizeMode="contain" />
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <Ionicons name="close" size={32} color="#FFFFFF" />
                </TouchableOpacity>
            </SafeAreaView>
        </Modal>
    );
};


export default function PostDetailScreen({ route }) {
    const { postId } = route.params;
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const navigation = useNavigation();

    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newComment, setNewComment] = useState('');
    const [isPostingComment, setIsPostingComment] = useState(false);
    const [viewerVisible, setViewerVisible] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);

    useEffect(() => {
        navigation.setOptions({
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            title: 'Post',
        });
    }, [colors, navigation]);

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
        setIsLoading(true);
        fetchData();
    }, [postId]));

    const handleToggleLike = () => {
        if (!post) return;
        const wasLiked = post.likedByUser;
        setPost(currentPost => ({
            ...currentPost,
            likedByUser: !wasLiked,
            likeCount: wasLiked ? currentPost.likeCount - 1 : currentPost.likeCount + 1,
        }));
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
            const updatedComments = await api.getPostComments(postId);
            setComments(updatedComments);
            // Also update the comment count on the post object
            setPost(p => ({...p, commentCount: (p.commentCount || 0) + 1}));
        } catch (error) {
            Alert.alert("Error", "Could not post your comment.");
        } finally {
            setIsPostingComment(false);
        }
    };

    const openImageViewer = (imageUri) => {
        setSelectedImage(imageUri);
        setViewerVisible(true);
    };

    if (isLoading || !post) {
        return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
                <FlatList
                    data={comments}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => <CommentItem item={item} colors={colors} />}
                    ListHeaderComponent={
                        <View style={{paddingBottom: 16}}>
                            <View style={styles.cardHeader}>
                                <Image source={{ uri: post.pfpUrl || `https://i.pravatar.cc/100?u=${post.userID}` }} style={styles.avatar} />
                                <View>
                                    <Text style={styles.username}>{post.first_name} {post.last_name}</Text>
                                    <Text style={styles.date}>{dayjs(post.createdAt).format("MMM DD, YYYY · HH:mm")}</Text>
                                </View>
                            </View>
                            <Text style={styles.title}>{post.title}</Text>
                            <Text style={styles.content}>{post.content}</Text>
                            
                            {post.images && post.images.length > 0 && (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScrollContainer}>
                                    {post.images.map((img, idx) => (
                                        <TouchableOpacity key={idx} onPress={() => openImageViewer(img)}>
                                            <Image source={{ uri: img }} style={styles.image} />
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}

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
                <View style={styles.commentInputContainer}>
                    <TextInput
                        style={styles.commentInput}
                        placeholder="Add a comment..."
                        placeholderTextColor={colors.textSecondary}
                        value={newComment}
                        onChangeText={setNewComment}
                    />
                    <TouchableOpacity onPress={handleAddComment} disabled={isPostingComment} style={styles.sendButton}>
                        {isPostingComment ? <ActivityIndicator size="small" /> : <Ionicons name="send" size={24} color={colors.primary} />}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
            
            <ImageViewer visible={viewerVisible} imageUri={selectedImage} onClose={() => setViewerVisible(false)} />
        </SafeAreaView>
    );
}

const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingTop: 16 },
    avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12, backgroundColor: colors.border },
    username: { fontWeight: 'bold', fontSize: 16, color: colors.text },
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
    commentContainer: { flexDirection: 'row', marginBottom: 16 },
    commentAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 12, backgroundColor: colors.border },
    commentBubble: { flex: 1, backgroundColor: colors.card, padding: 12, borderRadius: 12 },
    commentUsername: { fontWeight: 'bold', color: colors.text, fontSize: 13, marginBottom: 2 },
    commentText: { color: colors.text, lineHeight: 18 },
    commentDate: { fontSize: 11, color: colors.textSecondary, marginTop: 4, textAlign: 'right' },
    commentInputContainer: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card },
    commentInput: { flex: 1, backgroundColor: colors.background, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, fontSize: 16, color: colors.text, marginRight: 12 },
    sendButton: { padding: 4, justifyContent: 'center' },
    viewerContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    fullscreenImage: { width: '100%', height: '100%' },
    closeButton: { position: 'absolute', top: 50, right: 20, padding: 10, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20 }
});

const styles = getStyles({}); 