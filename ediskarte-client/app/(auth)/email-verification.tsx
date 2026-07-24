import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Animated,
} from "react-native";
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#000033" />
        </TouchableOpacity>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 30,
    borderColor: "#000033",
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 40,
  },
  formContainer: {
    width: "100%",
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: "bold",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
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
