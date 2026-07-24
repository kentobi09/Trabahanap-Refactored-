import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import {
  AntDesign,
  MaterialCommunityIcons,
  Ionicons,
  FontAwesome5,
  Entypo,
} from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchUserProfile,
  updateUserJobTags,
  uploadCredential,
} from "@/api/profile-request";
import * as ImagePicker from "expo-image-picker";

// Import local achievement data
import achievementsData from "../../../screen/profile/achievements";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

// Create a lookup map for faster access
const achievementsByTitle = new Map<string, Achievement>(
  achievementsData.map((a) => [a.title, a])
);

// Mapping for Job Tags to Display Labels and Icons
const jobTagMetadata = {
  plumbing: {
    label: "Plumbing",
    icon: () => (
      <MaterialCommunityIcons name="pipe-wrench" size={14} color="#fff" />
    ),
  },
  electricalRepairs: {
    label: "Electrical Repairs",
    icon: () => <MaterialCommunityIcons name="flash" size={14} color="#fff" />,
  },
  carpentry: {
    label: "Carpentry",
    icon: () => (
      <MaterialCommunityIcons
        name="hammer-screwdriver"
        size={14}
        color="#fff"
      />
    ),
  },
  roofRepair: {
    label: "Roof Repair",
    icon: () => (
      <MaterialCommunityIcons name="home-roof" size={14} color="#fff" />
    ),
  },
  paintingServices: {
    label: "Painting Services",
    icon: () => (
      <MaterialCommunityIcons name="format-paint" size={14} color="#fff" />
    ),
  },
  welding: {
    label: "Welding",
    icon: () => <MaterialCommunityIcons name="torch" size={14} color="#fff" />,
  },
  glassInstallation: {
    label: "Glass Installation",
    icon: () => (
      <MaterialCommunityIcons name="window-maximize" size={14} color="#fff" />
    ),
  },
  airconRepairAndCleaning: {
    label: "Aircon Repair & Cleaning",
    icon: () => (
      <MaterialCommunityIcons name="air-conditioner" size={14} color="#fff" />
    ),
  },
  applianceRepair: {
    label: "Appliance Repair",
    icon: () => <MaterialCommunityIcons name="stove" size={14} color="#fff" />,
  },
  pestControlServices: {
    label: "Pest Control",
    icon: () => <MaterialCommunityIcons name="bug" size={14} color="#fff" />,
  },
  autoMechanic: {
    label: "Auto Mechanic",
    icon: () => <Ionicons name="car-sport-outline" size={14} color="#fff" />,
  },
  carWash: {
    label: "Car Wash",
    icon: () => (
      <MaterialCommunityIcons name="car-wash" size={14} color="#fff" />
    ),
  },
  motorcycleRepair: {
    label: "Motorcycle Repair",
    icon: () => (
      <MaterialCommunityIcons name="motorbike" size={14} color="#fff" />
    ),
  },
  carAirconRepair: {
    label: "Car Aircon Repair",
    icon: () => (
      <MaterialCommunityIcons name="car-cog" size={14} color="#fff" />
    ),
  },
  windowTinting: {
    label: "Window Tinting",
    icon: () => (
      <MaterialCommunityIcons name="filmstrip" size={14} color="#fff" />
    ),
  },
  caregiver: {
    label: "Caregiver",
    icon: () => <FontAwesome5 name="hands-helping" size={14} color="#fff" />,
  },
  personalDriver: {
    label: "Personal Driver",
    icon: () => <FontAwesome5 name="car" size={14} color="#fff" />,
  },
  massageTherapy: {
    label: "Massage Therapy",
    icon: () => (
      <MaterialCommunityIcons name="spa-outline" size={14} color="#fff" />
    ),
  },
  petGroomingAndPetCare: {
    label: "Pet Grooming & Care",
    icon: () => <MaterialCommunityIcons name="paw" size={14} color="#fff" />,
  },
  homeCleaningServices: {
    label: "Home Cleaning",
    icon: () => <MaterialCommunityIcons name="broom" size={14} color="#fff" />,
  },
  laundryServices: {
    label: "Laundry Services",
    icon: () => (
      <MaterialCommunityIcons name="washing-machine" size={14} color="#fff" />
    ),
  },
  gardening: {
    label: "Gardening",
    icon: () => <MaterialCommunityIcons name="shovel" size={14} color="#fff" />,
  },
  default: {
    label: (tag: string) => tag,
    icon: () => (
      <MaterialCommunityIcons name="tag-outline" size={14} color="#fff" />
    ),
  },
};

