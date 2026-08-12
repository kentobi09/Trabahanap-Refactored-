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
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { safePush, safeReplace } from "../constants/navigation";
import io, { Socket } from "socket.io-client";

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async () => {
    try {
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

      const host = process.env.EXPO_PUBLIC_IP_ADDRESS || "localhost";
      const response = await fetch(
        `http://${host}:3000/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
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

      setCurrentUserId(data.user.id);
      setMessage("Login successful!");

      // Initialize socket and register user
      const newSocket = io(
        `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000`,
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
    }
  };

  const handleForgotPassword = () => {
    safePush("/screen/forgot-password");
  };

  const handleSignUp = () => {
    safePush("/(auth)/user-page");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" backgroundColor="#0B153C" />

      <View style={styles.headerBackground}>
        <Image
          source={require("assets/images/ediskarte-logo.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.brandTitle}>eDiskarte</Text>
        <Text style={styles.brandSubtitle}>Empowering Local Service & Opportunities</Text>
      </View>

      <View style={styles.formContainer}>
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

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>

        <View style={styles.signUpContainer}>
          <Text style={styles.noAccountText}>Don't have an account? </Text>
          <TouchableOpacity onPress={handleSignUp}>
            <Text style={styles.signUpText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  headerBackground: {
    backgroundColor: "#0B153C",
    paddingTop: 36,
    paddingBottom: 28,
    alignItems: "center",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  logoImage: {
    width: 72,
    height: 72,
    marginBottom: 8,
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
});
