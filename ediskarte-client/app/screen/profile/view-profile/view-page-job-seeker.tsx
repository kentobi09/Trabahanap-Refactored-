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
  Dimensions,
} from "react-native";
import {
  AntDesign,
  MaterialCommunityIcons,
  Ionicons,
  FontAwesome5,
  Entypo,
} from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";

// Import the achievements data
import achievementsData from "../achievements";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Feedback {
  id: string;
  rating: number;
  comment: string;
  date: string;
  anonymousName: string;
}

interface WorkerData {
  name: string;
  profileImage: string;
  address: string;
  rating: number;
  completedJobs: number;
  yearsExperience: number;
  skills: string[];
  achievements: Achievement[];
  email: string;
  phoneNumber: string;
  gender: string;
  birthday: string;
  feedbacks: Feedback[];
  jobsDone: number;
  dateJoined?: string;
  rate?: number;
  isVerified: boolean;
  credentials?: any[];
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

const UtilityWorkerProfile: React.FC = () => {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(
    null
  );
  const { otherParticipantId,isFromChat } = useLocalSearchParams();
  const [worker, setWorker] = useState<WorkerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [credentialsModalVisible, setCredentialsModalVisible] = useState(false);
  const [selectedCredentialIndex, setSelectedCredentialIndex] = useState(0);

  const jobseekerId = Array.isArray(otherParticipantId)
    ? otherParticipantId[0]
    : otherParticipantId;

  useEffect(() => {
    fetchData();
  }, [jobseekerId]);

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        router.replace("/sign_in");
        return;
      }

      console.log("Fetching profile for ID:", jobseekerId);

