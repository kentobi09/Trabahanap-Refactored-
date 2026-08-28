import React, { useState, useEffect } from 'react';
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
  Dimensions
} from 'react-native';
import { AntDesign, MaterialCommunityIcons, Ionicons, FontAwesome5, Entypo } from '@expo/vector-icons';
import { useRouter,useLocalSearchParams } from 'expo-router';
import { safePush, safeReplace, safeBack } from '../../../constants/navigation';

// Import the achievements data
import achievementsData from '../achievements';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Feedback {
  id: string;
  rating: number;
  comment: string;
  date: string;
  anonymousName: string;
  avatar?: string;
  jobRequest?: any;
  jobTitle?: string;
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
  joinedAt: string;
  isVerified: boolean;
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
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showRoleTooltip, setShowRoleTooltip] = useState(false);
  const { otherParticipantId } = useLocalSearchParams();
  const [worker, setWorker] = useState<WorkerData | null>(null);
  const [loading, setLoading] = useState(true);

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
        safeReplace("/sign_in");
        return;
      }

      console.log('Fetching profile for ID:', jobseekerId);
      
      // Fetch profile data using /user/profile/:id/details endpoint
      const profileResponse = await fetch(
        `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/user/profile/${jobseekerId}/details`,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );

      if (!profileResponse.ok) {
        console.error('Profile response status:', profileResponse.status);
        throw new Error('Failed to fetch profile data');
      }

      const profileData = await profileResponse.json();
      console.log('Received profile data:', profileData);

      // Fetch reviews (fallback silently to [] if missing)
      let reviewsData = [];
      try {
        const reviewsResponse = await fetch(
          `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/user/reviews/${jobseekerId}`,
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
          }
        );
        if (reviewsResponse.ok) {
          reviewsData = await reviewsResponse.json();
        }
      } catch (e) {
        console.log("No reviews found for client:", e);
      }

      const userObj = profileData.user || profileData;

      const formatImg = (imgStr: any) => {
        if (!imgStr || typeof imgStr !== "string") return "";
        if (imgStr.startsWith("http://") || imgStr.startsWith("https://") || imgStr.startsWith("data:")) return imgStr;
        const clean = imgStr.replace(/\\/g, "/").replace(/^\/+/, "");
        return `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/${clean}`;
      };

      // Combine profile data with reviews
      const combinedData = {
        ...profileData,
        id: userObj.id || profileData.jobSeekerId || jobseekerId,
        name: `${userObj.firstName || ""} ${userObj.middleName || ""} ${userObj.lastName || ""}`.trim() || "Employer",
        address: `${userObj.houseNumber || ""} ${userObj.street || ""} ${userObj.barangay || ""}`.trim() || "Not Specified",
        profileImage: formatImg(userObj.profileImage || profileData.profileImage),
        feedbacks: reviewsData || [],
        joinedAt: userObj.joinedAt || profileData.joinedAt || '',
        isVerified: userObj.verificationStatus === "verified" || profileData.isVerified || false,
      };
      
      setWorker(combinedData);
    } catch (error) {
      console.error("Error fetching client profile data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
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

  // Render stars for rating (will be used in info card)
  const renderRating = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating - fullStars >= 0.5;
    
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<AntDesign key={`star-${i}`} name="star" size={20} color="#FFD700" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<AntDesign key={`star-half`} name="star" size={20} color="#FFD700" style={{opacity: 0.5}} />);
      } else {
        stars.push(<AntDesign key={`star-${i}`} name="staro" size={20} color="#CCCCCC" />);
      }
    }
    
    return (
      <View style={styles.ratingContainer}>
        <View style={styles.stars}>{stars}</View>
        <Text style={styles.ratingText}>{rating.toFixed(1)} ({worker.completedJobs} jobs)</Text>
      </View>
    );
  };
  
  // Achievement icon mapping
  const getAchievementIcon = (iconName: string) => {
    switch(iconName) {
      case 'trophy':
        return <FontAwesome5 name="trophy" size={24} color="#FFF" />;
      case 'badge':
        return <MaterialCommunityIcons name="certificate" size={24} color="#FFF" />;
      case 'bulb1':
        return <Entypo name="light-bulb" size={24} color="#FFF" />;
      case 'gauge':
        return <MaterialCommunityIcons name="gauge" size={24} color="#FFF" />;
      case 'leaf':
        return <Entypo name="leaf" size={24} color="#FFF" />;
      default:
        return <MaterialCommunityIcons name="medal" size={24} color="#FFF" />;
    }
  };
  
  const handleAboutInfoPress = () => {
    safePush('../view-about-info-client', { otherParticipantId: jobseekerId });
  };
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit'
    });
  };
  
  // Then in your JSX:

  // Achievement Card component for reusability
  const AchievementCard = ({ achievement }: { achievement?: Achievement }) => {
    if (!achievement) {
      return (
        <View style={[styles.achievementCard, styles.emptyAchievementCard]}>
          <View style={[styles.badgeIcon, { backgroundColor: '#CCCCCC' }]}>
            <MaterialCommunityIcons name="medal-outline" size={24} color="#FFF" />
          </View>
          <Text style={styles.achievementTitle}>No achievements yet</Text>
          <Text style={styles.achievementDescription}>Complete jobs to earn achievements</Text>
        </View>
      );
    }
  
    return (
      <View style={styles.achievementCard}>
        <View style={[styles.badgeIcon, { backgroundColor: achievement.color }]}>
          {getAchievementIcon(achievement.icon)}
        </View>
        <Text style={styles.achievementTitle}>{achievement.title}</Text>
        <Text style={styles.achievementDescription}>{achievement.description}</Text>
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
    safeBack();
  };

  const getAverageRating = () => {
    if (!worker || !worker.feedbacks || worker.feedbacks.length === 0) return 0;
    const total = worker.feedbacks.reduce((sum, feedback) => sum + feedback.rating, 0);
    return total / worker.feedbacks.length;
  };

  return (
    <ScrollView style={styles.container}>
      {/* Back button */}
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={handleGoBack}
      >
        <Ionicons name="arrow-back-outline" size={24} color="#333" />
      </TouchableOpacity>

      {/* Header card is always visible */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (worker?.profileImage) {
              setPreviewImage(worker.profileImage);
            }
          }}
        >
          <Image 
            source={{ uri: worker.profileImage }} 
            style={styles.profileImage} 
          />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.nameContainer}>
            <Text style={styles.name}>
              {worker.name}
              {worker.isVerified && (
                <>
                  {"  "}
                  <Ionicons 
                    name="checkmark-circle" 
                    size={20} 
                    color="#4CAF50" 
                  />
                </>
              )}
              {"  "}
              <MaterialCommunityIcons 
                name="storefront" 
                size={20} 
                color="#8B5CF6" 
                onPress={() => setShowRoleTooltip(true)}
              />
            </Text>
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
            <Text style={styles.infoLabel}>Completed Postings</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoItem}>
            <AntDesign name="calendar" size={20} color="#0B153C" />
            <Text style={styles.infoValue}>
              {worker.joinedAt ? formatDate(worker.joinedAt) : 'N/A'}
            </Text>
            <Text style={styles.infoLabel}>Joined</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoItem}>
            <AntDesign name="star" size={20} color="#0B153C" />
            <Text style={styles.infoValue}>{getAverageRating().toFixed(1)}</Text>
            <Text style={styles.infoLabel}>Rating</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Feedbacks</Text>
          <TouchableOpacity 
            style={styles.seeAllButton} 
            onPress={() => safePush('./view-all-feedbacks', { otherParticipantId })}
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
            <View style={styles.feedbackReviewerRow}>
              <Image
                source={{
                  uri: feedback.avatar
                    ? `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/${feedback.avatar.replace(/\\/g, "/")}`
                    : "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"
                }}
                style={styles.feedbackAvatar}
              />
              <View style={styles.feedbackReviewerInfo}>
                <View style={styles.feedbackHeader}>
                  <Text style={styles.feedbackAnonymousName}>{feedback.anonymousName || 'Anonymous Job Seeker'}</Text>
                  {renderFeedbackStars(feedback.rating)}
                </View>
                {feedback.jobTitle ? (
                  <Text style={styles.feedbackJobTitle} numberOfLines={1}>
                    Job: {feedback.jobTitle}
                  </Text>
                ) : null}
              </View>
            </View>
            <Text style={styles.feedbackComment} numberOfLines={2}>
              {feedback.comment}
            </Text>
            <Text style={styles.feedbackDate}>{formatDate(feedback.date)}</Text>
          </TouchableOpacity>
        ))}
      </View>

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
                <View style={styles.feedbackReviewerRow}>
                  <Image
                    source={{
                      uri: selectedFeedback.avatar
                        ? `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/${selectedFeedback.avatar.replace(/\\/g, "/")}`
                        : "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"
                    }}
                    style={styles.feedbackAvatar}
                  />
                  <View style={styles.feedbackReviewerInfo}>
                    <View style={styles.feedbackDetailHeader}>
                      <Text style={styles.feedbackDetailName}>{selectedFeedback.anonymousName}</Text>
                      {renderFeedbackStars(selectedFeedback.rating)}
                    </View>
                    {selectedFeedback.jobTitle ? (
                      <Text style={styles.feedbackJobTitle} numberOfLines={1}>
                        Job: {selectedFeedback.jobTitle}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Text style={styles.feedbackDetailDate}>{formatDate(selectedFeedback.date)}</Text>
                <Text style={styles.feedbackDetailComment}>{selectedFeedback.comment}</Text>
                {selectedFeedback.jobRequest && (
                  <TouchableOpacity
                    style={styles.viewJobButton}
                    onPress={() => {
                      setFeedbackModalVisible(false);
                      const job = selectedFeedback.jobRequest;
                      router.push({
                        pathname: '/screen/job-seeker-screen/job-details',
                        params: {
                          id: job.id,
                          title: job.jobTitle,
                          postedDate: job.verifiedAt || job.createdAt || new Date().toISOString(),
                          description: job.jobDescription,
                          rate: job.budget,
                          location: job.jobLocation,
                          otherParticipant: job.client?.id || "",
                          jobImages: job.jobImage ? (Array.isArray(job.jobImage) ? job.jobImage.join(',') : job.jobImage) : "",
                          jobDuration: job.jobDuration,
                          clientFirstName: job.client?.firstName || "",
                          clientLastName: job.client?.lastName || "",
                          clientProfileImage: job.client?.profileImage || "",
                          hideApplyButton: "true",
                        },
                      });
                    }}
                  >
                    <Text style={styles.viewJobButtonText}>View Job Details</Text>
                    <AntDesign name="arrowright" size={16} color="#FFF" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
      <Modal
        visible={!!previewImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewImage(null)}
      >
        <TouchableOpacity 
          style={styles.imagePreviewModalContainer}
          activeOpacity={1}
          onPress={() => setPreviewImage(null)}
        >
          <Image 
            source={{ uri: previewImage || '' }} 
            style={styles.imagePreviewModalImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </Modal>

      {/* Role Tooltip Modal */}
      <Modal
        transparent={true}
        visible={showRoleTooltip}
        animationType="fade"
        onRequestClose={() => setShowRoleTooltip(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowRoleTooltip(false)}
        >
          <View style={styles.tooltipCard}>
            <View style={styles.tooltipHeader}>
              <MaterialCommunityIcons name="storefront" size={24} color="#8B5CF6" />
              <Text style={styles.tooltipTitle}>Client</Text>
            </View>
            <Text style={styles.tooltipDesc}>
              This user is registered as a Client. Clients can post jobs, send job offers, and hire Job Seekers on eDiskarte.
            </Text>
            <TouchableOpacity 
              style={[styles.tooltipCloseButton, { backgroundColor: '#8B5CF6' }]} 
              onPress={() => setShowRoleTooltip(false)}
            >
              <Text style={styles.tooltipCloseText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
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
    borderColor: '#0B153C',
  },
  headerInfo: {
    marginLeft: 16,
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    flexShrink: 1,
    marginRight: 4,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
    flex: 1,
  },
  aboutInfoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B153C',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  aboutInfoButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginRight: 4,
  },
  ratingContainer: {
    flexDirection: 'row',  
    alignItems: 'center',
  },
  stars: {
    flexDirection: 'row',
  },
  ratingText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
  },
  infoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 6,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  divider: {
    height: 40,
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2, 
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0B153C',
    marginRight: 4,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  skillTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0B153C',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    margin: 4,
  },
  skillText: {
    color: '#fff',
    fontWeight: '500',
  },
  horizontalScrollView: {
    flexGrow: 0,
  },
  horizontalScrollContent: {
    paddingRight: 16,
  },
  horizontalAchievementCard: {
    width: 150,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    marginRight: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  achievementsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  achievementCard: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  achievementRow: {
    justifyContent: 'space-between',
  },
  badgeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalAchievementsContainer: {
    padding: 16,
  },
  feedbackCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedbackAnonymousName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  feedbackStars: {
    flexDirection: 'row',
  },
  feedbackComment: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  feedbackDate: {
    fontSize: 12,
    color: '#999',
  },
  feedbackDetailContainer: {
    padding: 16,
  },
  feedbackDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedbackDetailName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  feedbackDetailDate: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
  },
  feedbackDetailComment: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  emptyAchievementCard: {
    opacity: 0.7,
  },
  badgesWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
  verifiedBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 2,
  },
  unverifiedBadge: {
    backgroundColor: '#F5F5F5',
  },
  imagePreviewModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewModalImage: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").width,
  },
  feedbackReviewerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  feedbackAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: "#F1F5F9",
  },
  feedbackReviewerInfo: {
    flex: 1,
  },
  feedbackJobTitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  viewJobButton: {
    backgroundColor: "#0B153C",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  viewJobButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  roleBadgeTouch: {
    marginLeft: 6,
    backgroundColor: '#F3E8FF',
    borderRadius: 12,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  tooltipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 320,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 8,
  },
  tooltipDesc: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  tooltipCloseButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    width: '100%',
    alignItems: 'center',
  },
  tooltipCloseText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default UtilityWorkerProfile;

