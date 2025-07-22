// fyp/food-app/screens/EditPostScreen.js
import React, { useState, useEffect } from "react";
import { 
    View, Text, TextInput, TouchableOpacity, StyleSheet, 
    ScrollView, Image, ActivityIndicator, SafeAreaView, Alert, Platform, KeyboardAvoidingView 
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { api } from '../utils/api';
import { useTheme } from '../context/ThemeContext';

export default function EditPostScreen({ route }) {
    const { post } = route.params;
    const navigation = useNavigation();
    const { colors } = useTheme();
    const styles = getStyles(colors);

    const [title, setTitle] = useState(post.title);
    const [content, setContent] = useState(post.content);
    const [images, setImages] = useState(post.images || []);
    const [imagesToDelete, setImagesToDelete] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    useEffect(() => {
        navigation.setOptions({
            headerStyle: { backgroundColor: colors.card },
            headerTintColor: colors.text,
            headerTitleStyle: { color: colors.text },
            title: 'Edit Post',
        });
    }, [colors, navigation]);

    const pickImage = async () => {
        if (images.length >= 5) {
            Alert.alert("Maximum Images", "You can only upload a maximum of 5 images.");
            return;
        }
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.7,
        });

        if (!result.canceled) {
            setImages((prev) => [...prev, result.assets[0].uri]);
        }
    };

    const removeImage = (uriToRemove, index) => {
        // If the URI is a remote URL (not a local file), mark it for deletion
        if (!uriToRemove.startsWith('file://')) {
            setImagesToDelete(prev => [...prev, uriToRemove]);
        }
        setImages((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSaveChanges = async () => {
        if (!title.trim() || !content.trim()) {
            Alert.alert("Incomplete", "Please provide a title and content.");
            return;
        }
        setIsSubmitting(true);
        const formData = new FormData();
        formData.append("title", title);
        formData.append("content", content);
        formData.append("imagesToDelete", JSON.stringify(imagesToDelete));

        // Append only new images
        images.forEach((uri) => {
            if (uri.startsWith('file://')) { // Check if it's a new local file
                const fileName = uri.split("/").pop();
                const fileType = Platform.OS === 'ios' ? 'image/jpeg' : `image/${fileName.split('.').pop()}`;
                formData.append("newImages", { uri, name: fileName, type: fileType });
            }
        });

        try {
            await api.updatePost(post.id, formData);
            Alert.alert("Success", "Your post has been updated!");
            navigation.goBack();
        } catch (err) {
            console.error("Post update error:", err);
            Alert.alert("Error", err.message || "Could not update your post.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
                <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
                    <Text style={styles.label}>Title</Text>
                    <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholderTextColor={colors.textSecondary} />
                    
                    <Text style={styles.label}>Content</Text>
                    <TextInput style={[styles.input, styles.contentInput]} value={content} onChangeText={setContent} multiline placeholderTextColor={colors.textSecondary}/>

                    <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                        <Ionicons name="images-outline" size={22} color={colors.primary} />
                        <Text style={styles.imageButtonText}>Add Images (up to 5)</Text>
                    </TouchableOpacity>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageContainer}>
                        {images.map((uri, index) => (
                            <View key={index} style={styles.imageWrapper}>
                                <Image source={{ uri }} style={styles.previewImage} />
                                <TouchableOpacity style={styles.removeButton} onPress={() => removeImage(uri, index)}>
                                    <Ionicons name="close" size={18} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>

                    <TouchableOpacity style={[styles.submitButton, isSubmitting && {backgroundColor: colors.border}]} onPress={handleSaveChanges} disabled={isSubmitting}>
                        {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Save Changes</Text>}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// (You can copy the getStyles function from AddPostScreen.js as it's identical)
const getStyles = (colors) => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollView: { padding: 16 },
    label: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 8, marginTop: 16 },
    input: { backgroundColor: colors.card, borderRadius: 10, padding: 16, fontSize: 16, color: colors.text, borderWidth: 1, borderColor: colors.border },
    contentInput: { height: 180, textAlignVertical: "top" },
    imageButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, padding: 12, borderRadius: 10, marginTop: 20, justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    imageButtonText: { color: colors.primary, fontWeight: 'bold', marginLeft: 8, fontSize: 16 },
    imageContainer: { marginTop: 16, minHeight: 110 },
    imageWrapper: { position: "relative", marginRight: 10 },
    previewImage: { width: 100, height: 100, borderRadius: 8, backgroundColor: colors.border },
    removeButton: { position: "absolute", top: 5, right: 5, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 12, width: 24, height: 24, alignItems: "center", justifyContent: "center" },
    submitButton: { backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: "center", marginTop: 32 },
    submitButtonText: { fontWeight: "bold", color: "#fff", fontSize: 16 }
});