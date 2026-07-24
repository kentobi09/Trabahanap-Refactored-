import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

type NotificationType =
  | 'application'
  | 'job_match'
  | 'chat_rejected'
  | 'chat_approved'
  | 'offer_accepted'
  | 'offer_rejected'
  | 'review_jobseeker'
  | 'other';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  jobId?: string;
  applicantId?: string;
  jobTitle?: string;
  applicantName?: string;
  applicantImage?: string;
}

const NotificationScreen = () => {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<'client' | 'job-seeker' | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem('token');
        const storedUserType = await AsyncStorage.getItem('userType');
        const userId = await AsyncStorage.getItem('currentUserId');
        setUserId(userId);
        setUserType(storedUserType as 'client' | 'job-seeker');

        const response = await fetch(`http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/api/notifications`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        console.log("Raw fetched data:", data);

        // Map backend fields to frontend expected fields
        const mappedNotifications = (data.notifications || []).map((n: any) => ({
          id: n.id,
          type:
            n.notificationType === 'job-match' ? 'job_match'
            : n.notificationType === 'chat-rejected' ? 'chat_rejected'
            : n.notificationType === 'chat-approved' ? 'chat_approved'
            : n.notificationType === 'offer_accepted' ? 'offer_accepted'
            : n.notificationType === 'offer_rejected' ? 'offer_rejected'
            : n.notificationType === 'review-jobseeker' ? 'review_jobseeker'
            : 'other',
          title: n.notificationTitle,
          message: n.notificationMessage,
          timestamp: n.createdAt,
          read: n.isRead,
          jobId: n.relatedIds?.[0],
        }));
        console.log("Mapped notifications:", mappedNotifications);

        const filtered = mappedNotifications.filter(
          (n: any) =>
            n.type === 'job_match' ||
            n.type === 'chat_rejected' ||
            n.type === 'chat_approved' ||
            n.type === 'offer_accepted' ||
            n.type === 'offer_rejected' ||
            n.type === 'review_jobseeker'
        );
        console.log("Filtered notifications:", filtered);

        setNotifications(filtered);
      } catch (error) {
        setNotifications([]);
        console.log("Error fetching notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const handleNotificationPress = async (notification: Notification) => {
    if (isNavigating) return;
    setIsNavigating(true);

    try {
      if (
        notification.type === 'chat_rejected' ||
        notification.type === 'chat_approved' ||
        notification.type === 'offer_accepted' ||
        notification.type === 'offer_rejected'
      ) {
        router.push({
          pathname: '/(main)/(tabs)/(job-seeker)/job-seeker-message',
          params: {
            jobId: notification.jobId,
          },
        });
      } else if (userType === 'job-seeker' && notification.type === 'job_match') {
        try {
          const token = await AsyncStorage.getItem('token');
          const response = await fetch(
            `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/api/job-requests/${notification.jobId}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const job = await response.json();

          router.push({
            pathname: '/screen/job-seeker-screen/job-details',
            params: {
              id: job.id,
              title: job.jobTitle,
              postedDate: job.datePosted,
              description: job.jobDescription,
              rate: job.budget,
              location: job.jobLocation,
              otherParticipant: job.client.id,
              jobImages: job.jobImage,
              jobDuration: job.jobDuration,
              clientFirstName: job.client.firstName,
              clientLastName: job.client.lastName,
              clientProfileImage: job.client.profileImage,
            },
          });
        } catch (error) {
          // handle error
        }
      } else if (notification.type === 'review_jobseeker') {
        router.push({
          pathname: '/screen/profile/view-profile/view-page-job-seeker',
          params: {
            otherParticipantId: userId,
          },
        });
      }
    } finally {
      setTimeout(() => setIsNavigating(false), 1000);
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => {
    const getIcon = (type: Notification['type']) => {
      if (type === 'chat_rejected' || type === 'offer_rejected') {
        return <MaterialIcons name="cancel" size={24} color="#e74c3c" />;
      } else if (type === 'chat_approved' || type === 'offer_accepted') {
        return <MaterialIcons name="check-circle" size={24} color="#2ecc71" />;
      } else if (type === 'job_match') {
        return <MaterialIcons name="work" size={24} color="#1877F2" />;
      } else if (type === 'review_jobseeker') {
        return <MaterialIcons name="rate-review" size={24} color="#1877F2" />;
      } else {
        return <MaterialIcons name="notifications" size={24} color="#1877F2" />;
      }
    };

    return (
      <TouchableOpacity
        style={[styles.notificationItem, !item.read && styles.unreadNotification]}
        onPress={() => handleNotificationPress(item)}
        disabled={isNavigating}
      >
        <View style={styles.notificationContent}>
          <View style={styles.iconContainer}>
            {getIcon(item.type)}
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.notificationTitle}>{item.title}</Text>
            <Text style={styles.notificationMessage}>{item.message}</Text>
            <Text style={styles.timestamp}>
              {new Date(item.timestamp).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: 'numeric',
              })}
            </Text>
          </View>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back-outline" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1877F2" />
        </View>
      ) : notifications.length > 0 ? (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.notificationList}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={48} color="#666" />
          <Text style={styles.emptyText}>No notifications yet</Text>
          <Text style={styles.emptySubtext}>
            {userType === 'client'
              ? 'You will see job applications here'
              : 'You will see job matches here'}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  placeholder: {
    width: 40,
  },
  notificationList: {
    padding: 16,
  },
  notificationItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadNotification: {
    backgroundColor: '#F0F2F5',
  },
  notificationContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E7F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1877F2',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default NotificationScreen; 