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

export default function WelcomeScreen() {
  const router = useRouter();

  const handleLogin = () => {
    router.push("/(auth)/sign_in");
  };

  const handleSignUp = () => {
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
      <StatusBar style="auto" />

      <View style={styles.logoContainer}>
        <Image
          source={require("assets/images/ediskarte-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
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
    backgroundColor: "#0B153C",
    alignItems: "center",
  },
  logoContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 220,
    height: 220,
    marginBottom: 10,
  },
  buttonContainer: {
    width: "100%",
    paddingHorizontal: 36,
    marginBottom: 48,
  },
  loginButton: {
    backgroundColor: "#F59E0B",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 16,
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
  signUpButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  signUpButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
