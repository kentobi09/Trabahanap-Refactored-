import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [emailError, setEmailError] = useState('');
  const router = useRouter();

  const handleGoBack = () => {
    router.back();
  };

  const isValidEmail = (email: string) => {
    // RFC 5322 compliant email regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!email.trim()) {
      setEmailError('Email is required');
      return false;
    }
    
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    
    setEmailError('');
    return true;
  };

  const handleSubmit = () => {
    if (isValidEmail(email.trim())) {
      setModalVisible(true);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />

      {/* Back Button */}
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={handleGoBack}
      >
        <Ionicons name="arrow-back-outline" size={24} color="#333" />
      </TouchableOpacity>

      <View style={styles.formContainer}>
        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.subtitle}>
          Enter your Gmail address and we'll send you instructions to reset your password.
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, emailError ? styles.inputError : null]}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setEmailError('');
            }}
            placeholder="Enter your Gmail"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View style={[styles.inputLine, emailError ? styles.inputLineError : null]} />
          {emailError ? (
            <Text style={styles.errorText}>{emailError}</Text>
          ) : null}
        </View>

        <TouchableOpacity 
          style={[
            styles.submitButton,
            !email.trim() && styles.submitButtonDisabled
          ]} 
          onPress={handleSubmit}
          disabled={!email.trim()}
        >
          <Text style={styles.submitButtonText}>Submit</Text>
        </TouchableOpacity>
      </View>

      {/* Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          router.back();
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Ionicons name="mail-outline" size={50} color="#0A1747" />
            </View>
            <Text style={styles.modalTitle}>Check Your Email</Text>
            <Text style={styles.modalText}>
              We have sent password recovery instructions to your email.
            </Text>
            <TouchableOpacity 
              style={styles.modalButton}
              onPress={() => {
                setModalVisible(false);
                router.back();
              }}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  backButton: {
    marginLeft: 16,
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
  formContainer: {
    flex: 1,
    paddingHorizontal: 40,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#0A1747',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
    lineHeight: 24,
  },
  inputContainer: {
    marginBottom: 30,
  },
  input: {
    paddingVertical: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
  },
  inputError: {
    borderColor: '#ff3b30',
  },
  inputLine: {
    height: 2,
    backgroundColor: '#0A1747',
    width: '100%',
    marginTop: 5,
  },
  inputLineError: {
    backgroundColor: '#ff3b30',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 14,
    marginTop: 8,
    marginLeft: 4,
  },
  submitButton: {
    backgroundColor: '#0A1747',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '85%',
  },
  modalIcon: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#0A1747',
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
    lineHeight: 24,
  },
  modalButton: {
    backgroundColor: '#0A1747',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 10,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
}); 