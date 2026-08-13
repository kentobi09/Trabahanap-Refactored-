import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Image,
  ScrollView,
  SafeAreaView,
  FlatList,
  Platform,
} from "react-native";
import { ThemedView } from "../../components/ThemedView";
import { ThemedText } from "../../components/ThemedText";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  SignUpData,
  handleFormData,
  verifyApplicant,
} from "../../api/signup-request";

const ID_TYPES = [
  { id: "national_id", label: "National ID (PhilSys)" },
  { id: "postal_id", label: "Postal ID" },
  { id: "passport", label: "Passport" },
  { id: "drivers_license", label: "Driver's License" },
];

export default function IDVerification() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [selectedID, setSelectedID] = useState<string | null>(null);
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [showTermsError, setShowTermsError] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleSubmit = async () => {
    if (!termsAgreed) {
      setShowTermsError(true);
      return;
    }
    setShowTermsError(false);

    SignUpData({
      idType: selectedID,
      frontImage: frontImage,
      backImage: backImage,
    });

    console.log("Submitting applicant data...");
    const res = await verifyApplicant();

    if (res && (res.success || res.id || res._id || res.message === "Applicant created successfully. Waiting for verification.")) {
      setSuccessModalVisible(true);
    } else {
      const errorMsg = typeof res === "string" ? res : res?.error || "Submission failed. Please try again.";
      alert(errorMsg);
    }
  };

  const pickImage = async (type: "front" | "back") => {
    try {
      // Use lower quality for Android to ensure smaller file sizes
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: Platform.OS === "android" ? 0.2 : 0.5, // Much lower quality on Android to ensure smaller files
        exif: false, // Don't need extra metadata
      });

      if (!result.canceled) {
        // Get file size if available (works reliably on iOS)
        const fileSize = result.assets[0].fileSize;
        console.log(
          `Selected image details - Width: ${result.assets[0].width}, Height: ${
            result.assets[0].height
          }, Size: ${fileSize || "Unknown"} bytes`
        );

        const maxSize = 1 * 1024 * 1024; // 1MB

        // On iOS, fileSize is reliable
        if (fileSize && fileSize > maxSize) {
          alert(
            `Image size (${(fileSize / 1024 / 1024).toFixed(
              2
            )}MB) exceeds 1MB limit. Please select a smaller image.`
          );
          return;
        }

        // On Android, use the dimensions as a heuristic for large images
        if (Platform.OS === "android") {
          // If width or height is very large, the image is likely too big
          const { width, height } = result.assets[0];

          // Calculate approximate size based on dimensions and 3 bytes per pixel (RGB)
          // This is very rough but helps catch obviously large images
          const estimatedSize =
            (width * height * 3) / (Platform.OS === "android" ? 5 : 1); // Divide by 5 to account for compression
          console.log(`Estimated image size: ${estimatedSize} bytes`);

          if (estimatedSize > maxSize) {
            alert("Image is too large. Please select a smaller image.");
            return;
          }
        }

        if (type === "front") {
          setFrontImage(result.assets[0].uri);
        } else {
          setBackImage(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      alert("There was an error selecting the image. Please try again.");
    }
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar style="light" backgroundColor="#0B153C" />
      <View style={[styles.topHeader, Platform.OS === 'ios' && styles.iosHeader]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>ID Verification</Text>
        <View style={{ width: 32 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>ID Verification</Text>
        <Text style={styles.subtitle}>Upload your valid government ID</Text>

        {/* ID Type Selection */}
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.idTypeButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.idTypeButtonText}>
              {selectedID
                ? ID_TYPES.find((id) => id.id === selectedID)?.label
                : "Select ID Type"}
            </Text>
          </TouchableOpacity>
          <View style={styles.inputLine} />
          <Text style={styles.inputLabel}>ID Type</Text>
        </View>

        {/* Front Image Upload */}
        <View style={styles.inputContainer}>
          <Text style={styles.sectionTitle}>Front Image</Text>
          <TouchableOpacity
            style={styles.imageUploadButton}
            onPress={() => pickImage("front")}
          >
            {frontImage ? (
              <Image
                source={{ uri: frontImage }}
                style={styles.uploadedImage}
              />
            ) : (
              <Text style={styles.uploadText}>Upload Front Image</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Back Image Upload */}
        <View style={styles.inputContainer}>
          <Text style={styles.sectionTitle}>Back Image</Text>
          <TouchableOpacity
            style={styles.imageUploadButton}
            onPress={() => pickImage("back")}
          >
            {backImage ? (
              <Image source={{ uri: backImage }} style={styles.uploadedImage} />
            ) : (
              <Text style={styles.uploadText}>Upload Back Image</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Terms and Conditions Checkbox */}
        <View style={styles.termsContainer}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => {
              setTermsAgreed(!termsAgreed);
              setShowTermsError(false);
            }}
          >
            <View style={[styles.checkbox, termsAgreed && styles.checkboxChecked]}>
              {termsAgreed && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
            <Text style={styles.termsText}>
              I agree to the{" "}
              <Text style={styles.termsLink} onPress={() => router.push("/screen/terms-conditions")}>
                Terms and Conditions
              </Text>{" "}
              and{" "}
              <Text style={styles.termsLink} onPress={() => router.push("/screen/privacy-policy")}>
                Privacy Policy
              </Text>
            </Text>
          </TouchableOpacity>
          {showTermsError && (
            <Text style={styles.errorText}>You must agree to the terms and conditions to proceed</Text>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!selectedID || !frontImage || !backImage || !termsAgreed) &&
              styles.submitButtonDisabled,
          ]}
          disabled={!selectedID || !frontImage || !backImage || !termsAgreed}
          onPress={handleSubmit}
        >
          <Text style={styles.submitButtonText}>Submit Verification</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ID Type Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select ID Type</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={ID_TYPES}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.idTypeItem}
                  onPress={() => {
                    setSelectedID(item.id);
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.idTypeText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={successModalVisible}
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />
            </View>
            <Text style={styles.successTitle}>Submitted Successfully</Text>
            <Text style={styles.successMessage}>Wait for the verification</Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => {
                setSuccessModalVisible(false);
                router.push("/waiting-validation");
              }}
            >
              <Text style={styles.successButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topHeader: {
    backgroundColor: "#0B153C",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: Platform.OS === "android" ? 44 : 10,
  },
  iosHeader: {
    paddingTop: Platform.OS === "ios" ? 10 : 10,
  },
  backButton: {
    padding: 6,
  },
  topHeaderTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 40,
  },
  inputContainer: {
    marginBottom: 30,
  },
  idTypeButton: {
    paddingVertical: 8,
  },
  idTypeButtonText: {
    fontSize: 16,
    color: "#000",
  },
  inputLine: {
    height: 1,
    backgroundColor: "#000",
    width: "100%",
    marginBottom: 5,
  },
  inputLabel: {
    fontSize: 14,
    marginTop: 10,
    fontWeight: "bold",
    color: "#000",
  },
  sectionTitle: {
    fontSize: 14,
    marginBottom: 10,
    fontWeight: "bold",
    color: "#000",
  },
  imageUploadButton: {
    height: 200,
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  uploadedImage: {
    width: "100%",
    height: "100%",
    borderRadius: 6,
  },
  uploadText: {
    fontSize: 16,
    color: "#666",
  },
  submitButton: {
    backgroundColor: "#0A1747",
    paddingVertical: 15,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: "#ccc",
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  idTypeItem: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  idTypeText: {
    fontSize: 16,
    color: "#000",
  },
  successModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  successModalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    width: "80%",
    maxWidth: 400,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 10,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 16,
    color: "#666",
    marginBottom: 30,
    textAlign: "center",
  },
  successButton: {
    backgroundColor: "#0A1747",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 6,
    width: "100%",
  },
  successButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  termsContainer: {
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#0A1747",
    borderRadius: 4,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#0A1747",
  },
  termsText: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  termsLink: {
    color: "#0A1747",
    textDecorationLine: "underline",
  },
  errorText: {
    color: "#FF0000",
    fontSize: 12,
    marginTop: 5,
    marginLeft: 34,
  },
});
