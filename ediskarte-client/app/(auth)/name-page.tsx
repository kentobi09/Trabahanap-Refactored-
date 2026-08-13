import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SignUpData, handleFormData } from "@/api/signup-request";

import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";

export default function NameEntryScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [suffix, setSuffix] = useState("");

  const [firstNameError, setFirstNameError] = useState(false);
  const [lastNameError, setLastNameError] = useState(false);
  const [middleNameError, setMiddleNameError] = useState(false);

  const handleStringInput = (text: string): string => {
    return text.replace(/[^a-zA-Z\s]/g, "");
  };

  const handleNext = () => {
    setFirstNameError(false);
    setLastNameError(false);
    setMiddleNameError(false);

    let hasError = false;

    if (!firstName.trim()) {
      setFirstNameError(true);
      hasError = true;
    }

    if (!lastName.trim()) {
      setLastNameError(true);
      hasError = true;
    }

    if (hasError) {
      Alert.alert("Required Fields", "Please fill in all required fields");
      return;
    }

    SignUpData({
      firstName: firstName,
      middleName: middleName,
      lastName: lastName,
      suffixName: suffix,
    });

    router.push({
      pathname: "/(auth)/age-page",
    });
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
        <Text style={styles.topHeaderTitle}>Create Account</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.title}>What's your name?</Text>
        <Text style={styles.subtitle}>Enter your real name.</Text>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              First Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, firstNameError && styles.inputError]}
              value={firstName}
              onChangeText={(text) => {
                const filteredText = handleStringInput(text);
                setFirstName(filteredText);
                if (filteredText.trim()) setFirstNameError(false);
              }}
              placeholder=""
            />
            {firstNameError && (
              <Text style={styles.errorText}>First name is required</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Last Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, lastNameError && styles.inputError]}
              value={lastName}
              onChangeText={(text) => {
                const filteredText = handleStringInput(text);
                setLastName(filteredText);
                if (filteredText.trim()) setLastNameError(false);
              }}
              placeholder=""
            />
            {lastNameError && (
              <Text style={styles.errorText}>Last name is required</Text>
            )}
          </View>

          <View style={styles.rowContainer}>
            <View style={[styles.inputGroup, styles.middleNameContainer]}>
              <Text style={styles.label}>
                Middle Name
              </Text>
              <TextInput
                style={styles.input}
                value={middleName}
                onChangeText={(text) => {
                  const filteredText = handleStringInput(text);
                  setMiddleName(filteredText);
                }}
                placeholder=""
              />
            </View>

            <View style={[styles.inputGroup, styles.suffixContainer]}>
              <Text style={styles.label}>Suffix</Text>
              <TextInput
                style={styles.input}
                value={suffix}
                onChangeText={(text) => setSuffix(handleStringInput(text))}
                placeholder=""
              />
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
    fontSize: 24,
    fontWeight: "bold",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 28,
  },
  formContainer: {
    width: "100%",
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
    width: "100%",
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    fontWeight: "600",
    color: "#1E293B",
  },
  required: {
    color: "#EF4444",
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: "#FFFFFF",
    color: "#0F172A",
  },
  inputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
  },
  rowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  middleNameContainer: {
    width: "60%",
    marginRight: 10,
  },
  suffixContainer: {
    width: "35%",
  },
  nextButton: {
    backgroundColor: "#0B153C",
    width: "100%",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#0B153C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
