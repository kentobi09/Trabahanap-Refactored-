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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000033" />
        </TouchableOpacity>
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
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
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
    paddingHorizontal: 40,
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
  required: {
    color: "red",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: "red",
    backgroundColor: "rgba(255, 0, 0, 0.05)",
  },
  errorText: {
    color: "red",
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
});
