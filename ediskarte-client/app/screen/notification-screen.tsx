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
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

type NotificationType = 'application' | 'job_match' | 'chat_request' | 'offer' | 'offer_made' | 'offer_accepted' | 'offer_rejected' | 'review';

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
  const [userType, setUserType] = useState<'client' | 'jobseeker' | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem('token');
        const userId = await AsyncStorage.getItem('currentUserId');
        setUserId(userId);
        const storedUserType = await AsyncStorage.getItem('userType');
        setUserType(storedUserType as 'client' | 'jobseeker');

        const response = await fetch(`http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/api/notifications`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        
        // Map backend fields to frontend expected fields
        const mappedNotifications = (data.notifications || []).map((n: any) => ({
          id: n.id,
          type: n.notificationType === 'chat-request' ? 'chat_request'
            : n.notificationType === 'offer' ? 'offer'
            : n.notificationType === 'offer_made' ? 'offer_made'
            : n.notificationType === 'review-client' ? 'review'
            : 'other', // fallback for unknown types
          title: n.notificationTitle,
          message: n.notificationMessage,
          timestamp: n.createdAt,
          read: n.isRead,
          jobId: n.relatedIds?.[0],
          applicantId: n.relatedIds?.[1],
        }));

        setNotifications(
          mappedNotifications.filter(
            (n: Notification) =>
              n.type === 'chat_request' ||
              n.type === 'offer' ||
              n.type === 'offer_made' ||
              n.type === 'offer_accepted' ||
              n.type === 'offer_rejected' ||
              n.type === 'review'
          )
        );
      } catch (error) {
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const handleNotificationPress = async (notification: Notification) => {
    if (
      userType === 'client' &&
      (notification.type === 'application' ||
        notification.type === 'chat_request' ||
        notification.type === 'offer_made')
    ) {
      // Route to client-message-screen for application, chat-request, and offer_made
      router.push({
        pathname: '/(main)/(tabs)/(client)/client-message',
        params: {
          jobId: notification.jobId,
          applicantId: notification.applicantId,
        },
      });
    } else if (
      userType === 'jobseeker' &&
      (notification.type === 'job_match' || notification.type === 'offer_made')
    ) {
      // Navigate to job details for both job matches and offers
      router.push({
        pathname: '/screen/job-seeker-screen/job-details',
        params: {
          id: notification.jobId,
        },
      });
    } else if (notification.type === 'review') {
      // Route to client profile view page with otherParticipantId
      router.push({
        pathname: '/screen/profile/view-profile/view-page-client',
        params: {
          otherParticipantId: userId,
        },
      });
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => {
    const getIcon = () => {
      if (item.type === 'chat_request') {
        return <MaterialIcons name="person-add" size={24} color="#1877F2" />;
      } else if (item.type === 'offer_made') {
        return <MaterialCommunityIcons name="currency-php" size={24} color="#1877F2" />;
      } else if (item.type === 'offer') {
        return <MaterialIcons name="work" size={24} color="#1877F2" />;
      } else if (item.type === 'review') {
        return <MaterialIcons name="rate-review" size={24} color="#1877F2" />;
      }
      // fallback icon if needed
      return <MaterialIcons name="notifications" size={24} color="#1877F2" />;
    };

    return (
      <TouchableOpacity
        style={[styles.notificationItem, !item.read && styles.unreadNotification]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={styles.notificationContent}>
          <View style={styles.iconContainer}>
            {getIcon()}
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
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#0B153C" />
      
      <View style={[styles.topHeader, Platform.OS === 'ios' && styles.iosHeader]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>Notifications</Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topHeader: {
    backgroundColor: '#0B153C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: Platform.OS === 'android' ? 44 : 10,
  },
  iosHeader: {
    paddingTop: Platform.OS === 'ios' ? 10 : 10,
  },
  backButton: {
    padding: 6,
  },
  topHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
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









