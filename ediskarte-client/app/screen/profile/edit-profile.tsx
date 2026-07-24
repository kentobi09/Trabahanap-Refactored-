import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import {
  AntDesign,
  Ionicons,
  MaterialCommunityIcons,
  Feather,
} from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchUserProfile, updateUserProfile } from "@/api/profile-request";

interface SelectedImage {
  uri: string;
  type: string;
  name: string;
}

const EditProfilePage: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: userData } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchUserProfile,
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateUserProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      Alert.alert("Success", "Profile updated successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    },
    onError: (error) => {
      Alert.alert("Error", "Failed to update profile. Please try again.");
    },
  });

  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    suffixName: "",
    emailAddress: "",
    phoneNumber: "",
    gender: "",
    birthday: "",
    houseNumber: "",
    street: "",
    barangay: "",
    profileImage: "",
  });

  const [selectedImageFile, setSelectedImageFile] =
    useState<SelectedImage | null>(null);

  useEffect(() => {
    if (userData) {
      setFormData({
        firstName: userData.firstName || "",
        middleName: userData.middleName || "",
        lastName: userData.lastName || "",
        suffixName: userData.suffixName || "",
        emailAddress: userData.emailAddress || "",
        phoneNumber: userData.phoneNumber || "",
        gender: formatGender(userData.gender) || "",
        birthday: formatBirthday(userData.birthday) || "",
        houseNumber: userData.houseNumber || "",
        street: userData.street || "",
        barangay: userData.barangay || "",
        profileImage: userData.profileImage || "", // Initial image from server
      });
      setSelectedImageFile(null); // Clear selected file on initial load
    }
  }, [userData]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveModalVisible, setSaveModalVisible] = useState(false);

  const formatGender = (gender: string | undefined) => {
    if (!gender) return "";
    return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
  };

  const formatBirthday = (birthday: string | undefined) => {
    if (!birthday) return "";
    const date = new Date(birthday);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleBackPress = () => {
    router.back();
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleImagePicker = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photo library to change profile picture."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];

        // Image Size Check
        const maxSizeInBytes = 1 * 1024 * 1024; // 1MB
        if (asset.fileSize && asset.fileSize > maxSizeInBytes) {
          Alert.alert(
            "Image Too Large",
            `Please select an image smaller than ${maxSizeInBytes / 1024 / 1024}MB.`
          );
          return;
        }

        // Ensure we have a valid URI
        if (!asset.uri) {
          Alert.alert("Error", "Failed to get image URI");
          return;
        }

        const uri = Platform.OS === 'android' 
          ? asset.uri 
          : asset.uri.replace('file://', '');

        const type = asset.mimeType || "image/jpeg";
        const name = asset.fileName || `profile-${Date.now()}.jpg`;

        // Update state for display
        setFormData((prev) => ({
          ...prev,
          profileImage: uri,
        }));

        // Update state for upload
        setSelectedImageFile({ uri, type, name });
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const requiredFields = [
      { key: "firstName", label: "First Name" },
      { key: "lastName", label: "Last Name" },
      { key: "emailAddress", label: "Email" },
      { key: "gender", label: "Gender" },
      { key: "birthday", label: "Birthday" },
      { key: "houseNumber", label: "House Number" },
      { key: "street", label: "Street" },
      { key: "barangay", label: "Barangay" },
    ];

    requiredFields.forEach((field) => {
      if (!formData[field.key as keyof typeof formData]) {
        newErrors[field.key] = `${field.label} is required`;
      }
    });

    if (formData.emailAddress && !/\S+@\S+\.\S+/.test(formData.emailAddress)) {
      newErrors.emailAddress = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSavePress = () => {
    if (!validateForm()) {
      Alert.alert(
        "Validation Error",
        "Please fill in all required fields correctly."
      );
      return;
    }
    setSaveModalVisible(true);
  };

  const handleConfirmSave = async () => {
    setSaveModalVisible(false);
    if (!userData?.id) {
      Alert.alert("Error", "Unable to save profile. User ID not found.");
      return;
    }

    try {
      const userType = await AsyncStorage.getItem("userType");

      // Create FormData if a new image is selected
      if (selectedImageFile) {
        const dataToSend = new FormData();

        // Append image file
        dataToSend.append("profileImage", {
          uri: selectedImageFile.uri,
          type: selectedImageFile.type,
          name: selectedImageFile.name,
        } as any);

        // Append other form fields
        Object.keys(formData).forEach((key) => {
          if (key !== "profileImage") {
            // Don't send the display URI
            dataToSend.append(key, formData[key as keyof typeof formData]);
          }
        });
        dataToSend.append("userType", userType || "client");
        dataToSend.append("id", userData.id); // Ensure ID is sent

        console.log("Sending FormData:", dataToSend);
        updateProfileMutation.mutate(dataToSend);
      } else {
        // Send JSON if no new image
        const dataToSend = {
          ...formData,
          id: userData.id,
          userType: userType || "client",
        };
        console.log("Sending JSON data:", dataToSend);
        updateProfileMutation.mutate(dataToSend);
      }
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to prepare data for saving. Please try again."
      );
    }
  };

  const handleCancelSave = () => {
    setSaveModalVisible(false);
  };

  if (!userData) {
    return null;
  }

  // Modify the image source handling logic
  const getImageSource = () => {
    if (selectedImageFile) {
      return { uri: selectedImageFile.uri };
    } else if (formData.profileImage) {
      // Ensure the profile image path is properly formatted
      const imagePath = formData.profileImage.startsWith('http') 
        ? formData.profileImage 
        : `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/${formData.profileImage}`;
      return { uri: imagePath };
    } else {
      // For default image, use require
      return require("assets/images/default-user.png");
    }
  };

  return (
    <View style={styles.mainContainer}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <AntDesign name="arrowleft" size={24} color="#0B153C" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>Edit Profile</Text>
          </View>
          <TouchableOpacity style={styles.saveButton} onPress={handleSavePress}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileSection}>
          <TouchableOpacity onPress={handleImagePicker}>
            <View style={styles.profileImageContainer}>
              <Image
                source={getImageSource()}
                style={styles.profileImage}
                defaultSource={require("assets/images/default-user.png")}
              />
              <View style={styles.editImageButton}>
                <Feather name="camera" size={18} color="#FFF" />
              </View>
            </View>
          </TouchableOpacity>
          <Text style={styles.changePhotoText}>Change Profile Photo</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              First Name <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                errors.firstName ? styles.inputError : null,
              ]}
              value={formData.firstName}
              onChangeText={(value) => handleInputChange("firstName", value)}
              placeholder="Enter your first name"
            />
            {errors.firstName ? (
              <Text style={styles.errorText}>{errors.firstName}</Text>
            ) : null}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Middle Name</Text>
            <TextInput
              style={styles.input}
              value={formData.middleName}
              onChangeText={(value) => handleInputChange("middleName", value)}
              placeholder="Enter your middle name"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              Last Name <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.lastName ? styles.inputError : null]}
              value={formData.lastName}
              onChangeText={(value) => handleInputChange("lastName", value)}
              placeholder="Enter your last name"
            />
            {errors.lastName ? (
              <Text style={styles.errorText}>{errors.lastName}</Text>
            ) : null}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Suffix</Text>
            <TextInput
              style={styles.input}
              value={formData.suffixName}
              onChangeText={(value) => handleInputChange("suffixName", value)}
              placeholder="Jr., Sr., III, etc. (optional)"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              Gender <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.gender ? styles.inputError : null]}
              value={formData.gender}
              onChangeText={(value) => handleInputChange("gender", value)}
              placeholder="Enter your gender"
            />
            {errors.gender ? (
              <Text style={styles.errorText}>{errors.gender}</Text>
            ) : null}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              Birthday <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.birthday ? styles.inputError : null]}
              value={formData.birthday}
              onChangeText={(value) => handleInputChange("birthday", value)}
              placeholder="MM/DD/YYYY"
            />
            {errors.birthday ? (
              <Text style={styles.errorText}>{errors.birthday}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              Email <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                errors.emailAddress ? styles.inputError : null,
              ]}
              value={formData.emailAddress}
              onChangeText={(value) => handleInputChange("emailAddress", value)}
              placeholder="Enter your email"
              keyboardType="email-address"
            />
            {errors.emailAddress ? (
              <Text style={styles.errorText}>{errors.emailAddress}</Text>
            ) : null}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              Phone Number
            </Text>
            <TextInput
              style={[
                styles.input,
                errors.phoneNumber ? styles.inputError : null,
              ]}
              value={formData.phoneNumber}
              onChangeText={(value) => handleInputChange("phoneNumber", value)}
              placeholder="Enter your phone number (optional)"
              keyboardType="phone-pad"
            />
            {errors.phoneNumber ? (
              <Text style={styles.errorText}>{errors.phoneNumber}</Text>
            ) : null}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              House Number <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                errors.houseNumber ? styles.inputError : null,
              ]}
              value={formData.houseNumber}
              onChangeText={(value) => handleInputChange("houseNumber", value)}
              placeholder="Enter your house number"
            />
            {errors.houseNumber ? (
              <Text style={styles.errorText}>{errors.houseNumber}</Text>
            ) : null}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              Street <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.street ? styles.inputError : null]}
              value={formData.street}
              onChangeText={(value) => handleInputChange("street", value)}
              placeholder="Enter your street"
            />
            {errors.street ? (
              <Text style={styles.errorText}>{errors.street}</Text>
            ) : null}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              Barangay <Text style={styles.requiredStar}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.barangay ? styles.inputError : null]}
              value={formData.barangay}
              onChangeText={(value) => handleInputChange("barangay", value)}
              placeholder="Enter your barangay"
            />
            {errors.barangay ? (
              <Text style={styles.errorText}>{errors.barangay}</Text>
            ) : null}
          </View>
        </View>
      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={saveModalVisible}
        onRequestClose={handleCancelSave}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Save Changes</Text>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalText}>
                Are you sure you want to save these changes to your profile?
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCancelSave}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleConfirmSave}
              >
                <Text style={styles.confirmButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 16,
    paddingTop: Platform.OS === "ios" ? 50 : 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0B153C",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  profileSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: 8,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editImageButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#0B153C",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  changePhotoText: {
    color: "#0B153C",
    fontSize: 16,
    fontWeight: "500",
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#fafafa",
  },
  multilineInput: {
    height: 80,
    textAlignVertical: "top",
  },
  requiredStar: {
    color: "red",
  },
  inputError: {
    borderColor: "red",
  },
  errorText: {
    color: "red",
    fontSize: 12,
    marginTop: 4,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    backgroundColor: "#0B153C",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
  },
  modalBody: {
    padding: 20,
  },
  modalText: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    lineHeight: 22,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f1f2f6",
    marginRight: 8,
  },
  confirmButton: {
    backgroundColor: "#0B153C",
    marginLeft: 8,
  },
  cancelButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "500",
  },
  confirmButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
});

export default EditProfilePage;