// Helper function to get display data
const getTagDisplayData = (tag: string) => {
  const metadata = jobTagMetadata[tag as keyof typeof jobTagMetadata];
  if (metadata && typeof metadata.label === "string") {
    return { label: metadata.label, Icon: metadata.icon };
  }
  const defaultMeta = jobTagMetadata.default;
  return {
    label:
      typeof defaultMeta.label === "function" ? defaultMeta.label(tag) : tag,
    Icon: defaultMeta.icon,
  };
};

// Re-add Achievement icon mapping helper
const getAchievementIcon = (iconName: string) => {
  switch (iconName) {
    case "trophy":
      return <FontAwesome5 name="trophy" size={24} color="#FFF" />;
    case "badge":
      return (
        <MaterialCommunityIcons name="certificate" size={24} color="#FFF" />
      );
    // Add other cases if needed from achievements.ts, otherwise default
    default:
      return <MaterialCommunityIcons name="medal" size={24} color="#FFF" />; // Default icon
  }
};

// Re-add Achievement Card component
const AchievementCard = ({ achievement }: { achievement: Achievement }) => (
  <View style={styles.achievementCard}>
    <View style={[styles.badgeIcon, { backgroundColor: achievement.color }]}>
      {getAchievementIcon(achievement.icon)}
    </View>
    <Text style={styles.achievementTitle}>{achievement.title}</Text>
    <Text style={styles.achievementDescription}>{achievement.description}</Text>
  </View>
);

