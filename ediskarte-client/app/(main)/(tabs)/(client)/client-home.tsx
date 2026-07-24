import React, { useEffect, useState } from "react";
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
  Modal,
  Platform,
  TextInput,
  RefreshControl,
} from "react-native";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useMutation } from "@tanstack/react-query";
import { fetchJobListings, deleteJobListing } from "@/api/client-request";
import decodeToken from "@/api/token-decoder";

type TabType = "jobListings" | "history";

interface JobDetails {
  id: string;
  jobTitle: string;
  jobDescription: string;
  category: string;
  jobLocation: string;
  jobStatus: string;
  budget: string;
  datePosted: string;
  jobSeekerId: string;
  applicantCount: number;
  completedAt: string;
  averageRating: number;
  reviews: {
    rating: number;
    feedback: string;
    reviewer: {
      id: string;
      firstName: string;
      lastName: string;
      profileImage: string;
    };
  }[];
  jobSeeker: {
    id: string;
    firstName: string;
    lastName: string;
    profileImage: string;
  };
  offer: string;
  jobDuration: string;
}

function reverseCamelCase(str: string) {
  let result = str.replace(/([A-Z])/g, " $1").toLowerCase();
  result = result.replace(/\s+and\b/g, " & ");

  result = result.replace(/(^|\s)([a-z])/g, function (match, space, letter) {
    return space + letter.toUpperCase();
  });

  return result.trim();
}

