import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ScrollView,
  Platform,
  Modal,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { safePush, safeReplace, safeBack } from "../constants/navigation";
import io, { Socket } from "socket.io-client";
import { disconnectSocket } from "@/app/services/socket";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  const [bannedModalVisible, setBannedModalVisible] = useState(false);
  const [accountStatusData, setAccountStatusData] = useState<{
    status: "banned" | "suspended";
    reason: string;
    suspendedUntil?: string | null;
  } | null>(null);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async () => {
    if (loading) return;

    // Validate empty fields
    if (!email.trim() && !password.trim()) {
      setMessage("Please enter both email and password");
      return;
    }

    if (!email.trim()) {
      setMessage("Please enter your email");
      return;
    }

    if (!password.trim()) {
      setMessage("Please enter your password");
      return;
    }

    // Validate email format
    if (!validateEmail(email)) {
      setMessage("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const host = "lip-balance-analyze-extends.trycloudflare.com" || "localhost";
      const response = await fetch(
        `https://lip-balance-analyze-extends.trycloudflare.com/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403 || data.accountStatus === "banned" || data.accountStatus === "suspended") {
          setAccountStatusData({
            status: data.accountStatus || "banned",
            reason: data.banReason || data.suspendReason || data.error || "Account access restricted.",
            suspendedUntil: data.suspendedUntil || null,
          });
          setBannedModalVisible(true);
          return;
        }

        // Handle specific error cases based on backend response
        if (response.status === 401) {
          if (data.error === "User not found") {
            setMessage("Email not found. Please check your email or sign up.");
          } else if (data.error === "Invalid password") {
            setMessage("Incorrect password. Please try again.");
          } else {
            setMessage("Invalid email or password");
          }
        } else {
          setMessage(data.error || "Login failed. Please try again.");
        }
        return;
      }

      await AsyncStorage.setItem("token", data.token);
      await AsyncStorage.setItem("currentUserId", data.user.id);
      await AsyncStorage.setItem("userType", data.user.userType);
      await AsyncStorage.setItem("verificationStatus", data.user.verificationStatus || "");
      await AsyncStorage.multiRemove(['cached_user_chats_client', 'cached_user_chats_jobseeker']);

      setCurrentUserId(data.user.id);
      setMessage("Login successful!");

      // Disconnect any stale socket session
      disconnectSocket();

      // Initialize fresh socket and register new user
      const newSocket = io(
        `https://lip-balance-analyze-extends.trycloudflare.com`,
        {
          auth: {
            token: data.token,
          },
        }
      );

      newSocket.emit("register_user", data.user.id);

      setSocket(newSocket);

      const isJobSeeker = data.user?.userType === "job-seeker";

      safeReplace(
        isJobSeeker
          ? "/(main)/(tabs)/(job-seeker)/job-seeker-home"
          : "/(main)/(tabs)/(client)/client-home"
      );
    } catch (error) {
      setMessage("An error occurred. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    safePush("/screen/forgot-password");
  };

  const handleSignUp = () => {
    safePush("/(auth)/user-page");
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#0B153C" />

      <View style={styles.headerBackground}>
        <TouchableOpacity style={styles.backButton} onPress={() => safeBack()}>
          <Ionicons name="arrow-back-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.logoCard}>
          <Image
            source={require("assets/images/ediskarte-logo.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.brandTitle}>eDiskarte</Text>
        <Text style={styles.brandSubtitle}>Empowering Local Service & Opportunities</Text>
      </View>

      <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Sign In</Text>
        <Text style={styles.subtitle}>Enter your details to access your account</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setMessage(""); // Clear error message when user types
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="Enter your email"
          />
          <View style={styles.inputLine} />
          <Text style={styles.inputLabel}>Email</Text>
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setMessage(""); // Clear error message when user types
              }}
              secureTextEntry={!showPassword}
              placeholder="Enter your password"
            />
            {password.length > 0 && (
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye" : "eye-off"}
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.inputLine} />
          <View style={styles.passwordLabelContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <TouchableOpacity onPress={handleForgotPassword}>
              <Text style={styles.forgotText}>Forgot Password</Text>
            </TouchableOpacity>
          </View>
        </View>

        {message ? (
          <Text
            style={[
              styles.errorMessage,
              message === "Login successful!" ? styles.successMessage : null,
            ]}
          >
            {message}
          </Text>
        ) : null}

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#0B153C" />
              <Text style={styles.loginButtonText}>Logging in...</Text>
            </View>
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </TouchableOpacity>

        <View style={styles.signUpContainer}>
          <Text style={styles.noAccountText}>Don't have an account? </Text>
          <TouchableOpacity onPress={handleSignUp}>
            <Text style={styles.signUpText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Account Status Card Modal */}
      <Modal
        visible={bannedModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBannedModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.accountStatusCard}>
            <View
              style={[
                styles.statusIconContainer,
                accountStatusData?.status === "banned"
                  ? styles.bannedIconBg
                  : styles.suspendedIconBg,
              ]}
            >
              <Ionicons
                name={accountStatusData?.status === "banned" ? "ban" : "warning"}
                size={42}
                color="#FFFFFF"
              />
            </View>

            <Text style={styles.statusTitle}>
              {accountStatusData?.status === "banned"
                ? "Account Banned"
                : "Account Suspended"}
            </Text>

            <Text style={styles.statusDescription}>
              Your account access has been restricted by the administrator.
            </Text>

            <View style={styles.reasonBox}>
              <Text style={styles.reasonLabel}>Reason:</Text>
              <Text style={styles.reasonText}>{accountStatusData?.reason}</Text>
              {accountStatusData?.status === "suspended" &&
                accountStatusData.suspendedUntil && (
                  <Text style={styles.suspensionExpiry}>
                    Suspended until:{" "}
                    {new Date(accountStatusData.suspendedUntil).toLocaleDateString()}
                  </Text>
                )}
            </View>

            <Text style={styles.contactSupportText}>
              If you believe this action was taken in error, please contact customer support.
            </Text>

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setBannedModalVisible(false)}
            >
              <Text style={styles.closeModalButtonText}>Understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  headerBackground: {
    backgroundColor: "#0B153C",
    paddingTop: Platform.OS === "android" ? 44 : 20,
    paddingBottom: 24,
    alignItems: "center",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    position: "relative",
  },
  backButton: {
    position: "absolute",
    left: 16,
    top: Platform.OS === "android" ? 44 : 20,
    padding: 6,
    zIndex: 10,
  },
  logoCard: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  logoImage: {
    width: 54,
    height: 54,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
    fontWeight: "500",
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    fontSize: 15,
    color: "#0F172A",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  inputLine: {
    display: "none",
  },
  inputLabel: {
    fontSize: 13,
    marginBottom: 6,
    fontWeight: "700",
    color: "#0F172A",
  },
  passwordLabelContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  forgotText: {
    color: "#2563EB",
    fontSize: 13,
    fontWeight: "600",
  },
  loginButton: {
    backgroundColor: "#F59E0B",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
    marginTop: 12,
    shadowColor: "#F59E0B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loginButtonText: {
    color: "#0B153C",
    fontSize: 16,
    fontWeight: "bold",
  },
  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  noAccountText: {
    fontSize: 14,
    color: "#64748B",
  },
  signUpText: {
    fontSize: 14,
    color: "#D97706",
    fontWeight: "700",
  },
  passwordInputContainer: {
    position: "relative",
    justifyContent: "center",
  },
  passwordInput: {
    paddingRight: 44,
  },
  eyeIcon: {
    position: "absolute",
    right: 12,
  },
  errorMessage: {
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 10,
    fontSize: 14,
    fontWeight: "500",
  },
  successMessage: {
    color: "#10B981",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  accountStatusCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  statusIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  bannedIconBg: {
    backgroundColor: "#EF4444",
  },
  suspendedIconBg: {
    backgroundColor: "#F59E0B",
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0F172A",
    marginBottom: 6,
    textAlign: "center",
  },
  statusDescription: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 18,
  },
  reasonBox: {
    width: "100%",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  reasonLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 14,
    color: "#1E293B",
    lineHeight: 20,
  },
  suspensionExpiry: {
    fontSize: 12,
    fontWeight: "600",
    color: "#D97706",
    marginTop: 8,
  },
  contactSupportText: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 20,
  },
  closeModalButton: {
    backgroundColor: "#0B153C",
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  closeModalButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
  },
});























