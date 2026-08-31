import React from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
} from "react-native";
import {
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fetchUserProfile } from "@/api/profile-request";
import { safePush, safeBack } from "../../constants/navigation";

const AboutInfoPage: React.FC = () => {
  const router = useRouter();
  const { data: workerInfo } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchUserProfile,
  });

  const handleBackPress = () => {
    safeBack();
  };

  const handleEditPress = () => {
    safePush("./edit-profile", { ...workerInfo });
  };

  const formatGender = (gender: any) => {
    if (!gender) return "Not Specified";
    const str = Array.isArray(gender) ? String(gender[0] || "") : String(gender);
    if (!str.trim()) return "Not Specified";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const formatBirthday = (birthday: any) => {
    if (!birthday) return "Not Specified";
    try {
      const bStr = Array.isArray(birthday) ? birthday[0] : birthday;
      const date = new Date(bStr);
      if (isNaN(date.getTime())) return "Not Specified";
      return date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch (e) {
      return "Not Specified";
    }
  };

  const formatProfileImage = (img: any) => {
    if (!img || typeof img !== "string") return "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y";
    if (img.startsWith("http://") || img.startsWith("https://") || img.startsWith("data:")) return img;
    const clean = img.replace(/\\/g, "/").replace(/^\/+/, "");
    return `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/${clean}`;
  };

  const formatAddress = (info: any) => {
    if (!info) return "Not Specified";
    if (typeof info.address === "string" && info.address.trim() && info.address.replace(/[\s,]/g, "").length > 0) {
      return info.address;
    }
    if (info.address && typeof info.address === "object") {
      const parts = [info.address.houseNumber, info.address.street, info.address.barangay, info.address.municipality, info.address.province].filter((p: any) => p && String(p).trim());
      if (parts.length > 0) return parts.join(", ");
    }
    const topParts = [info.houseNumber, info.street, info.barangay, info.municipality, info.province].filter((p: any) => p && String(p).trim());
    if (topParts.length > 0) return topParts.join(", ");
    return "Not Specified";
  };

  return (
    <View style={styles.mainContainer}>
      <View style={[styles.topHeader, Platform.OS === 'ios' && styles.iosHeader]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="arrow-back-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>About Info</Text>
        <TouchableOpacity style={styles.editButton} onPress={handleEditPress}>
          <Ionicons name="create-outline" size={18} color="#0B153C" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
        <View style={styles.profileCard}>
          <Image
            source={{
              uri: formatProfileImage(workerInfo?.profileImage)
            }}
            style={styles.profileImage}
          />
          <Text style={styles.profileName}>
            {workerInfo?.firstName} {workerInfo?.middleName}{" "}
            {workerInfo?.lastName} {workerInfo?.suffixName}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>

          <View style={styles.infoItem}>
            <View style={[styles.iconCircle, { backgroundColor: '#EEF2FF' }]}>
              <MaterialCommunityIcons
                name="email-outline"
                size={20}
                color="#0B153C"
              />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{workerInfo?.emailAddress || "N/A"}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoItem}>
            <View style={[styles.iconCircle, { backgroundColor: '#EEF2FF' }]}>
              <MaterialCommunityIcons
                name="phone-outline"
                size={20}
                color="#0B153C"
              />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone Number</Text>
              <Text style={styles.infoValue}>{workerInfo?.phoneNumber || "N/A"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Details</Text>

          <View style={styles.infoItem}>
            <View style={[styles.iconCircle, { backgroundColor: '#EEF2FF' }]}>
              <MaterialCommunityIcons
                name="gender-male-female"
                size={20}
                color="#0B153C"
              />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Gender</Text>
              <Text style={styles.infoValue}>
                {formatGender(workerInfo?.gender) || "N/A"}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoItem}>
            <View style={[styles.iconCircle, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color="#0B153C"
              />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Birthday</Text>
              <Text style={styles.infoValue}>
                {formatBirthday(workerInfo?.birthday) || "N/A"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Address Details</Text>

          <View style={styles.infoItem}>
            <View style={[styles.iconCircle, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons
                name="location-outline"
                size={20}
                color="#0B153C"
              />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{formatAddress(workerInfo)}</Text>
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
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F59E0B",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
  },
  editButtonText: {
    color: "#0B153C",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 4,
  },
  container: {
    flex: 1,
  },
  profileCard: {
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
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
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
});

export default AboutInfoPage;


























