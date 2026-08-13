import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { SignUpData, clearFormData } from "@/api/signup-request";
import { Ionicons } from "@expo/vector-icons";

import { Platform } from "react-native";

export default function UserTypeScreen() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<
    "job-seeker" | "client" | null
  >(null);

  const handleSelectType = (type: "job-seeker" | "client") => {
    clearFormData();
    setSelectedType(type);
  };

  const handleNext = () => {
    SignUpData({ userType: selectedType });

    if (selectedType) {
      router.push({
        pathname: "/(auth)/name-page",
      });
    }
  };
  const handleBack = () => {
    router.back();
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar style="light" backgroundColor="#0B153C" />
      <View style={[styles.topHeader, Platform.OS === 'ios' && styles.iosHeader]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>Select Account Type</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.title}>What type of{"\n"}user are you?</Text>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[
              styles.optionCard,
              selectedType === "job-seeker" && styles.selectedCard,
            ]}
            onPress={() => handleSelectType("job-seeker")}
          >
            <View style={styles.iconContainer}>
              <Image
                source={require("assets/images/utility-user.png")}
                style={styles.iconImage}
              />
            </View>
            <Text style={styles.optionText}>Job-Seeker</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionCard,
              selectedType === "client" && styles.selectedCard,
            ]}
            onPress={() => handleSelectType("client")}
          >
            <View style={styles.iconContainer}>
              <Image
                source={require("assets/images/client-user.png")}
                style={styles.iconImage}
              />
            </View>
            <Text style={styles.optionText}>Client</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.nextButton, !selectedType && styles.disabledButton]}
          onPress={handleNext}
          disabled={!selectedType}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

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
  contentContainer: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 60,
  },
  optionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 40,
  },
  optionCard: {
    width: "45%",
    aspectRatio: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
  },
  selectedCard: {
    borderColor: "#0A1747",
    borderWidth: 2,
    backgroundColor: "rgba(10, 23, 71, 0.05)",
  },
  iconContainer: {
    marginBottom: 10,
  },
  iconImage: {
    width: 50,
    height: 50,
    resizeMode: "contain",
  },
  optionText: {
    fontSize: 16,
    fontWeight: "500",
    marginTop: 5,
  },
  nextButton: {
    backgroundColor: "#0A1747",
    width: "100%",
    paddingVertical: 15,
    borderRadius: 4,
    alignItems: "center",
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: "#999",
  },
  nextButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
});
