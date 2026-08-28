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
import { safePush, safeReplace } from "../../../constants/navigation";

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
    safePush("../../../screen/profile/profile-screen");
  };

  const handleSearchPress = () => {
    safePush("/screen/search-screen");
  };

  const markNotificationsAsRead = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      await fetch(`https://lip-balance-analyze-extends.trycloudflare.com/notifications/mark-read`, {
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
    safePush("/screen/notification-screen");
  };

  const handleAddJobPress = () => {
    safePush("../../../screen/client-screen/add-jobs");
  };

  const handleEditJobPress = (jobId: string) => {
    safePush("../../../screen/client-screen/edit-jobs", { id: jobId });
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
      safeReplace("/(auth)/sign_in");
    }
  };

  const { data: completedJobs, isFetching: isCompletedJobsFetching } = useQuery({
    queryKey: ["completed-jobs"],
    queryFn: async () => {
      const token = await AsyncStorage.getItem("token");
      const { data: userData } = await decodeToken();
      
      const response = await fetch(
        `https://lip-balance-analyze-extends.trycloudflare.com/client/completed-jobs/${userData.id}`,
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
        
        const response = await fetch(`https://lip-balance-analyze-extends.trycloudflare.com/api/hasUnreadNotification`, {
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
            `https://lip-balance-analyze-extends.trycloudflare.com/${profileImagePath}`
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
          <Ionicons name="search-outline" size={18} color="#E2E8F0" />
          <Text style={styles.searchText}>Search workers here</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNotificationPress}
          style={styles.notificationButton}
        >
          <View style={{ position: 'relative' }}>
            <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
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
              Completed Jobs
            </Text>
            {activeTab === "history" && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={handleAddJobPress}>
          <Feather name="plus" size={20} color="#0B153C" />
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
            completedJobs.map((job: JobDetails) => {
              const hasImage = job.jobImage?.[0];
              const imageUri = hasImage
                ? `https://lip-balance-analyze-extends.trycloudflare.com/uploads/${
                    (job.jobImage[0] + "").replace(/\\/g, "/").split("job_request_files/")[1] ?? ''
                  }`
                : null;
              return (
                <TouchableOpacity
                  key={job.id}
                  style={styles.jobCard}
                  onPress={() => {
                    setSelectedJob(job);
                    setViewModalVisible(true);
                  }}
                >
                  {hasImage && (
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.cardJobBanner}
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.cardContentContainer}>
                    <View style={styles.jobHeader}>
                      <Text style={styles.jobTitle} numberOfLines={1} ellipsizeMode="tail">
                        {job.jobTitle}
                      </Text>
                    </View>

                    <Text style={styles.jobDescription} numberOfLines={2}>{job.jobDescription}</Text>

                    {job.jobSeeker && (
                      <View style={styles.historyFooter}>
                        <View style={styles.jobSeekerInfo}>
                          <Image
                            source={
                              job.jobSeeker.profileImage
                                ? { uri: `https://lip-balance-analyze-extends.trycloudflare.com/${job.jobSeeker.profileImage.replace(/\\/g, "/")}` }
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
                      <View style={styles.categoryBadge}>
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
                  </View>
                </TouchableOpacity>
              );
            })
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
            .map((job: JobDetails) => {
              const hasImage = job.jobImage?.[0];
              const imageUri = hasImage
                ? `https://lip-balance-analyze-extends.trycloudflare.com/uploads/${
                    (job.jobImage[0] + "").replace(/\\/g, "/").split("job_request_files/")[1] ?? ''
                  }`
                : null;
              return (
                <TouchableOpacity
                  key={job.id}
                  style={styles.jobCard}
                  onPress={() => {
                    setSelectedJob(job);
                    setViewModalVisible(true);
                  }}
                >
                  {hasImage && (
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.cardJobBanner}
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.cardContentContainer}>
                    <View style={styles.jobHeader}>
                      <Text style={styles.jobTitle} numberOfLines={1} ellipsizeMode="tail">
                        {job.jobTitle}
                      </Text>

                      <View style={styles.actionsContainer}>
                        {job.jobStatus.toLowerCase() !== "pending" && (
                          <>
                            <TouchableOpacity
                              onPress={(e) => {
                                e.stopPropagation();
                                handleEditJobPress(job.id);
                              }}
                              style={styles.actionButton}
                            >
                              <Feather name="edit" size={18} color="#000" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={(e) => {
                                e.stopPropagation();
                                handleDeleteJobPress(job.id);
                              }}
                              style={styles.actionButton}
                            >
                              <Feather name="trash-2" size={18} color="#ff4444" />
                            </TouchableOpacity>
                          </>
                        )}
                        {job.jobStatus.toLowerCase() === "pending" && (
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
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

                    <Text style={styles.jobDescription} numberOfLines={2}>{job.jobDescription}</Text>

                    <View style={styles.jobFooter}>
                      <View style={styles.categoryBadge}>
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
                  </View>
                </TouchableOpacity>
              );
            })
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
                        `https://lip-balance-analyze-extends.trycloudflare.com/api/jobrequest/verify/${selectedJobId}`,
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
          <View style={[styles.detailsModalContent, { maxHeight: "80%", width: "90%", paddingBottom: 16 }]}>
            {/* Header */}
            <View style={[styles.detailsModalHeader, { justifyContent: 'flex-end' }]}>
              <TouchableOpacity
                style={styles.detailsModalClose}
                onPress={() => setViewModalVisible(false)}
              >
                <Feather name="x" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
              {/* Job Image inside Modal (placed at top) */}
              {selectedJob?.jobImage?.[0] && (
                <View style={styles.modalJobImageContainer}>
                  <Image
                    source={{
                      uri: `https://lip-balance-analyze-extends.trycloudflare.com/uploads/${
                        (selectedJob.jobImage[0] + "").replace(/\\/g, "/").split("job_request_files/")[1] ?? ''
                      }`
                    }}
                    style={styles.modalJobImage}
                    resizeMode="cover"
                  />
                </View>
              )}

              {/* Title (below image) */}
              <Text style={styles.detailsModalTitle}>
                {selectedJob?.jobTitle}
              </Text>

              {/* Description (directly underneath title, no header label, no icon, aligned fully left) */}
              <Text style={[styles.detailsValueBlock, { paddingLeft: 0, marginTop: 8, fontSize: 15, color: "#444" }]}>
                {selectedJob?.jobDescription}
              </Text>

              {/* Divider */}
              <View style={styles.detailsDivider} />

              {/* Info Rows */}
              <View style={styles.detailsInfoContainer}>

                <View style={styles.detailsGrid}>
                  <View style={styles.detailsGridItem}>
                    <Feather name="tag" size={16} color="#0B153C" style={{ marginRight: 6 }} />
                    <View>
                      <Text style={styles.detailsGridLabel}>Category</Text>
                      <Text style={styles.detailsGridValue}>{reverseCamelCase(selectedJob?.category || "")}</Text>
                    </View>
                  </View>

                  <View style={styles.detailsGridItem}>
                    <Feather name="credit-card" size={16} color="#0B153C" style={{ marginRight: 6 }} />
                    <View>
                      <Text style={styles.detailsGridLabel}>Rate</Text>
                      <Text style={styles.detailsGridValue}>
                        {selectedJob?.budget ? `₱${selectedJob.budget}` : "N/A"}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.detailsGrid}>
                  <View style={styles.detailsGridItem}>
                    <Feather name="clock" size={16} color="#0B153C" style={{ marginRight: 6 }} />
                    <View>
                      <Text style={styles.detailsGridLabel}>Duration</Text>
                      <Text style={styles.detailsGridValue}>
                        {selectedJob?.jobDuration ? `${selectedJob.jobDuration}` : "Not specified"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailsGridItem}>
                    <Feather name="calendar" size={16} color="#0B153C" style={{ marginRight: 6 }} />
                    <View>
                      <Text style={styles.detailsGridLabel}>Posted On</Text>
                      <Text style={styles.detailsGridValue}>
                        {selectedJob &&
                          new Date(selectedJob.datePosted).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.detailsGrid}>
                  <View style={styles.detailsGridItem}>
                    <Feather name="info" size={16} color="#0B153C" style={{ marginRight: 6 }} />
                    <View>
                      <Text style={styles.detailsGridLabel}>Status</Text>
                      <Text
                        style={[
                          styles.detailsGridValue,
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
                  </View>

                  <View style={styles.detailsGridItem}>
                    <Feather name="users" size={16} color="#0B153C" style={{ marginRight: 6 }} />
                    <View>
                      <Text style={styles.detailsGridLabel}>Applicants</Text>
                      <Text style={styles.detailsGridValue}>
                        {selectedJob?.applicantCount || 0}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.detailsRow}>
                  <Feather name="map-pin" size={18} color="#0B153C" style={{ marginRight: 8 }} />
                  <Text style={styles.detailsLabel}>Location:</Text>
                </View>
                <Text style={styles.detailsValueBlock}>{selectedJob?.jobLocation}</Text>

                {activeTab === "history" && (
                  <View style={[styles.detailsRow, { marginTop: 12 }]}>
                    <Feather name="dollar-sign" size={18} color="#0B153C" style={{ marginRight: 8 }} />
                    <Text style={styles.detailsLabel}>Final Offer:</Text>
                    <Text style={styles.detailsValue}>
                      {selectedJob?.offer ? `₱${selectedJob.offer}` : "Not specified"}
                    </Text>
                  </View>
                )}
              </View>

              {/* Reviews section */}
              {selectedJob?.reviews && selectedJob.reviews.length > 0 && (
                <View style={styles.reviewsSection}>
                  <View style={styles.detailsDivider} />
                  <Text style={[styles.detailsLabel, { fontSize: 16, marginBottom: 12 }]}>Feedbacks</Text>
                  {selectedJob.reviews.map((review, index) => (
                    <View key={index} style={styles.reviewItem}>
                      <Text style={styles.reviewTitle}>
                        {index === 0 ? "Your Review" : "Job-Seeker's Review"}
                      </Text>
                      <View style={styles.reviewHeader}>
                        <Image
                          source={
                            review.reviewer.profileImage
                              ? { uri: `https://lip-balance-analyze-extends.trycloudflare.com/${review.reviewer.profileImage.replace(/\\/g, "/")}` }
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
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  cardContentContainer: {
    padding: 16,
  },
  cardJobBanner: {
    width: "100%",
    height: 140,
  },
  modalJobImageContainer: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 8,
    marginBottom: 12,
  },
  modalJobImage: {
    width: "100%",
    height: "100%",
  },
  detailsInfoContainer: {
    marginTop: 8,
  },
  detailsValueBlock: {
    fontSize: 15,
    color: "#555",
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 20,
    paddingLeft: 26,
  },
  detailsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  detailsGridItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "48%",
    backgroundColor: "#f8f9fa",
    padding: 8,
    borderRadius: 8,
  },
  detailsGridLabel: {
    fontSize: 12,
    color: "#666",
  },
  detailsGridValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#222",
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
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  categoryText: {
    color: "#D97706",
    fontSize: 11,
    fontWeight: "700",
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
    justifyContent: "flex-end",
    alignItems: "center",
    height: 32,
    marginBottom: 8,
  },
  detailsModalClose: {
    padding: 4,
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
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: Platform.OS === "android" ? 44 : 10,
    backgroundColor: "#0B153C",
  },
  iosHeader: {
    paddingTop: Platform.OS === "ios" ? 10 : 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  searchText: {
    marginLeft: 8,
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "500",
  },
  notificationButton: {
    padding: 6,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 20,
  },
  jobCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0B153C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
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
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F59E0B",
    borderRadius: 18,
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748B",
  },
  activeTab: {
    color: "#0B153C",
    fontWeight: "700",
  },
  activeIndicator: {
    height: 3,
    backgroundColor: "#F59E0B",
    borderRadius: 2,
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























