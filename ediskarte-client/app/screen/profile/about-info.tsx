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
  AntDesign,
  Ionicons,
  MaterialCommunityIcons,
  Feather,
} from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fetchUserProfile } from "@/api/profile-request";

const AboutInfoPage: React.FC = () => {
  const router = useRouter();
  const { data: workerInfo } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchUserProfile,
  });

  const handleBackPress = () => {
    router.back();
  };

  const handleEditPress = () => {
    // Navigate to edit profile page with the current info as params
    router.push({
      pathname: "./edit-profile",
      params: { ...workerInfo },
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

  return (
    <View style={styles.mainContainer}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <AntDesign name="arrowleft" size={24} color="#0B153C" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>     About</Text>
          </View>
          <TouchableOpacity style={styles.editButton} onPress={handleEditPress}>
            <Feather name="edit-2" size={16} color="#fff" />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.profileSection}>
          <Image
            source={{
              uri: `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/${workerInfo?.profileImage}`,
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
            <MaterialCommunityIcons
              name="email-outline"
              size={24}
              color="#0B153C"
            />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{workerInfo?.emailAddress}</Text>
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
              <Text style={styles.infoValue}>{workerInfo?.phoneNumber}</Text>
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
                {workerInfo?.houseNumber} {workerInfo?.street}{" "}
                {workerInfo?.barangay}
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
                {formatGender(workerInfo?.gender)}
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
                {formatBirthday(workerInfo?.birthday)}
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
});

export default AboutInfoPage;
