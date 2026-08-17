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
import { safePush, safeReplace, safeBack } from '../constants/navigation';

const SettingsScreen = () => {
  const router = useRouter();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const handleGoBack = () => {
    safeBack();
  };

  const handlePrivacyPolicy = () => {
    // Navigate to privacy policy screen
    safePush('/screen/privacy-policy');
  };

  const handleTermsConditions = () => {
    // Navigate to terms and conditions screen
    safePush('/screen/terms-conditions');
  };

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const handleConfirmLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['token', 'currentUserId', 'userType', 'verificationStatus']);
    } catch (e) {
      await AsyncStorage.clear();
    }
    router.replace('/(auth)/option');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, Platform.OS === 'ios' && styles.iosHeader]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleGoBack}
        >
          <Ionicons name="arrow-back-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.contentScroll} contentContainerStyle={{ padding: 16 }}>
        {/* Legal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal & Information</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={handlePrivacyPolicy}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#DBEAFE' }]}>
                <MaterialIcons name="privacy-tip" size={20} color="#2563EB" />
              </View>
              <Text style={styles.settingText}>Privacy Policy</Text>
            </View>
            <AntDesign name="right" size={16} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleTermsConditions}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Feather name="file-text" size={20} color="#D97706" />
              </View>
              <Text style={styles.settingText}>Terms & Conditions</Text>
            </View>
            <AntDesign name="right" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Actions</Text>
          
          <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
                <MaterialIcons name="logout" size={20} color="#EF4444" />
              </View>
              <Text style={[styles.settingText, { color: '#EF4444', fontWeight: '600' }]}>Logout</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Modal component */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={logoutModalVisible}
          onRequestClose={() => setLogoutModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.warningIconContainer}>
                <Ionicons name="log-out-outline" size={40} color="#EF4444" />
              </View>
              <Text style={styles.modalTitle}>Confirm Logout</Text>
              <Text style={styles.modalText}>
                Are you sure you want to log out of your account?
              </Text>
              <View style={styles.modalButtonsContainer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setLogoutModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.logoutConfirmButton}
                  onPress={handleConfirmLogout}
                >
                  <Text style={styles.logoutConfirmButtonText}>Logout</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#0B153C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: Platform.OS === 'android' ? 44 : 10,
  },
  iosHeader: {
    paddingTop: Platform.OS === 'ios' ? 10 : 10,
  },
  backButton: {
    padding: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  contentScroll: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0B153C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 15,
    marginLeft: 12,
    color: '#0F172A',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 21, 60, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 340,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#0B153C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  warningIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '600',
  },
  logoutConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  logoutConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default SettingsScreen;