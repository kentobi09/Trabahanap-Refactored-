import React, { useState, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  SafeAreaView,
  Modal,
  FlatList,
  Alert,
  BackHandler,
  Platform,
} from "react-native";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { AddJobRequest } from "@/api/client-request";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import * as Location from 'expo-location';

const jobCategories = [
  {
    title: "🛠️ Repair and Maintenance",
    tags: [
      "Plumbing",
      "Electrical Repairs",
      "Carpentry",
      "Roof Repair",
      "Painting Services",
      "Welding",
      "Glass Installation",
      "Aircon Repair & Cleaning",
      "Appliance Repair",
      "Pest Control Services",
    ],
  },
  {
    title: "🚗 Vehicle Services",
    tags: [
      "Auto Mechanic",
      "Car Wash",
      "Motorcycle Repair",
      "Car Aircon Repair",
      "Window Tinting",
    ],
  },
  {
    title: "👨‍👩‍👧‍👦 Housekeeping Services",
    tags: [
      "Caregiver",
      "Personal Driver",
      "Massage Therapy",
      "Pet Grooming & Pet Care",
      "Home Cleaning Services",
      "Laundry Services",
      "Gardening",
    ],
  },
];

function camelCase(str: String) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
      return index == 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s*&+\s*/g, "And")
    .replace(/\s+/g, "");
}

const MAX_IMAGES = 3;

