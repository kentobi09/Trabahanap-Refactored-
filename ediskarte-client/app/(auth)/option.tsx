import React, { useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import decodeToken from "@/api/token-decoder";

import { clearFormData } from "@/api/signup-request";

import { BackHandler } from "react-native";

export default function WelcomeScreen() {
  const router = useRouter();

  useEffect(() => {
    const backAction = () => {
      BackHandler.exitApp();
      return true;
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, []);

  const handleLogin = () => {
    router.push("/(auth)/sign_in");
  };

  const handleSignUp = () => {
    clearFormData();
    router.push("/(auth)/user-page");
  };

  const handleCheckToken = async () => {
    const { data, config } = await decodeToken();

    if (config.params && data.userType == "client") {
      router.push("/(client)/client-home");
    } else if (config.params && data.userType == "job-seeker") {
      router.push("/(job-seeker)/job-seeker-home");
    } else {
      router.push("/(auth)/sign_in");
    }
  };

  useEffect(() => {
    setTimeout(() => {
      // Disabled temporarily the auto-login if client recently logged in
      //handleCheckToken();
    }, 100);
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.logoContainer}>
        <Image
          source={require("assets/images/ediskarte-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.brandTitle}>eDiskarte</Text>
        <Text style={styles.brandSubtitle}>Empowering Local Service & Opportunities</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.signUpButton} onPress={handleSignUp}>
          <Text style={styles.signUpButtonText}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  logoContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0B153C",
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
    fontWeight: "500",
    textAlign: "center",
  },
  buttonContainer: {
    width: "100%",
    paddingHorizontal: 36,
    marginBottom: 48,
  },
  loginButton: {
    backgroundColor: "#0B153C",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 14,
    shadowColor: "#0B153C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  signUpButton: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1.5,
    borderColor: "#F59E0B",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  signUpButtonText: {
    color: "#D97706",
    fontSize: 16,
    fontWeight: "bold",
  },
});
