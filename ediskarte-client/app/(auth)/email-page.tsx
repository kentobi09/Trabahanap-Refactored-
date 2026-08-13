import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SignUpData } from "@/api/signup-request";

import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";

export default function EmailEntryScreen() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string>("");

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleNext = (): void => {
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setError("");

    SignUpData({ emailAddress: email });
    router.push({
      pathname: "/(auth)/email-verification",
      params: { email: email },
    });
  };

  const handleBack = (): void => {
    router.back();
  };

  const handleEmailChange = (text: string): void => {
    setEmail(text);
    if (error) setError("");
  };

  const handleLearnMore = (): void => {
    //Linking.openURL('');
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar style="light" backgroundColor="#0B153C" />

      <View style={[styles.topHeader, Platform.OS === 'ios' && styles.iosHeader]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>Create Account</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.title}>What's your email?</Text>
        <Text style={styles.subtitle}>
          Enter the email where you can be contacted. {"\n"}No one will see this
          on your profile.
        </Text>

        <View style={styles.formContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            value={email}
            onChangeText={handleEmailChange}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={styles.disclaimer}>
            You'll also receive emails from us and can opt out anytime.{" "}
            <Text style={styles.learnMoreLink} onPress={handleLearnMore}>
              Learn more
            </Text>
          </Text>
        </View>

        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
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
  label: {
    fontSize: 14,
    marginBottom: 6,
    fontWeight: "600",
    color: "#1E293B",
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
    marginTop: 5,
    fontSize: 12,
  },
  disclaimer: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 12,
  },
  learnMoreLink: {
    color: "#D97706",
    fontWeight: "600",
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
