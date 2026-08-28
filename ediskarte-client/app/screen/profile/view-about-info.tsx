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
import { safePush, safeReplace, safeBack } from "../../constants/navigation";

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
        safeReplace("/sign_in");
        return;
      }

      console.log('Fetching profile for ID:', jobseekerId);
      
      const response = await fetch(
        `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/user/profile/${jobseekerId}/details`,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }

      const data = await response.json();
      console.log('Profile fetched successfully:', data);
      
      // If the response is nested (from /details endpoint which returns { user: {...} }), flatten it
      if (data.user) {
        const flatData = {
          ...data,
          ...data.user,
          name: `${data.user.firstName} ${data.user.middleName || ""} ${data.user.lastName}`,
          email: data.user.emailAddress,
          address: [
            data.user.houseNumber,
            data.user.street,
            data.user.barangay,
            data.user.municipality,
            data.user.province
          ].filter((p: any) => p && String(p).trim()).join(", ") || "Not Specified",
          phoneNumber: data.user.phoneNumber || "",
        };
        setWorkerInfo(flatData);
      } else {
        setWorkerInfo(data);
      }
      setLoading(false);
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      setError(error.message || "Failed to load profile details");
      setLoading(false);
    }
  };

  const handleBackPress = () => {
    safeBack();
  };

  const handleEditPress = () => {
    safePush("./edit-profile", { otherParticipantId: jobseekerId });
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
      <View style={styles.mainContainer}>
        <View style={[styles.topHeader, Platform.OS === 'ios' && styles.iosHeader]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="arrow-back-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.topHeaderTitle}>About Info</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0B153C" />
        </View>
      </View>
    );
  }

  if (error || !workerInfo) {
    return (
      <View style={styles.mainContainer}>
        <View style={[styles.topHeader, Platform.OS === 'ios' && styles.iosHeader]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="arrow-back-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.topHeaderTitle}>About Info</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || "Profile not found"}</Text>
        </View>
      </View>
    );
  }

  const getImageUrl = (img: any) => {
    if (!img || typeof img !== "string") return 'https://via.placeholder.com/100';
    if (img.startsWith("http://") || img.startsWith("https://") || img.startsWith("data:")) return img;
    const clean = img.replace(/\\/g, "/").replace(/^\/+/, "");
    return `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/${clean}`;
  };

  return (
    <View style={styles.mainContainer}>
      <View style={[styles.topHeader, Platform.OS === 'ios' && styles.iosHeader]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="arrow-back-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>About Info</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>

        <View style={styles.profileSection}>
          <Image
            source={{
              uri: getImageUrl(workerInfo.profileImage)
            }}
            style={styles.profileImage}
          />
          <Text style={styles.profileName}>
            {workerInfo.name || "User"}
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
              <Text style={styles.infoValue}>{workerInfo.phoneNumber || "Not Specified"}</Text>
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


      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topHeader: {
    backgroundColor: "#0B153C",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: Platform.OS === "android" ? 44 : 10,
  },
  iosHeader: {
    paddingTop: Platform.OS === "ios" ? 10 : 10,
  },
  backButton: {
    padding: 6,
  },
  topHeaderTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  container: {
    flex: 1,
  },
  profileSection: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0B153C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: "#0B153C",
  },
  profileName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0F172A",
    textAlign: "center",
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0B153C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  infoContent: {
    marginLeft: 14,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 15,
    color: "#0F172A",
    fontWeight: "600",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
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
    color: "#EF4444",
    fontSize: 16,
    textAlign: "center",
  },
});

export default AboutInfoPage;








