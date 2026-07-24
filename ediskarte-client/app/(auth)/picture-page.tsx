import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SignUpData, handleFormData } from "@/api/signup-request";

export default function ProfilePictureScreen() {
  const router = useRouter();
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const openImagePicker = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        alert("Sorry, we need camera roll permissions to make this work!");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: Platform.OS === "android" ? 0.2 : 0.5, // Lower quality on Android
        exif: false, // Don't need extra metadata
      });

      if (!result.canceled) {
        // Get file size if available (works reliably on iOS)
        const fileSize = result.assets[0].fileSize;
        console.log(
          `Profile image details - Width: ${result.assets[0].width}, Height: ${result.assets[0].height}, Size: ${fileSize || "Unknown"} bytes`
        );

        const maxSize = 1 * 1024 * 1024; // 1MB

        // On iOS, fileSize is reliable
        if (fileSize && fileSize > maxSize) {
          alert(
            `Image size (${(fileSize / 1024 / 1024).toFixed(2)}MB) exceeds 1MB limit. Please select a smaller image.`
          );
          return;
        }

        // On Android, use the dimensions as a heuristic for large images
        if (Platform.OS === "android") {
          // If width or height is very large, the image is likely too big
          const { width, height } = result.assets[0];

          // Calculate approximate size based on dimensions and 3 bytes per pixel (RGB)
          const estimatedSize = (width * height * 3) / (Platform.OS === "android" ? 5 : 1); // Divide by 5 to account for compression
          console.log(`Estimated profile image size: ${estimatedSize} bytes`);

          if (estimatedSize > maxSize) {
            alert("Image is too large. Please select a smaller image.");
            return;
          }
        }

        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking profile image:", error);
      alert("There was an error selecting the image. Please try again.");
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleNext = () => {
    if (profileImage) {
      SignUpData({ profileImage: profileImage });
    }

    router.push("/(auth)/id-verification");
  };

  const handleSkip = () => {
    router.push("/(auth)/id-verification");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000033" />
        </TouchableOpacity>
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.title}>Add a profile picture</Text>
        <Text style={styles.subtitle}>
          Add a profile picture so your clients know it's you. Everyone will be
          able to see your picture
        </Text>

        <TouchableOpacity
          style={styles.imageContainer}
          onPress={openImagePicker}
        >
          {profileImage ? (
            <>
              <Image
                source={{ uri: profileImage }}
                style={styles.profileImage}
              />
              <View style={styles.imageOverlay}>
                <Ionicons name="camera" size={24} color="white" />
                <Text style={styles.changePhotoText}>Change photo</Text>
              </View>
            </>
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="camera" size={24} color="#666" />
              <Text style={styles.addPhotoText}>Add photo</Text>
            </View>
          )}
        </TouchableOpacity>

        {!profileImage ? (
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Save</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 30,
    borderColor: "#000033",
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 40,
    paddingTop: 40,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 40,
  },
  imageContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
    overflow: "hidden",
  },
  profileImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingVertical: 10,
    alignItems: "center",
  },
  addPhotoText: {
    color: "#666",
    marginTop: 10,
  },
  changePhotoText: {
    color: "white",
    marginTop: 5,
  },
  buttonContainer: {
    width: "100%",
  },
  nextButton: {
    backgroundColor: "#000033",
    width: "100%",
    paddingVertical: 15,
    borderRadius: 4,
    alignItems: "center",
    marginBottom: 20,
  },
  nextButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  skipButton: {
    width: "100%",
    paddingVertical: 15,
    borderRadius: 4,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#000033",
  },
  skipButtonText: {
    color: "#000033",
    fontSize: 16,
    fontWeight: "500",
  },
});
