import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Platform,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Feedback {
  id: string;
  rating: number;
  comment: string;
  date: string;
  anonymousName: string;
}

const ViewAllFeedbacks: React.FC = () => {
  const router = useRouter();
  const { otherParticipantId } = useLocalSearchParams();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const jobseekerId = Array.isArray(otherParticipantId)
    ? otherParticipantId[0]
    : otherParticipantId;

  useEffect(() => {
    if (jobseekerId) {
      fetchFeedbacks();
    } else {
      setError("No jobseeker ID provided");
      setLoading(false);
    }
  }, [jobseekerId]);

  const fetchFeedbacks = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        router.replace("/sign_in");
        return;
      }

      console.log('Fetching reviews for jobseeker ID:', jobseekerId);
      
      const response = await fetch(
        `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/user/reviews/${jobseekerId}`,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );

      console.log('Reviews response status:', response.status);

      if (!response.ok) {
        console.error('Failed to fetch reviews. Status:', response.status);
        throw new Error(`Failed to fetch reviews: ${response.status}`);
      }

      const data = await response.json();
      console.log('Received reviews data:', data);

      if (!Array.isArray(data)) {
        console.error('Received invalid reviews data format:', data);
        setFeedbacks([]);
      } else {
        setFeedbacks(data);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
      setError("Failed to load reviews. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  const renderFeedbackItem = ({ item }: { item: Feedback }) => (
    <View style={styles.feedbackCard}>
      <View style={styles.feedbackHeader}>
        <Text style={styles.feedbackAnonymousName}>{item.anonymousName}</Text>
        {renderFeedbackStars(item.rating)}
      </View>
      <Text style={styles.feedbackComment}>{item.comment}</Text>
      <Text style={styles.feedbackDate}>{formatDate(item.date)}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <AntDesign name="arrowleft" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>All Feedbacks</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0B153C" />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <AntDesign name="arrowleft" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>All Feedbacks</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <AntDesign name="arrowleft" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Feedbacks</Text>
      </View>

      {feedbacks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No feedbacks yet</Text>
        </View>
      ) : (
        <FlatList
          data={feedbacks}
          renderItem={renderFeedbackItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.feedbackList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  feedbackList: {
    padding: 16,
  },
  feedbackCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
    lineHeight: 20,
    marginBottom: 8,
  },
  feedbackDate: {
    fontSize: 12,
    color: '#999',
  },
});

export default ViewAllFeedbacks; 