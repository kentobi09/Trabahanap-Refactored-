import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SignUpData } from "@/api/signup-request";

export default function BirthdayEntryScreen() {
  const router = useRouter();
  const [birthdate, setBirthdate] = useState<Date | undefined>(undefined);
  const [age, setAge] = useState<number | null>(null);
  const [error, setError] = useState<string>("");
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);

  const calculateAge = (birthday: Date): number => {
    const today = new Date();
    let calculatedAge = today.getFullYear() - birthday.getFullYear();
    const monthDifference = today.getMonth() - birthday.getMonth();

    if (
      monthDifference < 0 ||
      (monthDifference === 0 && today.getDate() < birthday.getDate())
    ) {
      calculatedAge--;
    }

    return calculatedAge;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowAndroidPicker(false);
    }

    const currentDate = selectedDate || birthdate;
    if (currentDate) {
      setBirthdate(currentDate);
      const calculatedAge = calculateAge(currentDate);
      setAge(calculatedAge);
      
      if (calculatedAge < 18) {
        setError("You must be at least 18 years old");
      } else {
        setError("");
      }
    }
  };

  const handleNext = (): void => {
    if (!birthdate) {
      setError("Please select your birthdate");
      return;
    }

    if (age && age < 18) {
      setError("You must be at least 18 years old");
      return;
    }

    SignUpData({ birthday: birthdate.toISOString(), age: age });

    router.push({
      pathname: "/(auth)/address-page",
    });
  };

  const handleBack = (): void => {
    router.back();
  };

  const renderDatePicker = () => {
    if (Platform.OS === "ios") {
      return (
        <View style={[styles.input, error ? styles.inputError : null]}>
          <DateTimePicker
            testID="dateTimePicker"
            value={birthdate || new Date()}
            mode="date"
            is24Hour={true}
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        </View>
      );
    }

    return (
      <>
        <TouchableOpacity
          style={[styles.input, error ? styles.inputError : null]}
          onPress={() => setShowAndroidPicker(true)}
        >
          <Text style={styles.dateText}>
            {birthdate
              ? birthdate.toLocaleDateString()
              : "Select your birthdate"}
          </Text>
        </TouchableOpacity>

        {showAndroidPicker && (
          <DateTimePicker
            testID="dateTimePicker"
            value={birthdate || new Date()}
            mode="date"
            is24Hour={true}
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}
      </>
    );
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar style="light" backgroundColor="#0B153C" />

      <View style={[styles.topHeader, Platform.OS === 'ios' && styles.iosHeader]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.topHeaderTitle}>Create Account</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.title}>When were you born?</Text>
        <Text style={styles.subtitle}>Select your birthdate</Text>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Birthdate</Text>
            {renderDatePicker()}
            {age !== null && (
              <Text style={styles.ageText}>Age: {age} years old</Text>
            )}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        </View>

        <TouchableOpacity 
          style={[
            styles.nextButton,
            age !== null && age < 18 && styles.nextButtonDisabled
          ]} 
          onPress={handleNext}
          disabled={age !== null && age < 18}
        >
          <Text style={[
            styles.nextButtonText,
            age !== null && age < 18 && styles.nextButtonTextDisabled
          ]}>Next</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
  inputGroup: {
    marginBottom: 16,
    width: "100%",
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
    padding: Platform.OS === "ios" ? 10 : 12,
    fontSize: 15,
    backgroundColor: "#FFFFFF",
  },
  dateText: {
    fontSize: 15,
    color: "#0F172A",
  },
  inputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  errorText: {
    color: "#EF4444",
    marginTop: 5,
    fontSize: 12,
  },
  ageText: {
    marginTop: 5,
    fontSize: 13,
    color: "#64748B",
  },
  nextButton: {
    backgroundColor: "#0B153C",
    width: "100%",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#0B153C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  nextButtonDisabled: {
    backgroundColor: "#CBD5E1",
    shadowOpacity: 0,
    elevation: 0,
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  nextButtonTextDisabled: {
    color: "#666666",
  },
});
