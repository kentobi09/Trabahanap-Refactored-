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
import { fetchUserProfile, updateUserJobTags, fetchUserAchievements } from "@/api/profile-request";

// Import local achievement data
import achievementsData from "../../../screen/profile/achievements";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

// Create lookup maps for faster access
const achievementsByTitle = new Map<string, Achievement>(
  achievementsData.map((a) => [a.title, a])
);

// Define StyleSheet
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 16,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
  },
  backButton: {
    marginBottom: 16,
    padding: 8,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
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
    marginBottom: 8,
  },
  stars: {
    flexDirection: "row",
  },
  ratingText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#666",
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  userInfo: {
    flex: 1,
  },
  userInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  userInfoLabel: {
    width: 90,
    fontSize: 14,
    color: "#666",
  },
  userInfoValue: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
  editButton: {
    marginLeft: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f2f2f2",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  skillEditButton: {
    backgroundColor: "#0B153C",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginLeft: 8,
  },
  skillEditButtonText: {
    color: "#fff",
    fontSize: 12,
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
  achievementCard: {
    width: "48%",
    backgroundColor: "#fff",
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
  badgeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  achievement: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "red",
    fontSize: 16,
    textAlign: "center",
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
    marginLeft: 5,
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
  achievementsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  noDataText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    padding: 10,
    fontStyle: "italic",
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
    marginBottom: 16,
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 4,
  },
  achievementRow: {
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalAchievementsContainer: {
    padding: 8,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  // Removed duplicate name style property as it's already defined above
  // Keep this comment as a placeholder for readability
  username: {
    fontSize: 16,
    color: "#666",
    marginBottom: 8,
  },
  rating: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginLeft: 4,
  },
  profileBio: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginHorizontal: 16,
    marginBottom: 16,
  },
  editButtonText: {
    fontSize: 14,
    color: "#0B153C",
    fontWeight: "500",
  },
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 16,
  },
  profileButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  buttonText: {
    marginLeft: 6,
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewAllButtonText: {
    fontSize: 14,
    color: "#0B153C",
    marginRight: 4,
  },
  achievementsPreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
});

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
      <MaterialCommunityIcons name="hammer-screwdriver" size={14} color="#fff" />
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

// Enhanced Achievement icon mapping helper
const getAchievementIcon = (iconName: string) => {
  switch (iconName?.toLowerCase()) {
    case "trophy":
      return <FontAwesome5 name="trophy" size={24} color="#FFF" />;
    case "badge":
      return <MaterialCommunityIcons name="certificate" size={24} color="#FFF" />;
    case "star":
      return <AntDesign name="star" size={24} color="#FFF" />;
    case "like":
      return <AntDesign name="like1" size={24} color="#FFF" />;
    case "heart":
      return <AntDesign name="heart" size={24} color="#FFF" />;
    case "check":
      return <AntDesign name="check" size={24} color="#FFF" />;
    case "medal":
      return <MaterialCommunityIcons name="medal" size={24} color="#FFF" />;
    // Default fallback for any unrecognized icon name
    default:
      console.log(`Using default icon for unrecognized icon name: ${iconName}`);
      return <FontAwesome5 name="award" size={24} color="#FFF" />;
  }
};

// Enhanced Achievement Card component with date earned
const AchievementCard = ({ achievement }: { achievement: Achievement }) => {
  // Use the proper icon mapping helper function
  const renderIcon = () => {
    // Get the correct icon component based on the icon name
    if (!achievement.icon) {
      return <FontAwesome5 name="trophy" size={32} color="#fff" />;
    }
    
    // Scale up the size from the helper function
    const iconElement = getAchievementIcon(achievement.icon);
    // Clone the element with a larger size for the achievement card
    return React.cloneElement(iconElement, { size: 32 });
  };

  return (
    <View style={styles.achievementCard}>
      <View
        style={[styles.badgeIcon, { backgroundColor: achievement.color }]}
      >
        {renderIcon()}
      </View>
      <Text style={styles.achievementTitle}>{achievement.title}</Text>
      <Text style={styles.achievementDescription}>
        {achievement.description}
      </Text>
    </View>
  );
};

