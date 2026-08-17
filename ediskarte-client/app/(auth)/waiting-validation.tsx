import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform, BackHandler } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';

export default function WaitingValidation() {
  const router = useRouter();

  useEffect(() => {
    // Intercept and disable Android hardware back button
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);

    const timer = setTimeout(() => {
      router.replace('/(auth)/sign_in');
    }, 8000); // 8 seconds

    return () => {
      backHandler.remove();
      clearTimeout(timer);
    };
  }, []);

  return (
    <View style={styles.mainContainer}>
      <StatusBar style="light" backgroundColor="#0B153C" />
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />

      <View style={[styles.topHeader, Platform.OS === 'ios' && styles.iosHeader]}>
        <View style={{ width: 32 }} />
        <Text style={styles.topHeaderTitle}>Verification Pending</Text>
        <View style={{ width: 32 }} />
      </View>
      
      <View style={styles.content}>
        <MaterialIcons name="verified-user" size={80} color="#D97706" style={styles.icon} />
        
        <Text style={styles.title}>Account Under Review</Text>
        
        <Text style={styles.description}>
          Your account is currently being reviewed by our admin team. This process usually takes 24-48 hours.
          We'll notify you once your account has been validated.
        </Text>
        
        <Text style={styles.subDescription}>
          Thank you for your patience. You will be redirected to the sign in page shortly.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#0F172A',
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
    color: '#334155',
    lineHeight: 22,
  },
  subDescription: {
    fontSize: 13,
    textAlign: 'center',
    color: '#64748B',
    lineHeight: 18,
  },
}); 