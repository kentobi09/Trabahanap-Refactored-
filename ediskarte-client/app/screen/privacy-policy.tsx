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

const PrivacyPolicy = () => {
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
        <Text style={styles.title}>Privacy Policy</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.lastUpdated}>Last Updated: March 20, 2024</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Information We Collect</Text>
          <Text style={styles.text}>
            1.1. Personal Information:{'\n'}
            • Name and contact information{'\n'}
            • Profile pictures{'\n'}
            • Location data{'\n'}
            • Skills and work experience{'\n\n'}
            1.2. Usage Information:{'\n'}
            • App interaction data{'\n'}
            • Device information{'\n'}
            • Log data
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
          <Text style={styles.text}>
            • To provide and improve our services{'\n'}
            • To match job seekers with potential clients{'\n'}
            • To communicate with you about our services{'\n'}
            • To ensure platform safety and security{'\n'}
            • To comply with legal obligations
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Information Sharing</Text>
          <Text style={styles.text}>
            We may share your information with:{'\n\n'}
            • Other users as necessary for service delivery{'\n'}
            • Service providers who assist our operations{'\n'}
            • Law enforcement when required by law{'\n\n'}
            We do not sell your personal information to third parties.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Data Security</Text>
          <Text style={styles.text}>
            We implement appropriate security measures to protect your personal information from unauthorized access, alteration, disclosure, or destruction.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Your Rights</Text>
          <Text style={styles.text}>
            You have the right to:{'\n\n'}
            • Access your personal information{'\n'}
            • Correct inaccurate data{'\n'}
            • Request deletion of your data{'\n'}
            • Opt-out of marketing communications{'\n'}
            • Export your data
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Contact Us</Text>
          <Text style={styles.text}>
            If you have any questions about this Privacy Policy, please contact us at:{'\n\n'}
            Email: privacy@trabahanap.com{'\n'}
            Address: trabahanap@gmail.com
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

export default PrivacyPolicy; 