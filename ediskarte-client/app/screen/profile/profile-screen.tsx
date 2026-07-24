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
import { fetchUserProfile, updateUserJobTags } from "@/api/profile-request";
import * as ImagePicker from 'expo-image-picker';

// Import local achievement data
import achievementsData from "./achievements";

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
  const [editingSkills, setEditingSkills] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<{
    [key: string]: boolean;
  }>({});
  const [displayedSkills, setDisplayedSkills] = useState<string[]>([]);
  const [editingCredentials, setEditingCredentials] = useState(false);

  const {
    data: worker,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchUserProfile,
  });

  console.log("Worker Data:", worker);
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
    router.push("../../settings");
  };

  const toggleEditSkills = () => {
    setEditingSkills(!editingSkills);
  };

  const handleAboutInfoPress = () => {
    router.push("../../about-info");
  };

  const handleUploadCredential = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled) {
        Alert.alert('Success', 'Image selected successfully. Upload functionality will be implemented soon.');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
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
              : require("assets/images/default-user.png"),
          }}
          style={styles.profileImage}
        />
        <View style={styles.headerInfo}>
          <Text style={styles.name}>
            {worker.firstName} {worker.middleName} {worker.lastName}{" "}
            {worker.suffixName}
            <View style={[styles.verifiedBadge, !worker.isVerified && styles.unverifiedBadge]}>
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
              <Text style={styles.sectionTitle}>Credentials & Certificates</Text>
              <TouchableOpacity
                style={styles.sectionEditButton}
                onPress={() => setEditingCredentials(!editingCredentials)}
              >
                {editingCredentials ? (
                  <>
                    <AntDesign name="check" size={16} color="#0B153C" />
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

            <View style={styles.credentialsContainer}>
              {editingCredentials ? (
                worker.credentials && worker.credentials.length >= 5 ? (
                  <View style={styles.maxCredentialsMessage}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#FF3B30" />
                    <Text style={styles.maxCredentialsText}>Maximum of 5 credentials reached</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.uploadCredentialButton}
                    onPress={handleUploadCredential}
                  >
                    <AntDesign name="plus" size={24} color="#0B153C" />
                    <Text style={styles.uploadCredentialText}>Upload Credential or Certificate</Text>
                  </TouchableOpacity>
                )
              ) : null}

              {worker.credentials && worker.credentials.length > 0 ? (
                <View style={styles.credentialsList}>
                  {worker.credentials.map((credential: any, index: number) => (
                    <View key={index} style={styles.credentialItem}>
                      <Image
                        source={{
                          uri: `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/${credential.imageUrl}`,
                        }}
                        style={styles.credentialImage}
                      />
                      {editingCredentials && (
                        <TouchableOpacity
                          style={styles.deleteCredentialButton}
                          onPress={() => Alert.alert('Delete Credential', 'This feature will be implemented soon.')}
                        >
                          <AntDesign name="delete" size={20} color="#FF3B30" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noDataText}>No credentials uploaded yet.</Text>
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
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
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
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 2,
  },
  unverifiedBadge: {
    backgroundColor: '#F5F5F5',
  },
  credentialsContainer: {
    marginTop: 8,
  },
  uploadCredentialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#0B153C',
    borderStyle: 'dashed',
  },
  uploadCredentialText: {
    color: '#0B153C',
    fontWeight: '600',
    marginLeft: 8,
  },
  credentialsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  credentialItem: {
    position: 'relative',
    width: '48%',
    aspectRatio: 4/3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  credentialImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  deleteCredentialButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    padding: 4,
  },
  maxCredentialsMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  maxCredentialsText: {
    color: '#FF3B30',
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default UtilityWorkerProfile;