const UtilityWorkerProfile: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteConfirmModalVisible, setDeleteConfirmModalVisible] =
    useState(false);
  const [editingSkills, setEditingSkills] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<{
    [key: string]: boolean;
  }>({});
  const [displayedSkills, setDisplayedSkills] = useState<string[]>([]);
  const [editingCredentials, setEditingCredentials] = useState(false);
  const [selectedCredentialImages, setSelectedCredentialImages] = useState<
    any[]
  >([]);
  const [currentCredentials, setCurrentCredentials] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<{ uri: string } | null>(
    null
  );
  const [selectedImageToReplace, setSelectedImageToReplace] = useState<{
    index: number;
    uri: string;
  } | null>(null);
  const [hasReplacedImage, setHasReplacedImage] = useState(false);
  const [selectedCredentialIndex, setSelectedCredentialIndex] = useState(0);

  const {
    data: worker,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchUserProfile,
  });

  console.log("Worker Data:", worker);
  // Log user ID specifically to help with debugging
  console.log("User ID for credential upload:", worker?.id, worker?.userId);
  // Mutation for updating Job Tags
  const updateTagsMutation = useMutation({
    mutationFn: updateUserJobTags,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      Alert.alert("Success", "Skills/Tags updated successfully!");
      setEditingSkills(false);
    },
    onError: (error) => {
      console.error("Error updating job tags:", error);
      Alert.alert("Error", "Failed to update skills/tags. Please try again.");
    },
  });

  // Initialize selected skills/tags when worker data changes and is available
  useEffect(() => {
    if (worker?.jobTags) {
      const initialSkills: { [key: string]: boolean } = {};
      worker.jobTags.forEach((tag: string) => {
        initialSkills[tag] = true;
      });
      setSelectedSkills(initialSkills);
      setDisplayedSkills([...worker.jobTags]);
    } else if (worker) {
      // Handle case where worker data exists but jobTags is empty/missing
      console.log(
        "Effect: Worker data exists, but worker.jobTags is missing or empty."
      );
      setDisplayedSkills([]);
      setSelectedSkills({});
    }
    // Only run when worker data itself changes (after loading)
  }, [worker]);

  // Update useEffect to handle multiple credentials
  useEffect(() => {
    if (worker) {
      // Handle credentials based on the response format
      if (Array.isArray(worker.credentials)) {
        // Backend is returning an array format (preferred)
        setCurrentCredentials(worker.credentials.filter(Boolean));
      } else if (typeof worker.credentials === "string" && worker.credentials.trim()) {
        // Legacy format - comma-separated string
        const credentialsArray = worker.credentials.split(",").filter(Boolean);
        setCurrentCredentials(credentialsArray);
      } else {
        // Default to empty array if credentials doesn't exist or is invalid
        setCurrentCredentials([]);
      }
    } else {
      // Initialize with empty array if worker doesn't exist
      setCurrentCredentials([]);
    }
  }, [worker]);

  // Toggle skill/tag selection
  const toggleSkill = (tag: string) => {
    setSelectedSkills((prev) => ({
      ...prev,
      [tag]: !prev[tag],
    }));
  };

  // Save skill/tag changes and update displayed skills via API
  const saveSkillChanges = () => {
    if (!worker?.id) {
      Alert.alert("Error", "Cannot save tags: User ID not found.");
      return;
    }
    const updatedTags = Object.keys(selectedSkills).filter(
      (tag) => selectedSkills[tag]
    );

    // Prepare data for the mutation
    const mutationData = {
      id: worker.id,
      jobTags: updatedTags,
    };

    // Trigger the mutation
    updateTagsMutation.mutate(mutationData);
  };

  // Render stars for rating
  const renderRating = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <AntDesign key={`star-${i}`} name="star" size={20} color="#FFD700" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <AntDesign
            key={`star-half`}
            name="star"
            size={20}
            color="#FFD700"
            style={{ opacity: 0.5 }}
          />
        );
      } else {
        stars.push(
          <AntDesign key={`star-${i}`} name="staro" size={20} color="#CCCCCC" />
        );
      }
    }

    return (
      <View style={styles.ratingContainer}>
        <View style={styles.stars}>{stars}</View>
        <Text style={styles.ratingText}>
          {rating?.toFixed(1)} ({worker?.completedJobs || 0} jobs)
        </Text>
      </View>
    );
  };

  // Navigation handlers

  const handleSettingsPress = () => {
    router.push("/screen/settings");
  };

  const toggleEditSkills = () => {
    setEditingSkills(!editingSkills);
  };

  const handleAboutInfoPress = () => {
    router.push("/screen/profile/about-info");
  };

  // Image picker function for credential upload
  const handleUploadCredential = async () => {
    try {
      // Limit to 5 images total
      const remainingSlots = 5 - selectedCredentialImages.length;
      
      if (remainingSlots <= 0) {
        setUploadFeedback({
          visible: true,
          message: "Maximum 5 images allowed. Please remove some images first.",
          type: "info",
        });
        
        setTimeout(() => {
          setUploadFeedback((prev) => ({ ...prev, visible: false }));
        }, 3000);
        return;
      }
      
      // Launch image picker with remaining slot limit
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5, // Slightly higher quality for better credential readability
        allowsMultipleSelection: true,
        selectionLimit: remainingSlots,
      });
      
      if (!result.canceled && result.assets.length > 0) {
        // Add new images to the selection, respecting the 5 image limit
        const updatedImages = [...selectedCredentialImages, ...result.assets];
        if (updatedImages.length > 5) {
          setSelectedCredentialImages(updatedImages.slice(0, 5));
          setUploadFeedback({
            visible: true,
            message: "Only the first 5 images were kept due to maximum limit.",
            type: "info",
          });
        } else {
          setSelectedCredentialImages(updatedImages);
        }
        setHasReplacedImage(true); // Mark that we have changes to save
      }
    } catch (error) {
      console.error("Image picker error:", error);
      setUploadFeedback({
        visible: true,
        message: "Could not access your photo library. Please check permissions.",
        type: "info",
      });
      
      setTimeout(() => {
        setUploadFeedback((prev) => ({ ...prev, visible: false }));
      }, 3000);
    }
  };

  // Mutation for uploading credentials using React Query
  const uploadCredentialMutation = useMutation({
    mutationFn: async (images: any[]) => {
      // Validate we have a user ID
      if (!worker?.id && !worker?.userId) {
        throw new Error("User ID not found");
      }
      
      // Use userId or id, whichever is available
      const userIdForUpload = worker.userId || worker.id;
      
      // Call the API function with properly prepared data
      return uploadCredential(
        userIdForUpload,
        images,
        currentCredentials || []
      );
    },
    onSuccess: () => {
      // Refresh profile data to show updated credentials
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      
      // Show success feedback
      setUploadFeedback({
        visible: true,
        message: "Credentials uploaded successfully!",
        type: "success",
      });
      
      // Clear feedback after delay
      setTimeout(() => {
        setUploadFeedback((prev) => ({ ...prev, visible: false }));
      }, 3000);
      
      // Reset UI state
      setIsUploading(false);
      setSelectedCredentialImages([]);
      setHasReplacedImage(false);
      setEditingCredentials(false);
    },
    onError: (error) => {
      console.error("Credential upload failed:", error);
      
      // Show error feedback
      setUploadFeedback({
        visible: true,
        message: "Failed to upload credentials. Please try again.",
        type: "info",
      });
      
      // Clear feedback after delay
      setTimeout(() => {
        setUploadFeedback((prev) => ({ ...prev, visible: false }));
      }, 3000);
      
      // Reset loading state but keep edit mode active
      setIsUploading(false);
    },
  });

  // Save credentials handler - processes images and sends to server
  const handleSaveCredentials = () => {
    if (selectedCredentialImages.length > 0) {
      // Show loading state
      setIsUploading(true);
      
      // Upload credentials to server
      uploadCredentialMutation.mutate(selectedCredentialImages);
    } else if (hasReplacedImage) {
      // Handle case where user removed all images but still wants to save
      setIsUploading(true);
      uploadCredentialMutation.mutate([]);
    } else {
      // No changes, just exit edit mode
      setEditingCredentials(false);
    }
  };

  // Remove a selected image from the current selection
  const removeSelectedImage = (index: number) => {
    setSelectedCredentialImages((prev) => prev.filter((_, i) => i !== index));
    // If we removed all images but previously had some, still mark as changed
    if (selectedCredentialImages.length === 1) {
      setHasReplacedImage(true);
    }
  };

  // State to track loading and feedback during upload
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<{
    visible: boolean;
    message: string;
    type: "success" | "info";
  }>({ visible: false, message: "", type: "info" });

  // Add this function to handle image preview
  const handleImagePreview = (imageUri: string) => {
    setPreviewImage({ uri: imageUri });
  };

  // Handler for replacing an existing image
  const handleReplaceImage = async (index: number) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
      });

      if (!result.canceled) {
        // Replace the image at the specified index
        const newImages = [...selectedCredentialImages];
        newImages[index] = result.assets[0];
        setSelectedCredentialImages(newImages);
        setHasReplacedImage(true);
      }
    } catch (error) {
      setUploadFeedback({
        visible: true,
        message: "Could not access your photo library. Please check permissions.",
        type: "info",
      });
      setTimeout(() => {
        setUploadFeedback((prev) => ({ ...prev, visible: false }));
      }, 3000);
    }
  };

  // --- Loading and Error States ---
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0B153C" />
      </View>
    );
  }

  if (isError || !worker) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Failed to load profile data.</Text>
      </View>
    );
  }

  // --- Prepare data for achievements modal ---
  const userEarnedAchievements =
    worker.achievement
      ?.map((userAch: any) => achievementsByTitle.get(userAch.achievementName))
      .filter((ach: Achievement | undefined): ach is Achievement => !!ach) ||
    []; // Map to local data and filter out nulls

  return (
    <ScrollView style={styles.container}>
      <View style={styles.actionsHeader}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleSettingsPress}
        >
          <Ionicons name="settings-outline" size={18} color="#0B153C" />
          <Text style={styles.actionButtonText}>Settings</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <Image
          source={{
            uri: worker.profileImage
              ? `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/${worker.profileImage}`
              : "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y",
          }}
          style={styles.profileImage}
        />
        <View style={styles.headerInfo}>
          <Text style={styles.name}>
            {worker.firstName} {worker.middleName} {worker.lastName}{" "}
            {worker.suffixName}
            <View
              style={[
                styles.verifiedBadge,
                !worker.isVerified && styles.unverifiedBadge,
              ]}
            >
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={worker.isVerified ? "#4CAF50" : "#9E9E9E"}
              />
            </View>
          </Text>
          <View style={styles.addressContainer}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.address}>
              {worker.houseNumber} {worker.street} {worker.barangay}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.aboutInfoButton}
            onPress={handleAboutInfoPress}
          >
            <Text style={styles.aboutInfoButtonText}>See About Info</Text>
            <AntDesign name="right" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {worker.userType === "job-seeker" && (
        <>
          {/* <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <FontAwesome5 name="toolbox" size={20} color="#0B153C" />
                <Text style={styles.infoValue}>
                  {worker.completedJobs || 0}
                </Text>
                <Text style={styles.infoLabel}>Jobs Done</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoItem}>
                <MaterialCommunityIcons
                  name="calendar-clock"
                  size={20}
                  color="#0B153C"
                />
                <Text style={styles.infoValue}>
                  {worker.createdAt ? new Date(worker.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
                </Text>
                <Text style={styles.infoLabel}>Joined</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoItem}>
                <MaterialCommunityIcons
                  name="cash"
                  size={20}
                  color="#0B153C"
                />
                <Text style={styles.infoValue}>
                  ₱{worker.profileRate?.toFixed(2) || "0.00"}
                </Text>
                <Text style={styles.infoLabel}>Rate</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.infoItem}>
                <AntDesign name="star" size={20} color="#0B153C" />
                <Text style={styles.infoValue}>
                  {worker.rating?.toFixed(1) || "0.0"}
                </Text>
                <Text style={styles.infoLabel}>Rating</Text>
              </View>
            </View>
          </View> */}

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Skills & Services</Text>
              <TouchableOpacity
                style={styles.sectionEditButton}
                disabled={updateTagsMutation.isPending}
                onPress={editingSkills ? saveSkillChanges : toggleEditSkills}
              >
                {editingSkills ? (
                  <>
                    {updateTagsMutation.isPending ? (
                      <ActivityIndicator
                        size="small"
                        color="#0B153C"
                        style={{ marginRight: 5 }}
                      />
                    ) : (
                      <AntDesign name="check" size={16} color="#0B153C" />
                    )}
                    <Text style={styles.sectionEditButtonText}>Save</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.sectionEditButtonText}>Edit</Text>
                    <AntDesign name="edit" size={16} color="#0B153C" />
                  </>
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.skillsContainer}>
              {editingSkills
                ? Object.keys(jobTagMetadata)
                    .filter((tag) => tag !== "default")
                    .map((tag, index) => {
                      const { label, Icon } = getTagDisplayData(tag);
                      const isSelected = selectedSkills[tag];
                      return (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.skillTag,
                            {
                              backgroundColor: isSelected
                                ? "#0B153C"
                                : "#e0e0e0",
                              borderWidth: 1,
                              borderColor: isSelected ? "#0B153C" : "#cccccc",
                            },
                          ]}
                          onPress={() => toggleSkill(tag)}
                        >
                          <Icon />
                          <Text
                            style={[
                              styles.skillText,
                              { marginLeft: 5 },
                              !isSelected && { color: "#666" },
                            ]}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                : displayedSkills.map((tag, index) => {
                    const { label, Icon } = getTagDisplayData(tag);
                    return (
                      <View key={index} style={styles.skillTag}>
                        <Icon />
                        <Text style={[styles.skillText, { marginLeft: 5 }]}>
                          {label}
                        </Text>
                      </View>
                    );
                  })}
              {!editingSkills && displayedSkills.length === 0 && (
                <Text style={styles.noDataText}>
                  No skills or services listed.
                </Text>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Achievements</Text>
              {userEarnedAchievements.length > 0 && (
                <TouchableOpacity
                  style={styles.seeAllButton}
                  onPress={() => setModalVisible(true)}
                >
                  <Text style={styles.seeAllText}>See All</Text>
                  <AntDesign name="right" size={16} color="#0B153C" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.achievementsContainer}>
              {userEarnedAchievements.length > 0 ? (
                userEarnedAchievements
                  .slice(0, 4)
                  .map((localAchievementData: Achievement) => (
                    <AchievementCard
                      key={localAchievementData.id}
                      achievement={localAchievementData}
                    />
                  ))
              ) : (
                <Text style={styles.noDataText}>
                  No achievements earned yet.
                </Text>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Credentials</Text>
              <View style={styles.credentialActions}>
                <TouchableOpacity
                  style={styles.addCredentialButton}
                  onPress={() => {
                    setEditingCredentials(true);
                    setSelectedCredentialImages([]);
                  }}
                >
                  <AntDesign name="plus" size={16} color="#0B153C" />
                  <Text style={styles.addCredentialText}>Add</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.editCredentialButton}
                  onPress={() => {
                    setEditingCredentials(!editingCredentials);
                  }}
                >
                  <AntDesign name="edit" size={16} color="#0B153C" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.credentialsContainer}>
              {isUploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="large" color="#0B153C" />
                  <Text style={styles.uploadingText}>
                    Uploading credentials...
                  </Text>
                </View>
              )}

              {uploadFeedback.visible && (
                <View
                  style={[
                    styles.feedbackOverlay,
                    uploadFeedback.type === "success"
                      ? styles.successOverlay
                      : styles.infoOverlay,
                  ]}
                >
                  <Text style={styles.feedbackText}>
                    {uploadFeedback.message}
                  </Text>
                </View>
              )}

              {editingCredentials ? (
                <>
                  {currentCredentials.length > 0 ? (
                    <>
                      <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={currentCredentials}
                        keyExtractor={(_, index) => index.toString()}
                        renderItem={({ item, index }) => (
                          <TouchableOpacity 
                            style={styles.credentialItem}
                            onPress={() => handleImagePreview(`http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/${item}`)}
                          >
                            <Image
                              source={{
                                uri: `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/${item}`,
                              }}
                              style={styles.credentialImage}
                              resizeMode="contain"
                            />
                            <View style={styles.imageOverlay}>
                              <Text style={styles.replaceText}>Tap to view</Text>
                            </View>
                          </TouchableOpacity>
                        )}
                        contentContainerStyle={styles.credentialsList}
                        onMomentumScrollEnd={(event) => {
                          const newIndex = Math.round(
                            event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width
                          );
                          setSelectedCredentialIndex(newIndex);
                        }}
                      />
                      <View style={styles.paginationContainer}>
                        {currentCredentials.map((_, index) => (
                          <View
                            key={index}
                            style={[
                              styles.paginationDot,
                              index === selectedCredentialIndex && styles.paginationDotActive,
                            ]}
                          />
                        ))}
                      </View>
                    </>
                  ) : (
                    <Text style={styles.noDataText}>
                      No credentials uploaded yet.
                    </Text>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.uploadCredentialButton,
                      selectedCredentialImages.length >= 5 &&
                        styles.disabledButton,
                    ]}
                    onPress={handleUploadCredential}
                    disabled={selectedCredentialImages.length >= 5}
                  >
                    <AntDesign
                      name="plus"
                      size={24}
                      color={
                        selectedCredentialImages.length >= 5
                          ? "#999"
                          : "#0B153C"
                      }
                    />
                    <Text
                      style={[
                        styles.uploadCredentialText,
                        selectedCredentialImages.length >= 5 &&
                          styles.disabledButtonText,
                      ]}
                    >
                      {selectedCredentialImages.length === 0
                        ? "Select Images"
                        : selectedCredentialImages.length >= 5
                        ? "Maximum 5 Images"
                        : `Add More (${5 - selectedCredentialImages.length} remaining)`}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : currentCredentials.length > 0 ? (
                <>
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={currentCredentials}
                    keyExtractor={(_, index) => index.toString()}
                    renderItem={({ item, index }) => (
                    <TouchableOpacity 
                      style={styles.credentialItem}
                        onPress={() => handleImagePreview(`http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/${item}`)}
                    >
                      <Image
                        source={{
                            uri: `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/${item}`,
                        }}
                        style={styles.credentialImage}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                    )}
                    contentContainerStyle={styles.credentialsList}
                    onMomentumScrollEnd={(event) => {
                      const newIndex = Math.round(
                        event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width
                      );
                      setSelectedCredentialIndex(newIndex);
                    }}
                  />
                  <View style={styles.paginationContainer}>
                    {currentCredentials.map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.paginationDot,
                          index === selectedCredentialIndex && styles.paginationDotActive,
                        ]}
                      />
                    ))}
                  </View>
                </>
              ) : (
                <Text style={styles.noDataText}>
                  No credentials uploaded yet.
                </Text>
              )}

              {/* Save Changes Button - Only show when we have images to upload or changes */}
              {editingCredentials && (
                <TouchableOpacity
                  style={[
                    styles.saveChangesButton,
                    uploadCredentialMutation.isPending && { opacity: 0.7 },
                    (!selectedCredentialImages.length && !hasReplacedImage) && { opacity: 0.5 }
                  ]}
                  onPress={handleSaveCredentials}
                  disabled={uploadCredentialMutation.isPending || (!selectedCredentialImages.length && !hasReplacedImage)}
                >
                  {uploadCredentialMutation.isPending ? (
                    <ActivityIndicator
                      size="small"
                      color="white"
                      style={{ marginRight: 8 }}
                    />
                  ) : (
                    <AntDesign name="check" size={20} color="white" />
                  )}
                  <Text style={styles.saveChangesText}>
                    {uploadCredentialMutation.isPending
                      ? "Uploading..."
                      : "Save Changes"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>All Achievements</Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <AntDesign name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={userEarnedAchievements}
                  renderItem={({ item }) => (
                    <AchievementCard achievement={item} />
                  )}
                  keyExtractor={(item) => item.id}
                  numColumns={2}
                  columnWrapperStyle={styles.achievementRow}
                  contentContainerStyle={styles.modalAchievementsContainer}
                  ListEmptyComponent={
                    <Text style={styles.noDataText}>
                      No achievements to display.
                    </Text>
                  }
                />
              </View>
            </View>
          </Modal>

          <Modal
            animationType="fade"
            transparent={true}
            visible={deleteConfirmModalVisible}
            onRequestClose={() => setDeleteConfirmModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.deleteConfirmModal}>
                <View style={styles.deleteConfirmHeader}>
                  <Text style={styles.deleteConfirmTitle}>
                    Remove Credential
                  </Text>
                  <TouchableOpacity
                    onPress={() => setDeleteConfirmModalVisible(false)}
                    style={styles.closeModalButton}
                  >
                    <AntDesign name="close" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.deleteConfirmText}>
                  Are you sure you want to remove this credential? This action
                  cannot be undone.
                </Text>
                <View style={styles.deleteConfirmActions}>
                  <TouchableOpacity
                    style={[styles.deleteConfirmButton, styles.cancelButton]}
                    onPress={() => setDeleteConfirmModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.deleteConfirmButton, styles.removeButton]}
                    onPress={() => {
                      // Clear the credential
                      setSelectedCredentialImages([]);
                      // TODO: Add API call to remove credential
                      console.log("Remove credential");
                      setDeleteConfirmModalVisible(false);
                    }}
                  >
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          <Modal
            animationType="fade"
            transparent={true}
            visible={!!previewImage}
            onRequestClose={() => setPreviewImage(null)}
          >
            <View style={styles.imagePreviewModal}>
              <TouchableOpacity
                style={styles.closePreviewButton}
                onPress={() => setPreviewImage(null)}
              >
                <AntDesign name="close" size={24} color="white" />
              </TouchableOpacity>
              {previewImage && (
                <Image
                  source={previewImage}
                  style={styles.fullSizeImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </Modal>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  uploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    zIndex: 10,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  uploadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#0B153C",
    fontWeight: "600",
  },
  feedbackOverlay: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
    padding: 15,
    borderRadius: 8,
    zIndex: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  successOverlay: {
    backgroundColor: "rgba(76, 175, 80, 0.9)", // Green with opacity
  },
  infoOverlay: {
    backgroundColor: "rgba(33, 150, 243, 0.9)", // Blue with opacity
  },
  feedbackText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  selectedImagePreview: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  previewImage: {
    width: 250,
    height: 180,
    borderRadius: 8,
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  credentialReplaceText: {
    textAlign: "center",
    marginTop: 8,
    color: "#FF3B30",
    fontSize: 14,
    fontWeight: "500",
  },
  currentCredentialContainer: {
    marginBottom: 15,
    alignItems: "center",
  },
  currentCredentialLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  currentCredentialImage: {
    width: 250,
    height: 180,
    borderRadius: 8,
  },
  credentialThumbnail: {
    width: 100,
    height: 80,
    borderRadius: 8,
    margin: 5,
  },
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 16,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
  },
  backButton: {
    marginBottom: 16,
    padding: 4,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  actionsHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginLeft: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButtonText: {
    color: "#0B153C",
    fontWeight: "600",
    marginLeft: 4,
  },
  sectionEditButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#0B153C",
  },
  sectionEditButtonText: {
    color: "#0B153C",
    fontWeight: "600",
    marginRight: 4,
    fontSize: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    borderColor: "#0B153C",
  },
  headerInfo: {
    marginLeft: 16,
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  address: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
    flex: 1,
  },
  aboutInfoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B153C",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  aboutInfoButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginRight: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  stars: {
    flexDirection: "row",
  },
  ratingText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#666",
  },
  infoCard: {
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
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoItem: {
    flex: 1,
    alignItems: "center",
  },
  infoValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginTop: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  divider: {
    height: 40,
    width: 1,
    backgroundColor: "#e0e0e0",
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
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0B153C",
    marginRight: 4,
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  skillTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0B153C",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    margin: 4,
  },
  skillText: {
    color: "#fff",
    fontWeight: "500",
  },
  skillToggleIcon: {
    marginLeft: 2,
  },
  horizontalScrollView: {
    flexGrow: 0,
  },
  horizontalScrollContent: {
    paddingRight: 16,
  },
  horizontalAchievementCard: {
    width: 150,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    padding: 12,
    marginRight: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  achievementsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  achievementCard: {
    width: "48%",
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  achievementRow: {
    justifyContent: "space-between",
  },
  badgeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 4,
  },
  modalAchievementsContainer: {
    padding: 16,
  },
  noDataText: {
    color: "#666",
    fontStyle: "italic",
    paddingVertical: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  errorText: {
    color: "red",
    fontSize: 16,
  },
  verifiedBadge: {
    marginLeft: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
    padding: 2,
  },
  unverifiedBadge: {
    backgroundColor: "#F5F5F5",
  },
  credentialsContainer: {
    marginTop: 8,
  },
  uploadCredentialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#0B153C",
    borderStyle: "dashed",
  },
  uploadCredentialText: {
    color: "#0B153C",
    fontWeight: "600",
    marginLeft: 8,
  },
  credentialsList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  credentialItem: {
    width: Dimensions.get('window').width - 64, // Full width minus padding
    aspectRatio: 4/3,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  credentialImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  imageViewText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  deleteCredentialButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 12,
    padding: 4,
  },
  maxCredentialsMessage: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFE5E5",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#FF3B30",
  },
  maxCredentialsText: {
    color: "#FF3B30",
    fontWeight: "600",
    marginLeft: 8,
  },
  credentialActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addCredentialButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#0B153C",
  },
  addCredentialText: {
    color: "#0B153C",
    fontWeight: "600",
    marginLeft: 4,
    fontSize: 14,
  },
  editCredentialButton: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 6,
    borderWidth: 1,
    borderColor: "#0B153C",
  },
  removeCredentialButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FF3B30",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteConfirmModal: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    width: "85%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  deleteConfirmHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  deleteConfirmTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  closeModalButton: {
    padding: 4,
  },
  deleteConfirmText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
    lineHeight: 22,
  },
  deleteConfirmActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  deleteConfirmButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
  },
  removeButton: {
    backgroundColor: "#FF3B30",
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "600",
    fontSize: 16,
  },
  removeButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  currentCredentialsContainer: {
    marginBottom: 20,
  },
  currentCredentialsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  currentCredentialItem: {
    width: "48%",
    aspectRatio: 4 / 3,
    borderRadius: 8,
    overflow: "hidden",
  },
  selectedImagesContainer: {
    marginBottom: 20,
  },
  selectedImagesLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  selectedImagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  selectedImageItem: {
    width: "48%",
    aspectRatio: 4 / 3,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  credentialsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  disabledButton: {
    borderColor: "#999",
    backgroundColor: "#f5f5f5",
  },
  disabledButtonText: {
    color: "#999",
  },
  imagePreviewModal: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  closePreviewButton: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 1,
    padding: 8,
  },
  fullSizeImage: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  replaceText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  saveChangesButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B153C",
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  saveChangesText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  paginationDotActive: {
    backgroundColor: '#0B153C',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});

export default UtilityWorkerProfile;
