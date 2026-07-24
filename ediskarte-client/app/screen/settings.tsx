import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Switch,
  ScrollView,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons, MaterialIcons, AntDesign, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SettingsScreen = () => {
  const router = useRouter();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const handleGoBack = () => {
    router.back();
  };

  const handlePrivacyPolicy = () => {
    // Navigate to privacy policy screen
    router.push('/screen/privacy-policy');
  };

  const handleTermsConditions = () => {
    // Navigate to terms and conditions screen
    router.push('/screen/terms-conditions');
  };

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const handleConfirmLogout = async () => {
    // Add token destruction logic here
    // For example:
    await AsyncStorage.removeItem('token');
    router.replace('/(auth)/sign_in');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={handleGoBack}
      >
        <Ionicons name="arrow-back-outline" size={24} color="#333" />
      </TouchableOpacity>

      <Text style={styles.title}>Settings</Text>

      {/* Legal Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Legal</Text>
        
        <TouchableOpacity style={styles.settingItem} onPress={handlePrivacyPolicy}>
          <View style={styles.settingLeft}>
            <MaterialIcons name="privacy-tip" size={24} color="#0B153C" />
            <Text style={styles.settingText}>Privacy Policy</Text>
          </View>
          <AntDesign name="right" size={20} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem} onPress={handleTermsConditions}>
          <View style={styles.settingLeft}>
            <Feather name="file-text" size={24} color="#0B153C" />
            <Text style={styles.settingText}>Terms & Conditions</Text>
          </View>
          <AntDesign name="right" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        
        <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
          <View style={styles.settingLeft}>
            <MaterialIcons name="logout" size={24} color="#FF3B30" />
            <Text style={[styles.settingText, { color: '#FF3B30' }]}>Logout</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Add this Modal component */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={logoutModalVisible}
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.warningIconContainer}>
              <MaterialIcons name="logout" size={60} color="#FF3B30" />
            </View>
            <Text style={styles.modalTitle}>Logout</Text>
            <Text style={styles.modalText}>
              Are you sure you want to logout?
            </Text>
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleConfirmLogout}
              >
                <Text style={styles.confirmButtonText}>Yes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  backButton: {
    marginBottom: 16,
    padding: 4,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 340,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#EEEEEE',
    marginRight: 8,
  },
  confirmButton: {
    backgroundColor: '#FF3B30',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  warningIconContainer: {
    marginBottom: 16,
  },
});

export default SettingsScreen; 