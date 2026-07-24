import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SignUpData } from "@/api/signup-request";

export default function PasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({
    password: "",
    confirmPassword: "",
  });

  const getPasswordStrength = useMemo(() => {
    if (!password) return { strength: 0, color: '#ccc', text: '', bars: 0 };
    
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;

    let color = '#ff4444'; // red
    let text = 'Weak';
    let bars = 1;
    
    if (strength >= 4) {
      color = '#00C851'; // green
      text = 'Strong';
      bars = 3;
    } else if (strength >= 2) {
      color = '#ffbb33'; // yellow
      text = 'Medium';
      bars = 2;
    }

    return { strength, color, text, bars };
  }, [password]);

  const handleNext = (): void => {
    const newErrors = {
      password: "",
      confirmPassword: "",
    };
    let hasError = false;

    if (!password.trim()) {
      newErrors.password = "Password is required";
      hasError = true;
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      hasError = true;
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = "Please confirm your password";
      hasError = true;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      hasError = true;
    }

    setErrors(newErrors);

    if (!hasError) {
      SignUpData({ password: password });
      router.push({
        pathname: "/(auth)/gender-page",
      });
    }
  };

  const handleBack = (): void => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#000033" />
        </TouchableOpacity>
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.title}>Create a password</Text>
        <Text style={styles.subtitle}>
          Create a password with at least 6 letter or numbers. It should be
          something others can't guess.
        </Text>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={[styles.input, errors.password ? styles.inputError : null]}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) {
                    setErrors((prev) => ({ ...prev, password: "" }));
                  }
                }}
                secureTextEntry={!showPassword}
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
            {errors.password ? (
              <Text style={styles.errorText}>{errors.password}</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.passwordInputContainer}>
              <TextInput
                style={[
                  styles.input,
                  errors.confirmPassword ? styles.inputError : null,
                ]}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword) {
                    setErrors((prev) => ({ ...prev, confirmPassword: "" }));
                  }
                }}
                secureTextEntry={!showConfirmPassword}
              />
              {confirmPassword.length > 0 && (
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye" : "eye-off"}
                    size={24}
                    color="#666"
                  />
                </TouchableOpacity>
              )}
            </View>
            {errors.confirmPassword ? (
              <Text style={styles.errorText}>{errors.confirmPassword}</Text>
            ) : null}
          </View>

          {password.length > 0 && (
            <View style={styles.strengthContainer}>
              <Text style={styles.strengthLabel}>Password Strength:</Text>
              <View style={styles.barsContainer}>
                {[1, 2, 3].map((bar) => (
                  <View
                    key={bar}
                    style={[
                      styles.strengthBar,
                      {
                        backgroundColor: bar <= getPasswordStrength.bars ? getPasswordStrength.color : '#e0e0e0',
                      },
                    ]}
                  />
                ))}
              </View>
              <Text style={[styles.strengthText, { color: getPasswordStrength.color }]}>
                {getPasswordStrength.text}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
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
  inputGroup: {
    marginBottom: 20,
    width: "100%",
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: "bold",
  },
  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
  },
  input: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    borderWidth: 0,
  },
  eyeIcon: {
    padding: 8,
  },
  inputError: {
    borderColor: "red",
  },
  errorText: {
    color: "red",
    marginTop: 5,
    fontSize: 14,
  },
  nextButton: {
    backgroundColor: "#000033",
    width: "100%",
    paddingVertical: 15,
    borderRadius: 4,
    alignItems: "center",
    marginBottom: 20,
  },
  nextButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  strengthContainer: {
    marginBottom: 20,
    paddingTop: 20,
    width: '100%',
  },
  strengthLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'left',
  },
  barsContainer: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
    justifyContent: 'flex-start',
  },
  strengthBar: {
    width: 30,
    height: 4,
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
