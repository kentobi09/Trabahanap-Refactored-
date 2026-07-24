import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Modal,
  FlatList,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SignUpData } from "@/api/signup-request";
import { barangays } from "../constants/barangays";

interface FormData {
  barangay: string;
  street: string;
  houseNumber: string;
}

interface FormErrors {
  barangay?: string;
  street?: string;
  houseNumber?: string;
}

export default function AddressEntryScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    barangay: "",
    street: "",
    houseNumber: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [modalVisible, setModalVisible] = useState(false);

  const handleInputChange = (field: keyof FormData, value: string): void => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleNext = (): void => {
    const newErrors: FormErrors = {};

    if (!formData.barangay.trim()) {
      newErrors.barangay = "Barangay is required";
    }

    if (!formData.street.trim()) {
      newErrors.street = "Street is required";
    }

    if (!formData.houseNumber.trim()) {
      newErrors.houseNumber = "House Number is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    SignUpData({
      barangay: formData.barangay,
      street: formData.street,
      houseNumber: formData.houseNumber,
    });

    router.push({
      pathname: "/(auth)/email-page",
    });
  };

  const handleBack = (): void => {
    router.back();
  };

  const handleBarangaySelect = (barangay: string) => {
    handleInputChange("barangay", barangay);
    setModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#000033" />
        </TouchableOpacity>
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.title}>What's your address?</Text>
        <Text style={styles.subtitle}>
          Enter your address. You can always make this private alter
        </Text>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Barangay</Text>
            <TouchableOpacity
              style={[styles.input, errors.barangay ? styles.inputError : null]}
              onPress={() => setModalVisible(true)}
            >
              <Text style={formData.barangay ? styles.selectedText : styles.placeholderText}>
                {formData.barangay || "Select a barangay"}
              </Text>
            </TouchableOpacity>
            {errors.barangay ? (
              <Text style={styles.errorText}>{errors.barangay}</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Street</Text>
            <TextInput
              style={[styles.input, errors.street ? styles.inputError : null]}
              value={formData.street}
              onChangeText={(text) => handleInputChange("street", text)}
            />
            {errors.street ? (
              <Text style={styles.errorText}>{errors.street}</Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>House Number</Text>
            <TextInput
              style={[
                styles.input,
                errors.houseNumber ? styles.inputError : null,
              ]}
              value={formData.houseNumber}
              onChangeText={(text) => handleInputChange("houseNumber", text)}
              keyboardType="numeric"
              maxLength={10}
            />
            {errors.houseNumber ? (
              <Text style={styles.errorText}>{errors.houseNumber}</Text>
            ) : null}
          </View>
        </View>

        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Barangay</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={barangays}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.barangayItem}
                  onPress={() => handleBarangaySelect(item)}
                >
                  <Text style={styles.barangayText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
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
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  barangayItem: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  barangayText: {
    fontSize: 16,
  },
  selectedText: {
    fontSize: 16,
    color: "#000",
  },
  placeholderText: {
    fontSize: 16,
    color: "#999",
  },
});
