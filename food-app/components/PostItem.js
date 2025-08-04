// fyp/food-app/components/PostItem.js
import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'; // Import MaterialCommunityIcons
import dayjs from 'dayjs';
import { useTheme } from '../context/ThemeContext';

// Note the "export const" - this is a NAMED export, which is what we want.
export const PostItem = ({ item, onToggleLike, onToggleBookmark, onReport, navigation }) => {
    const { colors } = useTheme();
    const styles = getStyles(colors);
    const authorInitial = item.first_name ? item.first_name[0].toUpperCase() : '?';

    const handleFlagPress = () => {
        Alert.alert(
            "Report Post",
            `Are you sure you want to report this post by ${item.first_name} ${item.last_name}?`,
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Report", 
                    style: "destructive", 
                    onPress: () => onReport(item.id) 
                }
            ]
        );
    };

    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.avatarContainer}>
                    {item.pfpUrl ? (
                        <Image source={{ uri: item.pfpUrl }} style={styles.avatar} />
                    ) : (
                        <Text style={styles.avatarInitial}>{authorInitial}</Text>
                    )}
                </View>
                <View style={styles.userInfo}>
                    <View style={styles.usernameContainer}>
                        <Text style={styles.username}>{item.first_name} {item.last_name}</Text>
                        {item.authorIsHpVerified && (
                             <MaterialCommunityIcons 
                                name="check-decagram" 
                                size={16} 
                                color="#3498db" 
                                style={styles.verifiedBadge} 
                            />
                        )}
                    </View>
                    <Text style={styles.date}>{dayjs(item.createdAt).format("MMM DD, YYYY · h:mm A")}</Text>
                </View>
                {!item.isOwner && (
                    <TouchableOpacity
                        onPress={handleFlagPress}
                        style={styles.flagIconButton}
                        // Disable the button visually and functionally if already reported
                        disabled={item.reportedByUser} 
                    >
                        <Ionicons 
                            name={item.reportedByUser ? "flag" : "flag-outline"} 
                            size={22} 
                            // Change color based on the reported status
                            color={item.reportedByUser ? colors.logoutText : colors.textSecondary} 
                        />
                    </TouchableOpacity>
                )}
            </View>
            <TouchableOpacity onPress={() => navigation.navigate("PostDetail", { postId: item.id })}>
                <Text style={styles.content}>{item.content}</Text>
                {item.images && item.images.length > 0 && (
                    <Image source={{ uri: item.images[0] }} style={styles.postImage} />
                )}
            </TouchableOpacity>
            <View style={styles.actionBar}>
                <TouchableOpacity style={styles.actionButton} onPress={() => onToggleLike(item.id, item.likedByUser)}>
                    <Ionicons name={item.likedByUser ? "heart" : "heart-outline"} size={26} color={item.likedByUser ? '#EF4444' : colors.textSecondary} />
                    <Text style={[styles.actionText, { color: item.likedByUser ? '#EF4444' : colors.textSecondary }]}>
                        {item.likeCount > 0 ? item.likeCount : ''}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate("PostDetail", { postId: item.id })}>
                    <Ionicons name={"chatbubble-outline"} size={24} color={colors.textSecondary} />
                    <Text style={[styles.actionText, { color: colors.textSecondary }]}>
                        {item.commentCount > 0 ? item.commentCount : ''}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => onToggleBookmark(item.id, item.bookmarkedByUser)}>
                    <Ionicons 
                        name={item.bookmarkedByUser ? "bookmark" : "bookmark-outline"}
                        size={24}
                        color={item.bookmarkedByUser ? colors.primary : colors.textSecondary}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
};

// Styles for the component
const getStyles = (colors) => StyleSheet.create({
    card: { backgroundColor: colors.card, marginBottom: 16, borderRadius: 12, overflow: 'hidden' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16 },
    avatar: { width: 44, height: 44, borderRadius: 22 },
    avatarContainer: {
        width: 44, height: 44, borderRadius: 22,
        marginRight: 12, backgroundColor: colors.border,
        justifyContent: 'center', alignItems: 'center',
    },
    avatarInitial: {
        fontSize: 20, color: colors.primary, fontWeight: 'bold'
    },
    userInfo: { flex: 1 },
    usernameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    username: { fontWeight: 'bold', color: colors.text, fontSize: 16 },
    verifiedBadge: {
        marginLeft: 5,
    },
    date: { fontSize: 12, color: colors.textSecondary },
    content: { fontSize: 15, color: colors.text, lineHeight: 22, paddingHorizontal: 16, marginVertical: 12 },
    postImage: { width: 'u', height: 250, backgroundColor: colors.border, marginTop: 4 },
    actionBar: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: colors.border },
    actionButton: { flexDirection: 'row', alignItems: 'center', padding: 8 },
    actionText: { marginLeft: 8, fontSize: 14, fontWeight: '600' },
    flagIconButton: { padding: 4, marginLeft: 10 }
});