const UtilityWorkerProfile: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSkills, setEditingSkills] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<{
    [key: string]: boolean;
  }>({});
  const [displayedSkills, setDisplayedSkills] = useState<string[]>([]);
  
  // State for achievements
  const [achievements, setAchievements] = useState<any[]>([]);
  const [achievementsLoading, setAchievementsLoading] = useState(false);
  const [achievementsError, setAchievementsError] = useState(false);

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
  // Fetch achievements separately using the fetchUserAchievements function
  useEffect(() => {
    const getAchievements = async () => {
      if (worker?.id) {
        try {
          setAchievementsLoading(true);
          const achievementsData = await fetchUserAchievements(worker.id);
          console.log("Fetched achievements data:", achievementsData);
          setAchievements(achievementsData);
          setAchievementsError(false);
        } catch (error) {
          console.error("Error fetching achievements:", error);
          setAchievementsError(true);
          setAchievements([]);
        } finally {
          setAchievementsLoading(false);
        }
      }
    };

    if (worker?.id) {
      getAchievements();
    }
  }, [worker?.id]);

  // Fetch achievements when worker data is loaded
  useEffect(() => {
    const getAchievements = async () => {
      if (worker?.id) {
        try {
          setAchievementsLoading(true);
          const achievementsData = await fetchUserAchievements(worker.id);
          console.log("Fetched achievements data:", achievementsData);
          setAchievements(achievementsData);
          setAchievementsError(false);
        } catch (error) {
          console.error("Error fetching achievements:", error);
          setAchievementsError(true);
          setAchievements([]);
        } finally {
          setAchievementsLoading(false);
        }
      }
    };

    if (worker?.id) {
      getAchievements();
    }
  }, [worker?.id]);

  // Initialize job tags when worker data changes
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
  const handleEditPress = () => {
    router.push("./");
  };

  const handleSettingsPress = () => {
    router.push("/screen/settings");
  };

  const toggleEditSkills = () => {
    setEditingSkills(!editingSkills);
  };

  const handleAboutInfoPress = () => {
    router.push("/screen/profile/about-info");
  };

  const handleGoBack = () => {
    router.back();
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

  // Log worker data for debugging
  console.log("Worker data:", worker);
  
  // --- Prepare data for achievements modal ---
  console.log("Backend Achievements:", achievements);
  console.log("Local Achievements Map:", Array.from(achievementsByTitle.entries()));
  
  // Process user achievements from backend
  const userEarnedAchievements = achievements && achievements.length > 0
    ? achievements
      .map((userAch: any) => {
        // For debugging
        console.log("Processing achievement:", userAch);
        
        const achievementName = userAch.achievementName;
        // Try to find the local achievement definition
        let localAchievement = achievementsByTitle.get(achievementName);
        
        // If not found directly, try case-insensitive matching
        if (!localAchievement) {
          // Log for debugging
          console.log(`Direct match not found for: ${achievementName}`);
          
          // Try to find a case-insensitive match
          for (const [title, achievement] of achievementsByTitle.entries()) {
            if (title.toLowerCase() === achievementName.toLowerCase()) {
              localAchievement = achievement;
              console.log(`Found case-insensitive match: ${title}`);
              break;
            }
          }
        }
        
        // Return the found achievement with backend data
        if (localAchievement) {
          console.log(`Matched achievement: ${localAchievement.title}`);
          return {
            ...localAchievement,
            dateAchieved: userAch.dateAchieved,
            userId: userAch.userId
          };
        } else {
          console.log(`No match found for: ${achievementName}`);
          return undefined;
        }
      })
      .filter((ach: Achievement | undefined): ach is Achievement => !!ach)
    : []; // Map to local data and filter out nulls
    
  console.log("Processed Achievements:", userEarnedAchievements);

  return (
    <ScrollView style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
        <Ionicons name="arrow-back-outline" size={24} color="#333" />
      </TouchableOpacity>

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

      {worker.userType === "jobseeker" && (
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
                          },
                        ]}
                        onPress={() => toggleSkill(tag)}
                      >
                        <Icon />
                        <Text
                          style={[
                            styles.skillText,
                            { color: isSelected ? "#fff" : "#333" },
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })
              : displayedSkills.map((skill, index) => {
                  const { label, Icon } = getTagDisplayData(skill);
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
      )}

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
          {achievementsLoading ? (
            <ActivityIndicator size="small" color="#0B153C" />
          ) : achievementsError ? (
            <Text style={styles.errorText}>Failed to load achievements.</Text>
          ) : userEarnedAchievements.length > 0 ? (
            userEarnedAchievements
              .slice(0, 4)
              .map((localAchievementData) => {
                // Skip rendering if data is undefined
                if (!localAchievementData) return null;
                return (
                  <AchievementCard
                    key={localAchievementData.id}
                    achievement={localAchievementData}
                  />
                );
              })
          ) : (
            <Text style={styles.noDataText}>No achievements earned yet.</Text>
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
              renderItem={({ item }) => {
                // Skip rendering if item is undefined
                if (!item) return null;
                return <AchievementCard achievement={item} />;
              }}
              keyExtractor={(item) => item?.id || 'unknown'}
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
    </ScrollView>
  );
};

export default UtilityWorkerProfile;
