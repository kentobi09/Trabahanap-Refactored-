import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
  ActivityIndicator
} from "react-native";
import {
  AntDesign,
  Ionicons,
  MaterialCommunityIcons,
  Feather,
} from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WorkerInfo {
  firstName: string;
  middleName: string;
  lastName: string;
  suffixName: string;
  profileImage: string;
  emailAddress: string;
  phoneNumber: string;
  houseNumber: string;
  street: string;
  barangay: string;
  gender: string;
  birthday: string;
  email: string;
  address: string;
  name:string;
}

const AboutInfoPage: React.FC = () => {
  const router = useRouter();
  const { otherParticipantId } = useLocalSearchParams();
  const [workerInfo, setWorkerInfo] = useState<WorkerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const jobseekerId = Array.isArray(otherParticipantId)
    ? otherParticipantId[0]
    : otherParticipantId;

  useEffect(() => {
    if (jobseekerId) {
      fetchUserProfile();
    } else {
      setError("No jobseeker ID provided");
      setLoading(false);
    }
  }, [jobseekerId]);

  const fetchUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        router.replace("/sign_in");
        return;
      }

      console.log('Fetching profile for ID:', jobseekerId);
      
      const response = await fetch(
        `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/user/profile/${jobseekerId}/details`,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch profile data');
      }

      const data = await response.json();
      console.log('Received profile data:', data);
      setWorkerInfo(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      setError("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const handleBackPress = () => {
    router.back();
  };

  const handleEditPress = () => {
    router.push({
      pathname: "./edit-profile",
      params: { otherParticipantId: jobseekerId }
    });
  };

  const formatGender = (gender: string | undefined) => {
    if (!gender) return "";
    return gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
  };

  const formatBirthday = (birthday: string | undefined) => {
    if (!birthday) return "";
    const date = new Date(birthday);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <AntDesign name="arrowleft" size={24} color="#0B153C" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>About</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0B153C" />
        </View>
      </View>
    );
  }

  if (error || !workerInfo) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <AntDesign name="arrowleft" size={24} color="#0B153C" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>About</Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || "Profile not found"}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <AntDesign name="arrowleft" size={24} color="#0B153C" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>About</Text>
          </View>

        </View>

        <View style={styles.profileSection}>
          <Image
            source={{
              uri: workerInfo.profileImage 
                ? `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/${workerInfo.profileImage}`
                : 'https://via.placeholder.com/100'
            }}
            style={styles.profileImage}
          />
          <Text style={styles.profileName}>
            {workerInfo.name}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>

          <View style={styles.infoItem}>
            <MaterialCommunityIcons
              name="email-outline"
              size={24}
              color="#0B153C"
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{workerInfo.email}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoItem}>
            <MaterialCommunityIcons
              name="phone-outline"
              size={24}
              color="#0B153C"
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone Number</Text>
              <Text style={styles.infoValue}>{workerInfo.phoneNumber}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoItem}>
            <MaterialCommunityIcons
              name="home-outline"
              size={24}
              color="#0B153C"
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>
                {workerInfo.address}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <View style={styles.infoItem}>
            <Ionicons name="person-outline" size={24} color="#0B153C" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Gender</Text>
              <Text style={styles.infoValue}>
                {formatGender(workerInfo.gender)}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoItem}>
            <MaterialCommunityIcons
              name="cake-variant-outline"
              size={24}
              color="#0B153C"
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Birthday</Text>
              <Text style={styles.infoValue}>
                {formatBirthday(workerInfo.birthday)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    padding: 16,
    paddingTop: Platform.OS === "ios" ? 50 : 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  titleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0B153C",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  editButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  profileSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  infoContent: {
    marginLeft: 16,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
  },
  infoValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#e0e0e0",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
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
});

export default AboutInfoPage;