      // Fetch profile data
      const profileResponse = await fetch(
        `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/user/profile/${jobseekerId}/details`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("Profile response:", profileResponse);

      if (!profileResponse.ok) {
        console.error("Profile response status:", profileResponse.status);
        throw new Error("Failed to fetch profile data");
      }

      const profileData = await profileResponse.json();
      console.log("Received profile data:", profileData);

      // Fetch job tags
      const tagsResponse = await fetch(
        `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/api/job-seeker/${jobseekerId}/tags`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!tagsResponse.ok) {
        console.error("Tags response status:", tagsResponse.status);
        throw new Error("Failed to fetch job tags");
      }

      const tagsData = await tagsResponse.json();
      console.log("Received tags data:", tagsData);

      // Fetch reviews
      const reviewsResponse = await fetch(
        `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/user/reviews/${jobseekerId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!reviewsResponse.ok) {
        console.error("Reviews response status:", reviewsResponse.status);
        throw new Error("Failed to fetch reviews");
      }

      const reviewsData = await reviewsResponse.json();
      console.log("Received reviews data:", reviewsData);

      // Combine profile data with job tags and reviews
      const combinedData = {
        ...profileData,
        skills: tagsData.jobTags || [],
        profileImage: profileData.profileImage
          ? `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/${profileData.profileImage}`
          : "",
        feedbacks: reviewsData || [],
        jobsDone: profileData.jobsDone,
        dateJoined: profileData.joinedAt,
        rate: profileData.rate,
        isVerified: profileData.isVerified,
        credentials: profileData.credentials || [],
      };

      setWorker(combinedData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f8f9fa",
        }}
      >
        <ActivityIndicator size="large" color="#0B153C" />
      </View>
    );
  }

  if (!worker) {
    return (
      <View style={styles.container}>
        <Text>Profile not found</Text>
      </View>
    );
  }

  const getAverageRating = (feedbacks: Feedback[]): number => {
    if (!feedbacks || feedbacks.length === 0) return 0;
    const total = feedbacks.reduce((sum, f) => sum + f.rating, 0);
    return total / feedbacks.length;
  };

  const averageRating = getAverageRating(worker.feedbacks);

  // Render stars for rating (will be used in info card)
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
          {rating.toFixed(1)} ({worker.jobsDone} jobs)
        </Text>
      </View>
    );
  };

  // Achievement icon mapping
  const getAchievementIcon = (iconName: string) => {
    switch (iconName) {
      case "trophy":
        return <FontAwesome5 name="trophy" size={24} color="#FFF" />;
      case "badge":
        return (
          <MaterialCommunityIcons name="certificate" size={24} color="#FFF" />
        );
      case "bulb1":
        return <Entypo name="light-bulb" size={24} color="#FFF" />;
      case "gauge":
        return <MaterialCommunityIcons name="gauge" size={24} color="#FFF" />;
      case "leaf":
        return <Entypo name="leaf" size={24} color="#FFF" />;
      default:
        return <MaterialCommunityIcons name="medal" size={24} color="#FFF" />;
    }
  };

  const handleAboutInfoPress = () => {
    router.push({
      pathname: "../view-about-info",
      params: { otherParticipantId },
    });
  };
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);
    return `${month}/${day}/${year}`;
  };

  // Then in your JSX:

  // Achievement Card component for reusability
  const AchievementCard = ({ achievement }: { achievement?: Achievement }) => {
    if (!achievement) {
      return (
        <View style={[styles.achievementCard, styles.emptyAchievementCard]}>
          <View style={[styles.badgeIcon, { backgroundColor: "#CCCCCC" }]}>
            <MaterialCommunityIcons
              name="medal-outline"
              size={24}
              color="#FFF"
            />
          </View>
          <Text style={styles.achievementTitle}>No achievements yet</Text>
          <Text style={styles.achievementDescription}>
            Complete jobs to earn achievements
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.achievementCard}>
        <View
          style={[styles.badgeIcon, { backgroundColor: achievement.color }]}
        >
          {getAchievementIcon(achievement.icon)}
        </View>
        <Text style={styles.achievementTitle}>{achievement.title}</Text>
        <Text style={styles.achievementDescription}>
          {achievement.description}
        </Text>
      </View>
    );
  };

  const handleFeedbackPress = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setFeedbackModalVisible(true);
  };

  const renderFeedbackStars = (rating: number) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <AntDesign
          key={`feedback-star-${i}`}
          name={i < rating ? "star" : "staro"}
          size={16}
          color={i < rating ? "#FFD700" : "#CCCCCC"}
        />
      );
    }
    return <View style={styles.feedbackStars}>{stars}</View>;
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <ScrollView style={styles.container}>
      {/* Back button */}
      <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
        <Ionicons name="arrow-back-outline" size={24} color="#333" />
      </TouchableOpacity>

      {/* Header card is always visible */}
      <View style={styles.header}>
        <Image
          source={{ uri: worker.profileImage }}
          style={styles.profileImage}
        />
        <View style={styles.headerInfo}>
          <View style={styles.nameContainer}>
            <Text style={styles.name}>{worker.name}</Text>
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
          </View>
          <View style={styles.addressContainer}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.address}>{worker.address}</Text>
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

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <FontAwesome5 name="toolbox" size={20} color="#0B153C" />
            <Text style={styles.infoValue}>{worker.jobsDone}</Text>
            <Text style={styles.infoLabel}>Jobs Done</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoItem}>
            <AntDesign name="calendar" size={20} color="#0B153C" />
            <Text style={styles.dateJoinedText}>
              {worker.dateJoined ? formatDate(worker.dateJoined) : "N/A"}
            </Text>
            <Text style={styles.infoLabel}>Joined</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoItem}>
            <FontAwesome5 name="money-bill-wave" size={20} color="#0B153C" />
            <Text style={styles.infoValue}>
              {worker.rate ? `₱${worker.rate}` : "N/A"}
            </Text>
            <Text style={styles.infoLabel}>Rate</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoItem}>
            <AntDesign name="star" size={20} color="#0B153C" />
            <Text style={styles.infoValue}>{averageRating.toFixed(1)}</Text>
            <Text style={styles.infoLabel}>Rating</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Skills & Services</Text>
        </View>
        <View style={styles.skillsContainer}>
          {worker.skills.map((skill, index) => (
            <View key={index} style={styles.skillTag}>
              <Text style={styles.skillText}>{skill}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <TouchableOpacity
            style={styles.seeAllButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.seeAllText}>See All</Text>
            <AntDesign name="right" size={16} color="#0B153C" />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScrollView}
          contentContainerStyle={styles.horizontalScrollContent}
        >
          {worker.achievements.map((achievement) => (
            <View key={achievement.id} style={styles.horizontalAchievementCard}>
              <View
                style={[
                  styles.badgeIcon,
                  { backgroundColor: achievement.color },
                ]}
              >
                {getAchievementIcon(achievement.icon)}
              </View>
              <Text style={styles.achievementTitle}>{achievement.title}</Text>
              <Text style={styles.achievementDescription}>
                {achievement.description}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        {isFromChat == "true" && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Credentials & Certificates</Text>
            </View>
            <View style={styles.credentialsContainer}>
              {worker.credentials && worker.credentials.length > 0 ? (
                <>
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={worker.credentials}
                    keyExtractor={(_, index) => index.toString()}
                    renderItem={({ item, index }) => (
                      <TouchableOpacity 
                        style={styles.credentialItem}
                        onPress={() => {
                          setSelectedCredentialIndex(index);
                          setCredentialsModalVisible(true);
                        }}
                      >
                        <Image
                          source={{
                            uri: `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/${item}`,
                          }}
                          style={styles.credentialImage}
                        />
                      </TouchableOpacity>
                    )}
                    contentContainerStyle={styles.credentialsList}
                  />
                  <View style={styles.paginationContainer}>
                    {worker.credentials.map((_, index) => (
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
                <Text style={styles.noDataText}>No credentials or certificates uploaded yet.</Text>
              )}
            </View>
          </>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Feedbacks</Text>
          <TouchableOpacity
            style={styles.seeAllButton}
            onPress={() =>
              router.push({
                pathname: "./view-all-feedbacks",
                params: { otherParticipantId },
              })
            }
          >
            <Text style={styles.seeAllText}>See All</Text>
            <AntDesign name="right" size={16} color="#0B153C" />
          </TouchableOpacity>
        </View>

        {worker.feedbacks.slice(0, 3).map((feedback) => (
          <TouchableOpacity
            key={feedback.id}
            style={styles.feedbackCard}
            onPress={() => handleFeedbackPress(feedback)}
          >
            <View style={styles.feedbackHeader}>
              <Text style={styles.feedbackAnonymousName}>
                {feedback.anonymousName}
              </Text>
              {renderFeedbackStars(feedback.rating)}
            </View>
            <Text style={styles.feedbackComment} numberOfLines={2}>
              {feedback.comment}
            </Text>
            <Text style={styles.feedbackDate}>{formatDate(feedback.date)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Modal for "See All" achievements */}
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
              data={worker.achievements}
              renderItem={({ item }) => <AchievementCard achievement={item} />}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.achievementRow}
              contentContainerStyle={styles.modalAchievementsContainer}
            />
          </View>
        </View>
      </Modal>

      {/* Feedback Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={feedbackModalVisible}
        onRequestClose={() => setFeedbackModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Feedback Details</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setFeedbackModalVisible(false)}
              >
                <AntDesign name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedFeedback && (
              <View style={styles.feedbackDetailContainer}>
                <View style={styles.feedbackDetailHeader}>
                  <Text style={styles.feedbackDetailName}>
                    {selectedFeedback.anonymousName}
                  </Text>
                  {renderFeedbackStars(selectedFeedback.rating)}
                </View>
                <Text style={styles.feedbackDetailDate}>
                  {formatDate(selectedFeedback.date)}
                </Text>
                <Text style={styles.feedbackDetailComment}>
                  {selectedFeedback.comment}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Credentials Full Screen Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={credentialsModalVisible}
        onRequestClose={() => setCredentialsModalVisible(false)}
      >
        <View style={styles.fullScreenModalContainer}>
          <TouchableOpacity
            style={styles.closeFullScreenButton}
            onPress={() => setCredentialsModalVisible(false)}
          >
            <AntDesign name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          
          <FlatList
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            data={worker.credentials}
            keyExtractor={(_, index) => index.toString()}
            renderItem={({ item }) => (
              <Image
                source={{
                  uri: `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/${item}`,
                }}
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
            )}
            onMomentumScrollEnd={(event) => {
              const newIndex = Math.round(
                event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width
              );
              setSelectedCredentialIndex(newIndex);
            }}
            initialScrollIndex={selectedCredentialIndex}
            getItemLayout={(_, index) => ({
              length: Dimensions.get('window').width,
              offset: Dimensions.get('window').width * index,
              index,
            })}
          />
          
          <View style={styles.fullScreenPaginationContainer}>
            {worker.credentials?.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.fullScreenPaginationDot,
                  index === selectedCredentialIndex && styles.fullScreenPaginationDotActive,
                ]}
              />
            ))}
          </View>
        </View>
      </Modal>
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
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
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
  dateJoinedText: {
    fontSize: 13.5,
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
  feedbackCard: {
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  feedbackHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  feedbackAnonymousName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  feedbackStars: {
    flexDirection: "row",
  },
  feedbackComment: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  feedbackDate: {
    fontSize: 12,
    color: "#999",
  },
  feedbackDetailContainer: {
    padding: 16,
  },
  feedbackDetailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  feedbackDetailName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  feedbackDetailDate: {
    fontSize: 14,
    color: "#999",
    marginBottom: 12,
  },
  feedbackDetailComment: {
    fontSize: 16,
    color: "#333",
    lineHeight: 24,
  },
  emptyAchievementCard: {
    opacity: 0.7,
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
  credentialsList: {
    paddingRight: 16,
  },
  credentialItem: {
    width: 200,
    height: 150,
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  credentialImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CCCCCC',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#0B153C',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  fullScreenModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeFullScreenButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
    padding: 8,
  },
  fullScreenImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  fullScreenPaginationContainer: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenPaginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  fullScreenPaginationDotActive: {
    backgroundColor: '#FFFFFF',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});

export default UtilityWorkerProfile;
