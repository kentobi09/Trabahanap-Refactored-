import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  Animated,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { storeOTPRequest, verifyOTPRequest } from "../../api/signup-request";

export default function EmailVerificationScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(120); // 2 minutes in seconds
  const [canResend, setCanResend] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [showErrorModal, setShowErrorModal] = useState<boolean>(false);
  const [modalAnimation] = useState(new Animated.Value(0));
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);

  // Send OTP when the component mounts if email is available
  useEffect(() => {
    const sendInitialOTP = async () => {
      if (email) {
        try {
          console.log("Sending initial OTP for:", email);
          await storeOTPRequest(email);
          // Optionally, show a success message (e.g., toast)
          console.log("Initial OTP request sent successfully.");
        } catch (error) {
          setError(
            "Failed to send initial verification code. Please try again later."
          );
          console.error("Error sending initial OTP:", error);
          // Optionally, show an error message to the user
        }
      }
    };

    sendInitialOTP();
  }, [email]); // Run when email value is available/changes

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Re-add showModal function for success/error feedback
  const showModal = (type: "success" | "error") => {
    Animated.sequence([
      Animated.timing(modalAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(modalAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (type === "success") {
        setShowSuccessModal(false);
        // Navigate to password page on success, DO NOT pass OTP
        router.push({
          pathname: "/(auth)/password-page",
          params: { email: email }, // Only pass email
        });
      } else {
        setShowErrorModal(false);
      }
    });
  };

  const handleSubmit = async (): Promise<void> => {
    // Make async again
    if (!verificationCode.trim()) {
      setError("Please enter the verification code");
      return;
    }

    // Add length check back
    if (verificationCode.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    // Add email check back
    if (!email) {
      setError("Email address not found. Please go back.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      // Call the new verification endpoint
      const isVerified = await verifyOTPRequest(email, verificationCode);
      if (isVerified) {
        setShowSuccessModal(true);
        showModal("success"); // Show success modal, which navigates
      } else {
        // Use a generic error or potentially the one from the server
        setError("Invalid verification code. Please try again.");
        setShowErrorModal(true);
        showModal("error");
      }
    } catch (apiError) {
      setError("An error occurred during verification. Please try again.");
      setShowErrorModal(true);
      showModal("error");
      console.error("Verification API error:", apiError);
    } finally {
      setIsSubmitting(false);
    }

    // Removed direct navigation from here
    // router.push({ ... });
  };

  const handleResendCode = async (): Promise<void> => {
    if (canResend && !isResending && email) {
      setIsResending(true);
      try {
        await storeOTPRequest(email);
        setTimeLeft(120);
        setCanResend(false);
      } catch (apiError) {
        console.error("Resend OTP API error:", apiError);
      } finally {
        setIsResending(false);
      }
    }
  };

  const handleBack = (): void => {
    router.back();
  };

  // Re-add renderModal function
  const renderModal = (type: "success" | "error") => {
    const isSuccess = type === "success";
    return (
      <Modal
        transparent
        visible={isSuccess ? showSuccessModal : showErrorModal}
        animationType="none"
      >
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [
                  {
                    translateY: modalAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [100, 0],
                    }),
                  },
                ],
                opacity: modalAnimation,
              },
            ]}
          >
            <View
              style={[
                styles.modalIcon,
                isSuccess ? styles.successIcon : styles.errorIcon,
              ]}
            >
              <Ionicons
                name={isSuccess ? "checkmark" : "close"}
                size={32}
                color="white"
              />
            </View>
            <Text style={styles.modalTitle}>
              {isSuccess ? "Verification Successful" : "Invalid Code"}
            </Text>
            <Text style={styles.modalMessage}>
              {isSuccess
                ? "Your email has been verified successfully!" // Updated success message
                : "The verification code you entered is incorrect. Please try again."}
            </Text>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar style="light" backgroundColor="#0B153C" />

      <View style={[styles.topHeader, Platform.OS === 'ios' && styles.iosHeader]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>Verify Email</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.title}>Enter verification code</Text>
        <Text style={styles.subtitle}>
          We've sent a 6-digit code to your email address.{"\n"}
          Please enter it below.
        </Text>

        <View style={styles.formContainer}>
          <Text style={styles.label}>Verification Code</Text>
          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            value={verificationCode}
            onChangeText={(text) => {
              setVerificationCode(text);
              if (error) setError("");
            }}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="Enter 6-digit code"
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[
              styles.resendButton,
              !canResend && styles.resendButtonDisabled,
              isResending && styles.resendButtonDisabled,
            ]}
            onPress={handleResendCode}
            disabled={!canResend || isResending}
          >
            <Text style={styles.resendButtonText}>
              {isResending
                ? "Sending..."
                : canResend
                ? "Resend Code"
                : `Resend Code in ${formatTime(timeLeft)}`}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[
            styles.submitButton,
            isSubmitting && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? "Verifying..." : "Verify"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Re-add modal rendering */}
      {renderModal("success")}
      {renderModal("error")}
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
    fontSize: 18,
    backgroundColor: "#FFFFFF",
    color: "#0F172A",
    textAlign: "center",
    letterSpacing: 8,
  },
  inputError: {
    borderColor: "red",
  },
  errorText: {
    color: "red",
    marginTop: 5,
    fontSize: 14,
  },
  resendButton: {
    marginTop: 20,
    padding: 10,
    alignItems: "center",
  },
  resendButtonDisabled: {
    opacity: 0.5,
  },
  resendButtonText: {
    color: "#3366CC",
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: "#000033",
    width: "100%",
    paddingVertical: 15,
    borderRadius: 4,
    alignItems: "center",
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 24,
    width: "80%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  successIcon: {
    backgroundColor: "#4CAF50",
  },
  errorIcon: {
    backgroundColor: "#F44336",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
});
