import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const TermsAndConditions = () => {
  const router = useRouter();

  const handleGoBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleGoBack}
        >
          <Ionicons name="arrow-back-outline" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Terms and Conditions</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.lastUpdated}>Last Updated: March 20, 2024</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.text}>
            By accessing and using the TrabaHanap application, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you may not use our services.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. User Registration</Text>
          <Text style={styles.text}>
            2.1. Users must provide accurate, current, and complete information during registration.{'\n\n'}
            2.2. Users are responsible for maintaining the confidentiality of their account credentials.{'\n\n'}
            2.3. Users must be at least 18 years old to use our services.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Service Rules</Text>
          <Text style={styles.text}>
            3.1. Users agree to use the service for lawful purposes only.{'\n\n'}
            3.2. Job seekers must provide accurate information about their skills and experience.{'\n\n'}
            3.3. Clients must provide clear job descriptions and payment terms.{'\n\n'}
            3.4. Both parties agree to maintain professional conduct in all interactions.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Payment Terms</Text>
          <Text style={styles.text}>
            4.1. All payment arrangements are made directly between clients and service providers.{'\n\n'}
            4.2. TrabaHanap is not responsible for any payment disputes between users.{'\n\n'}
            4.3. Users are responsible for complying with all applicable tax laws.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. User Content</Text>
          <Text style={styles.text}>
            5.1. Users retain ownership of their content but grant TrabaHanap license to use it.{'\n\n'}
            5.2. Users are responsible for ensuring their content doesn't violate any laws or rights.{'\n\n'}
            5.3. TrabaHanap reserves the right to remove inappropriate content.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Termination</Text>
          <Text style={styles.text}>
            TrabaHanap reserves the right to terminate or suspend accounts that violate these terms or for any other reason at our discretion.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 4,
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
    color: '#444',
  },
});

export default TermsAndConditions; 