export default function JobListingScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("jobListings");
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null);

  const handleProfilePress = () => {
    router.push({
      pathname: "../../../screen/profile/profile-screen" as any,
    });
  };

  const handleSearchPress = () => {
    router.push("/screen/search-screen");
  };

  const markNotificationsAsRead = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      await fetch(`http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/notifications/mark-read`, {
        method: 'PUT', // or 'PATCH'
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      setHasUnread(false);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleNotificationPress = async () => {
    await markNotificationsAsRead();
    router.push("/screen/notification-screen");
  };

  const handleAddJobPress = () => {
    router.push({
      pathname: "../../../screen/client-screen/add-jobs" as any,
    });
  };

  const handleEditJobPress = (jobId: string) => {
    router.push({
      pathname: "../../../screen/client-screen/edit-jobs" as any,
      params: { id: jobId },
    });
  };

  const handleDeleteJobPress = (jobId: string) => {
    setDeleteJobId(jobId);
  };

  const handleConfirmDelete = () => {
    if (deleteJobId) {
      deleteListReload(deleteJobId);
      setDeleteJobId(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteJobId(null);
  };

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["client-data"],
    queryFn: () => fetchJobListings(),
    refetchOnMount: true,
  });

  const { mutate: deleteListReload } = useMutation({
    mutationFn: deleteJobListing,
    onSuccess: () => {
      refetch();
    },
  });

  const handleCheckToken = async () => {
    const dataToken = await AsyncStorage.getItem("token");

    if (!dataToken) {
      router.replace("/(auth)/sign_in");
    }
  };

  const { data: completedJobs, isFetching: isCompletedJobsFetching } = useQuery({
    queryKey: ["completed-jobs"],
    queryFn: async () => {
      const token = await AsyncStorage.getItem("token");
      const { data: userData } = await decodeToken();
      
      const response = await fetch(
        `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/client/completed-jobs/${userData.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch completed jobs");
      }
      return response.json();
    },
    enabled: activeTab === "history",
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetch(),
        completedJobs?.refetch()
      ]);
    } finally {
      setRefreshing(false);
    }
  };
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [feedback, setReview] = useState<string>("");
  const [userProfileImage, setUserProfileImage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobDetails | null>(null);
  const [userType, setUserType] = useState<'client' | 'job-seeker' | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasUnread, setHasUnread] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  
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

  useEffect(() => {
    setTimeout(() => {
      handleCheckToken();
    }, 2000);
  }, []);

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

  const handleTabPress = (tab: TabType) => {
    setActiveTab(tab);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={[styles.header, Platform.OS === "ios" && styles.iosHeader]}>
        <TouchableOpacity style={styles.searchBar} onPress={handleSearchPress}>
          <Ionicons name="search-outline" size={18} color="#666" />
          <Text style={styles.searchText}>Search jobs here</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNotificationPress}
          style={styles.notificationButton}
        >
          <View style={{ position: 'relative' }}>
            <Ionicons name="notifications-outline" size={24} color="#000" />
            {hasUnread && (
              <View style={styles.notifIndicator} />
            )}
          </View>
        </TouchableOpacity>
      </View>

      

      <View style={styles.tabContainer}>
        <View style={styles.tabSection}>
          <TouchableOpacity 
            style={styles.tab} 
            onPress={() => handleTabPress('jobListings')}
          >
            <Text style={[styles.tabText, activeTab === 'jobListings' && styles.activeTab]}>
              Job Listings
            </Text>
            {activeTab === "jobListings" && <View style={styles.activeIndicator} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tab}
            onPress={() => handleTabPress("history")}
          >
            <Text style={[styles.tabText, activeTab === "history" && styles.activeTab]}>
              History
            </Text>
            {activeTab === "history" && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={handleAddJobPress}>
          <Feather name="plus" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#9b59b6"]}
            tintColor="#9b59b6"
          />
        }
      >
        {isFetching ? (
          <ActivityIndicator size="large" />
        ) : activeTab === "history" ? (
          completedJobs && completedJobs.length > 0 ? (
            completedJobs.map((job: JobDetails) => (
              <TouchableOpacity
                key={job.id}
                style={styles.jobCard}
                onPress={() => {
                  setSelectedJob(job);
                  setViewModalVisible(true);
                }}
              >
                <View style={styles.jobHeader}>
                  <Text style={styles.jobTitle} numberOfLines={1} ellipsizeMode="tail">
                    {job.jobTitle}
                  </Text>
                </View>

                <Text style={styles.jobDescription}>{job.jobDescription}</Text>

                {job.jobSeeker && (
                  <View style={styles.historyFooter}>
                    <View style={styles.jobSeekerInfo}>
                      <Image
                        source={
                          job.jobSeeker.profileImage
                            ? { uri: `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/${job.jobSeeker.profileImage}` }
                            : require("assets/images/default-user.png")
                        }
                        style={styles.jobSeekerImage}
                      />
                      <Text style={styles.jobSeekerName}>
                        {job.jobSeeker.firstName} {job.jobSeeker.lastName}
                      </Text>
                    </View>
                    {job.averageRating > 0 && (
                      <View style={styles.ratingContainer}>
                        <Text style={styles.ratingStars}>
                          {"⭐".repeat(Math.round(job.averageRating))}
                        </Text>
                        <Text style={styles.reviewCount}>
                          ({job.reviews.length} {job.reviews.length === 1 ? 'review' : 'reviews'})
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={[styles.jobFooter, { marginTop: 12, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12 }]}>
                  <View style={[styles.categoryBadge, {
                    backgroundColor: job.category === "plumbing" ? "#9b59b6" : "#3498db"
                  }]}>
                    <Text style={styles.categoryText}>
                      {reverseCamelCase(job.category)}
                    </Text>
                  </View>

                  <Text style={[styles.statusText, {
                    color: "#2ecc71"
                  }]}>
                    {job.jobStatus.charAt(0).toUpperCase() + job.jobStatus.slice(1)}
                  </Text>

                  <Text style={styles.dateText}>
                    {new Date(job.completedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>No completed jobs yet</Text>
            </View>
          )
        ) : data && data.filter((job: JobDetails) => 
          job.jobStatus !== "completed" && job.jobStatus !== "reviewed"
        ).length > 0 ? (
          data
            .filter((job: JobDetails) => 
              job.jobStatus !== "completed" && job.jobStatus !== "reviewed"
            )
            .sort((a: JobDetails, b: JobDetails) => {
              if (a.jobStatus.toLowerCase() === "pending" && b.jobStatus.toLowerCase() !== "pending") {
                return -1;
              }
              if (a.jobStatus.toLowerCase() !== "pending" && b.jobStatus.toLowerCase() === "pending") {
                return 1;
              }
              return new Date(b.datePosted).getTime() - new Date(a.datePosted).getTime();
            })
            .map((job: JobDetails) => (
              <TouchableOpacity
                key={job.id}
                style={styles.jobCard}
                onPress={() => {
                  setSelectedJob(job);
                  setViewModalVisible(true);
                }}
              >
                <View style={styles.jobHeader}>
                  <Text style={styles.jobTitle} numberOfLines={1} ellipsizeMode="tail">
                    {job.jobTitle}
                  </Text>

                  <View style={styles.actionsContainer}>
                    {job.jobStatus.toLowerCase() !== "pending" && (
                      <>
                        <TouchableOpacity
                          onPress={() => handleEditJobPress(job.id)}
                          style={styles.actionButton}
                        >
                          <Feather name="edit" size={18} color="#000" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteJobPress(job.id)}
                          style={styles.actionButton}
                        >
                          <Feather name="trash-2" size={18} color="#ff4444" />
                        </TouchableOpacity>
                      </>
                    )}
                    {job.jobStatus.toLowerCase() === "pending" && (
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedJobId(job.id);
                          setShowConfirmModal(true);
                        }}
                        style={styles.actionButton}
                      >
                        <Feather name="check-circle" size={22} color="#2ecc71" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <Text style={styles.jobDescription}>{job.jobDescription}</Text>

                <View style={styles.jobFooter}>
                  <View style={[styles.categoryBadge, {
                    backgroundColor: job.category === "plumbing" ? "#9b59b6" : "#3498db"
                  }]}>
                    <Text style={styles.categoryText}>
                      {reverseCamelCase(job.category)}
                    </Text>
                  </View>

                  <Text style={[styles.statusText, {
                    color: job.jobStatus === "Open" ? "#f39c12" : "#2ecc71"
                  }]}>
                    {job.jobStatus.charAt(0).toUpperCase() + job.jobStatus.slice(1)}
                  </Text>

                  <Text style={styles.dateText}>
                    {new Date(job.datePosted).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
        ) : (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>
              Click the + button to create a job request
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteJobId !== null}
        onRequestClose={handleCancelDelete}
      >
        <View style={styles.successModalContainer}>
          <View style={styles.successModalContent}>
            <View style={styles.warningIconContainer}>
              <MaterialIcons name="warning" size={60} color="#FF9500" />
            </View>
            <Text style={styles.successTitle}>Delete Job Listing</Text>
            <Text style={styles.successMessage}>
              Are you sure you want to delete this job listing? This action
              cannot be undone.
            </Text>
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity
                style={styles.stayButton}
                onPress={handleCancelDelete}
              >
                <Text style={styles.stayButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.discardButton}
                onPress={handleConfirmDelete}
              >
                <Text style={styles.discardButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.successModalContainer}>
          <View style={styles.successModalContent}>
            <Text style={styles.successTitle}>Confirm Job Completion</Text>
            <Text style={styles.successMessage}>
              Please rate and review the jobseeker.
            </Text>

            {/* Rating Stars (placeholder - you can use icons later) */}
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

            {/* Review Input */}
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
              onChangeText={setReview}
            />

            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity
                style={styles.stayButton}
                onPress={() => setShowConfirmModal(false)}
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
                      const userType = userData.userType;
                      const reviewerId = userData.id;

                      // Find the job object for the selectedJobId
                      const job = data.find(
                        (job: JobDetails) => job.id === selectedJobId
                      );
                      const reviewedId = job?.jobSeekerId;
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

                      const result = await response.json();
                      console.log("Verification successful:", result);

                      // Reset form state
                      setShowConfirmModal(false);
                      setSelectedJobId(null);
                      setRating(0);
                      setReview("");
                      refetch(); // Refresh data
                    } catch (error) {
                      console.error("Error submitting review:", error);
                      // You can show a toast or alert here if you like
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
      <Modal
        visible={viewModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setViewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailsModalContent}>
            {/* Header */}
            <View style={styles.detailsModalHeader}>
              <View style={styles.detailsModalIconCircle}>
                <Feather name="file-text" size={28} color="#fff" />
              </View>
              <TouchableOpacity
                style={styles.detailsModalClose}
                onPress={() => setViewModalVisible(false)}
              >
                <Feather name="x" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            {/* Title */}
            <Text style={styles.detailsModalTitle}>
              {selectedJob?.jobTitle}
            </Text>
            {/* Divider */}
            <View style={styles.detailsDivider} />
            {/* Info Rows */}
            <View style={styles.detailsRow}>
              <Feather name="align-left" size={18} color="#0B153C" style={{ marginRight: 8 }} />
              <Text style={styles.detailsLabel}>Description:</Text>
            </View>
            <Text style={styles.detailsValue}>{selectedJob?.jobDescription}</Text>

            <View style={styles.detailsRow}>
              <Feather name="tag" size={18} color="#0B153C" style={{ marginRight: 8 }} />
              <Text style={styles.detailsLabel}>Category:</Text>
              <Text style={styles.detailsValue}>{reverseCamelCase(selectedJob?.category || "")}</Text>
            </View>

            <View style={styles.detailsRow}>
              <Feather name="map-pin" size={18} color="#0B153C" style={{ marginRight: 8 }} />
              <Text style={styles.detailsLabel}>Location:</Text>
              <Text style={styles.detailsValue}>{selectedJob?.jobLocation}</Text>
            </View>

            <View style={styles.detailsRow}>
              <Feather name="credit-card" size={18} color="#0B153C" style={{ marginRight: 8 }} />
              <Text style={styles.detailsLabel}>Rate:</Text>
              <Text style={styles.detailsValue}>
                {selectedJob?.budget ? `₱${selectedJob.budget}` : "N/A"}
              </Text>
            </View>

            <View style={styles.detailsRow}>
              <Feather name="clock" size={18} color="#0B153C" style={{ marginRight: 8 }} />
              <Text style={styles.detailsLabel}>Duration:</Text>
              <Text style={styles.detailsValue}>
                {selectedJob?.jobDuration ? `${selectedJob.jobDuration}` : "Not specified"}
              </Text>
            </View>

            {activeTab === "history" && (
              <View style={styles.detailsRow}>
                <Feather name="dollar-sign" size={18} color="#0B153C" style={{ marginRight: 8 }} />
                <Text style={styles.detailsLabel}>Final Offer:</Text>
                <Text style={styles.detailsValue}>
                  {selectedJob?.offer ? `₱${selectedJob.offer}` : "Not specified"}
                </Text>
              </View>
            )}

            <View style={styles.detailsRow}>
              <Feather name="calendar" size={18} color="#0B153C" style={{ marginRight: 8 }} />
              <Text style={styles.detailsLabel}>Date Posted:</Text>
              <Text style={styles.detailsValue}>
                {selectedJob &&
                  new Date(selectedJob.datePosted).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
              </Text>
            </View>

            <View style={styles.detailsRow}>
              <Feather name="info" size={18} color="#0B153C" style={{ marginRight: 8 }} />
              <Text style={styles.detailsLabel}>Status:</Text>
              <Text
                style={[
                  styles.detailsValue,
                  {
                    color:
                      selectedJob?.jobStatus === "Open"
                        ? "#f39c12"
                        : selectedJob?.jobStatus === "Pending"
                        ? "#3498db"
                        : "#2ecc71",
                    fontWeight: "bold",
                  },
                ]}
              >
                {selectedJob?.jobStatus}
              </Text>
            </View>

            <View style={styles.detailsRow}>
              <Feather name="users" size={18} color="#0B153C" style={{ marginRight: 8 }} />
              <Text style={styles.detailsLabel}>Applicants:</Text>
              <Text style={styles.detailsValue}>
                {selectedJob?.applicantCount || 0}
              </Text>
            </View>

            {/* Add this section for reviews without the subtitle */}
            {selectedJob?.reviews && selectedJob.reviews.length > 0 && (
              <View style={styles.reviewsSection}>
                {selectedJob.reviews.map((review, index) => (
                  <View key={index} style={styles.reviewItem}>
                    <Text style={styles.reviewTitle}>
                      {index === 0 ? "Your Review" : "Job-Seeker's Review"}
                    </Text>
                    <View style={styles.reviewHeader}>
                      <Image
                        source={
                          review.reviewer.profileImage
                            ? { uri: `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/${review.reviewer.profileImage}` }
                            : require("assets/images/default-user.png")
                        }
                        style={styles.reviewerImage}
                      />
                      <View style={styles.reviewerInfo}>
                        <Text style={styles.reviewerName}>
                          {`${review.reviewer.firstName} ${review.reviewer.lastName}`}
                        </Text>
                        <Text style={styles.ratingStars}>
                          {"⭐".repeat(Math.round(review.rating))}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.reviewFeedback}>{review.feedback}</Text>
                  </View>
                ))}
              </View>
            )}
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
    paddingTop: Platform.OS === "android" ? 50 : 10,
  },
  iosHeader: {
    paddingTop: Platform.OS === "ios" ? 10 : 10,
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
  titleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  jobCard: {
    backgroundColor: "#f1f1f1",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  jobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    flexShrink: 1,
    flex: 1,
    marginRight: 8,
  },
  jobDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
    lineHeight: 20,
  },
  jobFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
  },
  dateText: {
    fontSize: 12,
    color: "#666",
  },

  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionButton: {
    marginLeft: 12,
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
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  detailsModalContent: {
    backgroundColor: "#fff",
    borderRadius: 18,
    width: "90%",
    padding: 24,
    maxWidth: 380,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    position: "relative",
  },
  detailsModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  detailsModalIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#0B153C",
    justifyContent: "center",
    alignItems: "center",
  },
  detailsModalClose: {
    position: "absolute",
    right: 0,
    top: 0,
    padding: 8,
  },
  detailsModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0B153C",
    textAlign: "center",
    marginBottom: 8,
    marginTop: 8,
  },
  detailsDivider: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 10,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  detailsLabel: {
    fontWeight: "600",
    color: "#333",
    marginRight: 4,
    fontSize: 15,
  },
  detailsValue: {
    color: "#444",
    fontSize: 15,
    flexShrink: 1,
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
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginVertical: 10,
    justifyContent: "space-between",
    alignItems: "center",
  },
  tabSection: {
    flexDirection: "row",
  },
  tab: {
    marginRight: 24,
    paddingBottom: 8,
    position: "relative",
  },
  addButton: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 14,
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
  historyFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  jobSeekerInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  jobSeekerImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  jobSeekerName: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ratingStars: {
    fontSize: 14,
  },
  reviewCount: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  reviewsSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 20,
  },
  reviewItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0B153C',
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  reviewerInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  reviewFeedback: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
