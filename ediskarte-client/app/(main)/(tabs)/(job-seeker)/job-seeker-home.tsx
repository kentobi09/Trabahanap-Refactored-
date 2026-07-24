import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Modal,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import decodeToken from "@/api/token-decoder";

interface JobRequest {
  id: string;
  jobTitle: string;
  jobSeekerId: string;
  jobDescription: string;
  category: string;
  budget: string;
  offer?:string |null;
  jobLocation: string;
  jobDuration: string;
  datePosted: string;
  jobImage: string[] | null;
  client: Client;
  jobStatus: string;
  applicantCount: number;
  reviews?: {
    rating: number;
    feedback: string;
    reviewer: {
      id: string;
      firstName: string;
      lastName: string;
      profileImage: string;
    };
  }[];
  jobSeekerReview?: {
    rating: number;
    feedback: string;
    reviewer: {
      id: string;
      firstName: string;
      lastName: string;
      profileImage: string;
    };
  };
}

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  profileImage: string;
}

interface JobSeeker {
  jobTags: string[];
}

type TabType = "bestMatch" | "otherJobs" | "pendingJobs" | "history";

export default function JobListingScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("bestMatch");
  const [jobRequests, setJobRequests] = useState<JobRequest[]>([]);
  const [myJobs1, setMyJobs] = useState<JobRequest[]>([]);
  const [jobSeeker, setJobSeeker] = useState<JobSeeker | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userProfileImage, setUserProfileImage] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>("");
  const [userType, setUserType] = useState<'client' | 'job-seeker' | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasUnread, setHasUnread] = useState<boolean>(false);

  useEffect(() => {
    const fetchHasUnreadNotifications = async () => {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem('token');
        const userId = await AsyncStorage.getItem('currentUserId');
        setUserId(userId);
        const storedUserType = await AsyncStorage.getItem('userType');
        setUserType(storedUserType as 'client' | 'job-seeker');
        
        const response = await fetch(`http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/api/hasUnreadNotification`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        const data = await response.json();
        setHasUnread(data.hasUnread);
      } catch (error) {
        console.error('Error fetching unread notifications:', error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchHasUnreadNotifications();
  }, []);

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        router.replace("/sign_in");
        return;
      }

      const jobResponse = await fetch(
        `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/api/job-requests`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const jobData = await jobResponse.json();
      console.log(jobData);
      setJobRequests(jobData);
 
      const myJobsResponse = await fetch(
        `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/api/job-seeker/my-jobs`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const myJobsData = await myJobsResponse.json();
      console.log(myJobsData);
      setMyJobs(myJobsData.sort((a: JobRequest, b: JobRequest) => new Date(b.datePosted).getTime() - new Date(a.datePosted).getTime()));

      const tagsResponse = await fetch(
        `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/api/job-seeker/tags`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const tagsData = await tagsResponse.json();
      setJobSeeker({ jobTags: tagsData.jobTags || [] });
      setRefreshing(false);
    } catch (error) {
      // console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
      setRefreshing(false);
    }, []),
  );

    useEffect(() => {
      const loadUserData = async () => {
        try {
          const { data } = await decodeToken();
          const profileImagePath = data.profileImage;

  
          if (profileImagePath) {
            setUserProfileImage(
              `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/${profileImagePath}`
            );
          }
        } catch (error) {
          console.error("Error loading user data:", error);
        }
      };
      loadUserData();
    }, []);
    
  const handleSeeMorePress = (job: JobRequest) => {
    router.push({
      pathname: "../../../screen/job-seeker-screen/job-details",
      params: {
        id: job.id,
        title: job.jobTitle,
        postedDate: job.datePosted,
        description: job.jobDescription,
        rate: job.budget,
        offer:job.offer,
        location: job.jobLocation,
        otherParticipant: job.client.id,
        jobImages: job.jobImage,
        jobDuration: job.jobDuration,
        clientFirstName: job.client.firstName,
        clientLastName: job.client.lastName,
        clientProfileImage: job.client.profileImage,
        isMyJob: activeTab === "pendingJobs" ? "true" : "false",
        jobStatus: job.jobStatus,
        review: job.reviews?.[0] ? JSON.stringify({
          rating: job.reviews[0].rating,
          feedback: job.reviews[0].feedback,
          reviewer: {
            id: job.reviews[0].reviewer.id,
            firstName: job.reviews[0].reviewer.firstName,
            lastName: job.reviews[0].reviewer.lastName,
            profileImage: job.reviews[0].reviewer.profileImage
          }
        }) : undefined,
        jobSeekerReview: job.reviews?.[1] ? JSON.stringify({
          rating: job.reviews[1].rating,
          feedback: job.reviews[1].feedback,
          reviewer: {
            id: job.reviews[1].reviewer.id,
            firstName: job.reviews[1].reviewer.firstName,
            lastName: job.reviews[1].reviewer.lastName,
            profileImage: job.reviews[1].reviewer.profileImage
          }
        }) : undefined,
      },
    });
  };


  const handleTabPress = (tab: TabType) => {
    setActiveTab(tab);
  };
  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const matchingJobs = jobRequests
    .filter((job) =>
      jobSeeker?.jobTags.some(
        (tag) => tag.toLowerCase() === job.category.toLowerCase()
      )
    )
    .sort((a, b) => new Date(b.datePosted).getTime() - new Date(a.datePosted).getTime());
  
  const otherJobs = jobRequests
    .filter((job) =>
      !jobSeeker?.jobTags.some(
        (tag) => tag.toLowerCase() === job.category.toLowerCase()
      )
    )
    .sort((a, b) => new Date(b.datePosted).getTime() - new Date(a.datePosted).getTime());

  const myJobs = myJobs1
    .sort((a, b) => new Date(b.datePosted).getTime() - new Date(a.datePosted).getTime());

  const handleProfilePress = () => {
    router.push("../../../screen/profile/profile-screen");
  };
  
  const markNotificationsAsRead = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/notifications/mark-read`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to mark notifications as read');
      }

      const data = await response.json();
      console.log('Notifications marked as read:', data);
      setHasUnread(false);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleNotificationPress = async () => {
    await markNotificationsAsRead();
    router.push('/screen/notification-screen-jobseeker');
  };

  const displayedJobs = 
    activeTab === "bestMatch" ? matchingJobs :
    activeTab === "otherJobs" ? otherJobs :
    activeTab === "history" ? myJobs1.filter(job => job.jobStatus === "completed" || job.jobStatus === "reviewed") :
    myJobs1.filter(job => job.jobStatus !== "completed" && job.jobStatus !== "reviewed");
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={[styles.header, Platform.OS === 'ios' && styles.iosHeader]}>
        <TouchableOpacity 
          style={styles.searchBar}
          onPress={() => router.push('/screen/search-screen-jobseeker')}
        >
          <Ionicons name="search-outline" size={18} color="#666" />
          <Text style={styles.searchText}>Search jobs here</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.notificationButton}
          onPress={handleNotificationPress}
        >
          <View style={{ position: 'relative' }}>
            <Ionicons name="notifications-outline" size={24} color="#000" />
            {hasUnread && (
              <View style={styles.notifIndicator} />
            )}
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabScrollView}
        contentContainerStyle={styles.tabScrollContent}
      >
        <TouchableOpacity style={styles.tab} onPress={() => handleTabPress('bestMatch')}>
          <Text style={[styles.tabText, activeTab === 'bestMatch' && styles.activeTab]}>
            Best Matches
          </Text>
          {activeTab === "bestMatch" && <View style={styles.activeIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => handleTabPress("otherJobs")}
        >
          <Text style={[styles.tabText, activeTab === "otherJobs" && styles.activeTab]}>
            Other Jobs
          </Text>
          {activeTab === "otherJobs" && <View style={styles.activeIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tab} 
          onPress={() => handleTabPress("pendingJobs")}
        >
          <Text style={[styles.tabText, activeTab === "pendingJobs" && styles.activeTab]}>
            My Jobs
          </Text>
          {activeTab === "pendingJobs" && <View style={styles.activeIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tab} 
          onPress={() => handleTabPress("history")}
        >
          <Text style={[styles.tabText, activeTab === "history" && styles.activeTab]}>
            Completed Jobs
          </Text>
          {activeTab === "history" && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="large" color="#000" />
      ) : (
        <ScrollView style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }>
          
          {displayedJobs.length > 0 ? (
            displayedJobs.map((job) => (
              <TouchableOpacity
                key={job.id}
                style={[
                  styles.jobCard,
                  activeTab === "pendingJobs" && styles.myJobCard
                ]}
                onPress={() => handleSeeMorePress(job)}
                activeOpacity={0.7}
              >
                <View style={styles.jobContent}>
                  <View style={styles.jobHeader}>
                    <Text style={styles.postedDate}>
                      {new Date(job.datePosted).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </Text>
                    <TouchableOpacity
                      style={styles.posterRow}
                      onPress={(e) => {
                        e.stopPropagation();
                        router.push({
                          pathname: "../../../screen/profile/view-profile/view-page-client",
                          params: { otherParticipantId: job.client.id },
                        });
                      }}
                    >
                      <Image
                        source={
                          job.client.profileImage
                            ? { uri: `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/${job.client.profileImage}` }
                            : require("assets/images/default-user.png")//here
                        }
                        style={styles.posterProfileImage}
                      />
                      <Text style={styles.posterName}>
                        {job.client.firstName + " " + job.client.lastName}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.jobMainContent}>
                    <Text style={styles.jobTitle}>{job.jobTitle}</Text>
                    <Text
                      style={styles.jobDescription}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {job.jobDescription.length > 32 
                        ? job.jobDescription.substring(0, 32) + '...'
                        : job.jobDescription}
                    </Text>
                  </View>

                  <View style={styles.jobFooter}>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>{job.category}</Text>
                    </View>
                    
                    <View style={styles.detailsContainer}>
                      <View style={styles.budgetDurationContainer}>
                        <Text style={styles.priceText}>
                          {job.budget ? `₱ ${job.budget}` : ""}
                        </Text>
                        <Text style={styles.durationText}>
                          {job.jobDuration ? `Duration: ${job.jobDuration}` : ""}
                        </Text>
                      </View>

                      <View style={styles.locationApplicantContainer}>
                        <View style={styles.locationContainer}>
                          <Ionicons name="location-outline" size={14} color="#666" />
                          <Text style={styles.locationText} numberOfLines={1}>
                            {job.jobLocation.length > 12
                              ? job.jobLocation.substring(0, 12) + '...'
                              : job.jobLocation}
                          </Text>
                        </View>
                        <View style={styles.applicantCountContainer}>
                          <Ionicons name="people-outline" size={14} color="#666" />
                          <Text style={styles.applicantCountText}>
                            {job.applicantCount} applicant{job.applicantCount >1 ? "s" : ""}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.jobImageContainer}>
                  <Image
                    source={{ 
                      uri: `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/uploads/${
                        job.jobImage?.[0]?.split("job_request_files/")?.[1] ?? ''
                      }`
                    }}
                    style={styles.jobImage}
                    resizeMode="cover"
                  />
                  <View style={styles.imageOverlay} />
                </View>
                {((activeTab === "pendingJobs" || activeTab === "history") && job.jobStatus === "completed") && (
                  <TouchableOpacity
                    style={styles.finishButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      setSelectedJobId(job.id);
                      setShowReviewModal(true);
                    }}
                  >
                    <Text style={styles.finishButtonText}>Leave a Review</Text>
                  </TouchableOpacity>
                )}
               
              </TouchableOpacity>
            ))
          ) : (
            <Text style = {styles.noJobs}>No jobs found.</Text>
          )}
          
        </ScrollView>
      )}

      <Modal
        visible={showReviewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.successModalContainer}>
          <View style={styles.successModalContent}>
            <Text style={styles.successTitle}>Confirm Job Completion</Text>
            <Text style={styles.successMessage}>
              Please rate and review the client.
            </Text>
            <View style={{ flexDirection: "row", marginBottom: 12 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  style={{ marginHorizontal: 4 }}
                >
                  <Text style={{ fontSize: 24 }}>
                    {star <= rating ? "⭐" : "☆"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              placeholder="Write a review..."
              style={{
                width: "100%",
                height: 80,
                borderColor: "#ccc",
                borderWidth: 1,
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 8,
                textAlignVertical: "top",
                marginBottom: 16,
              }}
              multiline
              value={feedback}
              onChangeText={setFeedback}
            />
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity
                style={styles.stayButton}
                onPress={() => setShowReviewModal(false)}
              >
                <Text style={styles.stayButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.discardButton}
                onPress={async () => {
                  if (selectedJobId) {
                    try {
                      const token = await AsyncStorage.getItem("token");
                      const { data: userData } = await decodeToken();
                      const reviewerId = userData.id;
                      const userType = userData.userType;
                      // Find the job object for the selectedJobId
                      const job = myJobs1.find((job) => job.id === selectedJobId);
                      const reviewedId = job?.client.id;
                      const response = await fetch(
                        `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/api/jobrequest/verify/${selectedJobId}`,
                        {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({
                            rating,
                            feedback,
                            reviewerId,
                            reviewedId,
                            userType,
                          }),
                        }
                      );
                      if (!response.ok) {
                        throw new Error("Failed to submit review.");
                      }
                      // Reset form state
                      setShowReviewModal(false);
                      setSelectedJobId(null);
                      setRating(0);
                      setFeedback("");
                      fetchData(); // Refresh jobs
                    } catch (error) {
                      console.error("Error submitting review:", error);
                    }
                  }
                }}
              >
                <Text style={styles.discardButtonText}>Submit</Text>
              </TouchableOpacity>
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
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'android' ? 50 : 10,
  },
  iosHeader:{
    paddingTop: Platform.OS === 'ios' ? 60 : 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f1f1",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
  },
  searchText: {
    marginLeft: 8,
    color: "#666",
    fontSize: 14,
  },
  notificationButton: {
    padding: 4,
  },
  tabScrollView: {
    maxHeight: 50,
  },
  tabScrollContent: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  tab: {
    marginRight: 24,
    paddingBottom: 8,
    position: "relative",
    minWidth:30,
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  activeTab: {
    color: "#000",
    fontWeight: "700",
  },
  activeIndicator: {
    height: 3,
    backgroundColor: "#000",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  jobCard: {
    flexDirection: "row",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    height: 280,
    borderWidth: 1,
    borderColor: "#e9ecef",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  jobContent: {
    flex: 3,
    padding: 16,
    justifyContent: "space-between",
  },
  jobHeader: {
    marginBottom: 12,
  },
  jobMainContent: {
    flex: 1,
    marginBottom: 12,
  },
  posterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  posterProfileImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
    backgroundColor: "#eee",
  },
  posterName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
  },
  jobDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 8,
    height: 20,
  },
  jobFooter: {
    gap: 12,
  },
  detailsContainer: {
    gap: 12,
  },
  budgetDurationContainer: {
    gap: 4,
  },
  locationApplicantContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  durationText: {
    fontSize: 14,
    color: "#666",
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  locationText: {
    fontSize: 13,
    color: "#666",
    marginLeft: 4,
    flex: 1,
    height: 18,
  },
  applicantCountContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 16,
  },
  applicantCountText: {
    fontSize: 13,
    color: "#666",
    marginLeft: 4,
  },
  categoryBadge: {
    backgroundColor: "#14213d",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: "flex-start",
  },
  categoryText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  jobImageContainer: {
    flex: 1,
    position: "relative",
  },
  jobImage: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(13, 34, 64, 0.7)",
  },
  postedDate: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    
  },
  noJobs:{
    textAlign:"center",
    marginTop:20,

  },
  finishButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#2ecc71',
    padding: 8,
    borderRadius: 8,
    zIndex: 2,
  },
  finishButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
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
  notifIndicator:{
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'red',
  },
  myJobCard: {

  },
});
