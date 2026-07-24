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
    backgroundColor: "#fff",
    alignItems: "center",
  },
  logoContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 240,
    height: 240,
    marginBottom: 10,
  },
  buttonContainer: {
    width: "100%",
    paddingHorizontal: 40,
    marginBottom: 40,
  },
  loginButton: {
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 4,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 15,
  },
  loginButtonText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "500",
  },
  signUpButton: {
    backgroundColor: "#0A1747",
    borderRadius: 4,
    paddingVertical: 15,
    alignItems: "center",
  },
  signUpButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "500",
  },
});
