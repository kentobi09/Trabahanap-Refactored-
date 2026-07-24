import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

export default function WaitingValidation() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/sign_in');
    }, 8000); // 8 seconds

    // Cleanup the timer if component unmounts
    return () => clearTimeout(timer);
  }, []); // Empty dependency array means this runs once on mount

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      <View style={styles.content}>
        <MaterialIcons name="check-circle" size={80} color="#007AFF" style={styles.icon} />
        
        <Text style={styles.title}>Account Under Review</Text>
        
        <Text style={styles.description}>
          Your account is currently being reviewed by our team. This process usually takes 24-48 hours.
          We'll notify you once your account has been validated.
        </Text>
        
        <Text style={styles.subDescription}>
          Thank you for your patience. You can close this app and we'll send you a notification when your account is ready.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#000',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
    lineHeight: 24,
  },
  subDescription: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    lineHeight: 20,
  },
}); 