export default function AddJobScreen() {
  const router = useRouter();
  const [jobTitle, setJobTitle] = useState("");
  const [description, setDescription] = useState("");
  const [position, setPosition] = useState("");
  const [budget, setBudget] = useState("");
  const [location, setLocation] = useState("");
  const [duration, setDuration] = useState("");
  const [durationUnit, setDurationUnit] = useState("");
  const [showDurationUnitModal, setShowDurationUnitModal] = useState(false);
  const [images, setImages] = useState<string[]>([]);

  const [showTagPicker, setShowTagPicker] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [titleError, setTitleError] = useState(false);
  const [positionError, setPositionError] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false)
  const resetForm = () => {
    setJobTitle("");
    setDescription("");
    setPosition("");
    setBudget("");
    setLocation("");
    setDuration("");
    setDurationUnit("");
    setImages([]);

    setTitleError(false);
    setPositionError(false);
    setUnsavedChanges(false);
  };

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photo library to upload images.",
        [{ text: "OK", style: "default" }]
      );
      return false;
    }
    return true;
  };

  const handleGoBack = () => {
    if (unsavedChanges) {
      setShowUnsavedModal(true);
      return true;
    } else {
      router.back();
      return true;
    }
  };
  const getCurrentLocation = async () => {
    setIsLoading(true);
    try {
      // Request permission to access location
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Allow location access to use this feature');
        setIsLoading(false);
        return;
      }
      
      // Get current location coordinates
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const { latitude, longitude } = currentLocation.coords;
      
      // Reverse geocode to get address
      const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
      console.log("The address is ",addresses);
      if (addresses && addresses.length > 0) {
        const address = addresses[0];
        // Format the address as you prefer
        const formattedAddress = [
          address.formattedAddress
        ].filter(Boolean).join(', ');

        setLocation(formattedAddress.split(', Tuguegarao')[0].trim());
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get your location');
    } finally {
      setIsLoading(false);
    }
  };
  const handleDiscardChanges = () => {
    setShowUnsavedModal(false);
    resetForm();
    router.back();
  };

  const handleStay = () => {
    setShowUnsavedModal(false);
  };

  useFocusEffect(
    useCallback(() => {
      const hasChanges =
        jobTitle !== "" ||
        description !== "" ||
        position !== "" ||
        budget !== "" ||
        location !== "" ||
        images.length > 0;

      setUnsavedChanges(hasChanges);

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        handleGoBack
      );

      return () => backHandler.remove();
    }, [jobTitle, description, position, budget, location, images])
  );

  const pickImage = async () => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert(
        "Maximum Images",
        `You can only upload up to ${MAX_IMAGES} images.`,
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];

        const fileInfo = await FileSystem.getInfoAsync(selectedImage.uri, {
          size: true,
        });

        if (!fileInfo.exists) {
          Alert.alert("Error", "The selected image could not be accessed.", [
            { text: "OK", style: "default" },
          ]);
          return;
        }

        if (fileInfo.size === undefined) {
          Alert.alert(
            "Error",
            "Could not determine the size of the selected image.",
            [{ text: "OK", style: "default" }]
          );
          return;
        }

        if (fileInfo.size > 1048576) {
          Alert.alert(
            "Image Too Large",
            "Please select an image smaller than 1MB.",
            [{ text: "OK", style: "default" }]
          );
          return;
        }

        setImages([...images, result.assets[0].uri]);
      }
    } catch (error) {
      Alert.alert(
        "Image Selection Failed",
        "There was a problem selecting your image. Please try again.",
        [{ text: "OK", style: "default" }]
      );
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  const validateForm = () => {
    let isValid = true;

    setTitleError(false);
    setPositionError(false);

    if (!jobTitle.trim()) {
      setTitleError(true);
      isValid = false;
    }

    if (!position) {
      setPositionError(true);
      isValid = false;
    }

    return isValid;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert(
        "Missing Information",
        "Please provide a job title and select a position before saving.",
        [{ text: "OK", style: "default" }],
        { cancelable: true }
      );
      return;
    }

    AddJobRequest({
      client: await handleCheckToken(),
      jobTitle: jobTitle,
      jobDescription: description,
      category: camelCase(position),
      budget: budget,
      jobDuration: duration + " " + durationUnit,
      jobLocation: location,
      jobImage: images,
    });

    setSuccessModal(true);
  };

  const handleCheckToken = async () => {
    const dataToken = await AsyncStorage.getItem("token");
    const decodedToken = await axios.get(
      `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/decodeToken`,
      { params: { token: dataToken } }
    );
    return decodedToken.data;
  };

  const handleSuccessModalClose = () => {
    setSuccessModal(false);
    resetForm();
    router.push("/(main)/(tabs)/(client)/client-home");
  };

  const selectTag = (tag: string) => {
    setPosition(tag);
    setPositionError(false);
    setShowTagPicker(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons
            name="arrow-back-circle-outline"
            size={36}
            color="#001F3F"
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Add a job</Text>

      <ScrollView style={styles.scrollView}>
        <Text style={styles.label}>
          Title <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={[styles.input, titleError && styles.inputError]}
          value={jobTitle}
          onChangeText={(text) => {
            setJobTitle(text);
            if (text.trim()) setTitleError(false);
          }}
          placeholder="Enter title"
        />
        {titleError && (
          <Text style={styles.errorText}>Job title is required</Text>
        )}

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.textArea}
          value={description}
          onChangeText={setDescription}
          placeholder="Enter job description"
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>
          Position <Text style={styles.required}>*</Text>
        </Text>
        <TouchableOpacity
          style={[styles.input, positionError && styles.inputError]}
          onPress={() => setShowTagPicker(true)}
        >
          <Text style={position ? styles.inputText : styles.placeholderText}>
            {position || "Select a position"}
          </Text>
        </TouchableOpacity>
        {positionError && (
          <Text style={styles.errorText}>Position is required</Text>
        )}

        <Text style={styles.label}>Rate</Text>
        <TextInput
          style={styles.input}
          value={budget}
          onChangeText={setBudget}
          placeholder="Enter rate"
          keyboardType="numeric"
        />
        <Text style={styles.label}>Duration</Text>
        <View style={styles.durationContainer}>
          <TouchableOpacity
            style={[styles.input, styles.durationUnitButton]}
            onPress={() => setShowDurationUnitModal(true)}
          >
            <Text style={durationUnit ? styles.inputText : styles.placeholderText}>
              {durationUnit || "Select unit"}
            </Text>
          </TouchableOpacity>
          <TextInput
            style={[
              styles.input, 
              styles.durationInput,
              durationUnit === "Until-finished" && styles.disabledInput
            ]}
            value={duration}
            onChangeText={(text) => {
              // Only allow numbers
              const numericValue = text.replace(/[^0-9]/g, '');
              
              // Apply digit restrictions based on duration unit
              let maxDigits = 3; // Default for days
              if (durationUnit === 'Hours') maxDigits = 2;
              if (durationUnit === 'Weeks') maxDigits = 2;
              
              // Limit the number of digits
              const limitedValue = numericValue.slice(0, maxDigits);
              setDuration(limitedValue);
            }}
            placeholder="Enter number"
            keyboardType="numeric"
            editable={durationUnit !== "Until-finished"}
          />
        </View>

        <View>
    <Text style={styles.label}>Location</Text>
    <View style={styles.locationContainer}>
      <TextInput
        style={styles.locationInput}
        value={location}
        onChangeText={setLocation}
        placeholder="Enter location"
      />
      <TouchableOpacity 
        style={styles.locationButton}
        onPress={getCurrentLocation}
        disabled={isLoading}
      >
        <Ionicons 
          name="location" 
          size={24} 
          color="#fff" 
        />
      </TouchableOpacity>
    </View>
  </View>

        <Text style={styles.label}>
          Add images ({images.length}/{MAX_IMAGES})
        </Text>

        <View style={styles.imageGrid}>
          {images.map((uri, index) => (
            <View key={index} style={styles.imageContainer}>
              <Image source={{ uri }} style={styles.uploadedImage} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => removeImage(index)}
              >
                <Ionicons name="close-circle" size={24} color="#001F3F" />
              </TouchableOpacity>
            </View>
          ))}

          {images.length < MAX_IMAGES && (
            <TouchableOpacity
              style={styles.addImageContainer}
              onPress={pickImage}
            >
              <Feather name="plus" size={32} color="#666" />
              <Text style={styles.addImageText}>Add image</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.saveButton,
            (!jobTitle.trim() || !position) && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={successModal}
        onRequestClose={handleSuccessModalClose}
      >
        <View style={styles.successModalContainer}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <MaterialIcons name="check-circle" size={60} color="#4CD964" />
            </View>
            <Text style={styles.successTitle}>Job Posted Successfully!</Text>
            <Text style={styles.successMessage}>
              Your job has been posted and is now visible to workers in your
              area.
            </Text>
            <TouchableOpacity
              style={styles.successButton}
              onPress={handleSuccessModalClose}
            >
              <Text style={styles.successButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={showUnsavedModal}
        onRequestClose={handleStay}
      >
        <View style={styles.successModalContainer}>
          <View style={styles.successModalContent}>
            <View style={styles.warningIconContainer}>
              <MaterialIcons name="warning" size={60} color="#FF9500" />
            </View>
            <Text style={styles.successTitle}>Unsaved Changes</Text>
            <Text style={styles.successMessage}>
              You have unsaved changes that will be lost.
            </Text>
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity style={styles.stayButton} onPress={handleStay}>
                <Text style={styles.stayButtonText}>Stay</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.discardButton}
                onPress={handleDiscardChanges}
              >
                <Text style={styles.discardButtonText}>Discard Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={showTagPicker}
        onRequestClose={() => setShowTagPicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Position</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowTagPicker(false)}
              >
                <Ionicons name="close" size={24} color="#001F3F" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={jobCategories}
              keyExtractor={(item) => item.title}
              renderItem={({ item }) => (
                <View>
                  <Text style={styles.categoryTitle}>{item.title}</Text>
                  {item.tags.map((tag: string) => (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.tagItem,
                        position === tag && styles.selectedTagItem,
                      ]}
                      onPress={() => selectTag(tag)}
                    >
                      <Text
                        style={[
                          styles.tagText,
                          position === tag && styles.selectedTagText,
                        ]}
                      >
                        {tag}
                      </Text>
                      {position === tag && (
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color="#001F3F"
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              style={styles.tagsList}
            />
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={showDurationUnitModal}
        onRequestClose={() => setShowDurationUnitModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Duration Unit</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowDurationUnitModal(false)}
              >
                <Ionicons name="close" size={24} color="#001F3F" />
              </TouchableOpacity>
            </View>

            <View style={styles.tagsList}>
              {["Hours", "Days", "Weeks", "Until-finished"].map((unit) => (
                <TouchableOpacity
                  key={unit}
                  style={[
                    styles.tagItem,
                    durationUnit === unit && styles.selectedTagItem,
                  ]}
                  onPress={() => {
                    setDurationUnit(unit);
                    if (unit === "Until-finished") {
                      setDuration("");
                    }
                    setShowDurationUnitModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.tagText,
                      durationUnit === unit && styles.selectedTagText,
                    ]}
                  >
                    {unit}
                  </Text>
                  {durationUnit === unit && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color="#001F3F"
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'android' ? 40 : 12,
    alignItems: "center",
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#000",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
    marginBottom: 8,
  },
  required: {
    color: "#FF3B30",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  inputError: {
    borderColor: "#FF3B30",
    backgroundColor: "#FFF5F5",
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 14,
    marginTop: -12,
    marginBottom: 16,
    paddingLeft: 4,
  },
  inputText: {
    color: "#000",
    fontSize: 16,
  },
  textArea: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    height: 120,
    textAlignVertical: "top",
  },

  // Image Grid Layout
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 24,
  },
  imageContainer: {
    width: "30%",
    aspectRatio: 1,
    marginRight: "3%",
    marginBottom: 12,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  uploadedImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  removeImageButton: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 12,
    padding: 1,
  },
  addImageContainer: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
  },
  addImageText: {
    color: "#666",
    fontSize: 14,
    marginTop: 4,
  },
  placeholderText: {
    color: "#666",
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: "#001F3F",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
    elevation: 2,
  },
  saveButtonDisabled: {
    backgroundColor: "#9AA5B1",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  closeButton: {
    padding: 4,
  },
  tagsList: {
    padding: 16,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 8,
    color: "#001F3F",
  },
  tagItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  selectedTagItem: {
    backgroundColor: "#EBF8FF",
  },
  tagText: {
    fontSize: 16,
    color: "#333",
  },
  selectedTagText: {
    color: "#001F3F",
    fontWeight: "500",
  },
  successModalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 20,
  },
  successModalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "90%",
    maxWidth: 340,
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  successIconContainer: {
    marginBottom: 16,
  },
  warningIconContainer: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 12,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 22,
  },
  successButton: {
    backgroundColor: "#001F3F",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: "100%",
    alignItems: "center",
  },
  successButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  stayButton: {
    backgroundColor: "#EEEEEE",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
    flex: 1,
    marginRight: 8,
    alignItems: "center",
  },
  stayButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "500",
  },
  discardButton: {
    backgroundColor: "#FF3B30",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1.5,
    marginLeft: 8,
    alignItems: "center",
  },
  discardButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  durationContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  durationInput: {
    flex: 1,
  },
  durationUnitButton: {
    flex: 1,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 10,
  },
  locationButton: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 5,
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledInput: {
    backgroundColor: '#E5E5E5',
    color: '#666666',
  },
});
