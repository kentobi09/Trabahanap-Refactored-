import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

// Define TypeScript interfaces
interface OnboardingItem {
  title: string;
  subtitle: string;
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
}

interface AnimatedTitleProps {
  text: string;
}

const OnboardingScreen: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<number>(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  
  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
      if (hasSeenOnboarding === 'true') {
        router.replace('/(auth)/option');
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

  const markOnboardingAsComplete = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
  };

  useEffect(() => {
    // Reset animations
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    scaleAnim.setValue(0.8);
    
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentPage]);

  const onboardingData: OnboardingItem[] = [
    {
      title: "Urgent Utility Services",
      subtitle: "Connect with employers needing immediate utility workers and professionals seeking utility jobs",
      iconName: "flash",
      iconColor: "#FFA500"
    },
    {
      title: "Instant Job Matching",
      subtitle: "Find qualified utility workers or get matched with jobs that fit your skills right away",
      iconName: "wrench",
      iconColor: "#FFA500"
    },
    {
      title: "Solve Utility Problems",
      subtitle: "Help businesses and homeowners resolve utility issues with skilled professionals ready to work",
      iconName: "tools",
      iconColor: "#FFA500"
    },
  ];

  const goToNextPage = async (): Promise<void> => {
    if (currentPage < onboardingData.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      await markOnboardingAsComplete();
      router.replace('/(auth)/option');
    }
  };

  const skipOnboarding = async (): Promise<void> => {
    await markOnboardingAsComplete();
    router.replace('/(auth)/option');
  };

  const renderDots = (): JSX.Element => {
    return (
      <View style={styles.dotsContainer}>
        {onboardingData.map((_, index: number) => (
          <View
            key={index}
            style={[
              styles.dot,
              { backgroundColor: index === currentPage ? '#FFA500' : '#D1D5DB' }
            ]}
          />
        ))}
      </View>
    );
  };

  const AnimatedTitle: React.FC<AnimatedTitleProps> = ({ text }) => {
    interface LetterAnimation {
      letterOpacity: Animated.Value;
      letterY: Animated.Value;
    }

    const letterAnimations: LetterAnimation[] = text.split('').map((_, i: number) => {
      const delay = i * 60;
      const letterOpacity = useRef(new Animated.Value(0)).current;
      const letterY = useRef(new Animated.Value(20)).current;

      useEffect(() => {
        Animated.parallel([
          Animated.timing(letterOpacity, {
            toValue: 1,
            duration: 400,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(letterY, {
            toValue: 0,
            duration: 400,
            delay,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      }, [currentPage]);

      return { letterOpacity, letterY };
    });

    return (
      <View style={styles.animatedTitleContainer}>
        {text.split('').map((letter: string, i: number) => (
          <Animated.Text
            key={i}
            style={[
              styles.titleText,
              {
                opacity: letterAnimations[i].letterOpacity,
                transform: [{ translateY: letterAnimations[i].letterY }],
              },
            ]}
          >
            {letter}
          </Animated.Text>
        ))}
      </View>
    );
  };

  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        })
      ])
    ).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B153C" />
      
      <TouchableOpacity style={styles.skipButton} onPress={skipOnboarding}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <View style={styles.contentContainer}>
        <Animated.View
          style={[
            styles.iconContainer,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { scale: pulseAnim }
              ],
            },
          ]}
        >
          <MaterialCommunityIcons 
            name={onboardingData[currentPage].iconName} 
            size={120} 
            color={onboardingData[currentPage].iconColor} 
          />
        </Animated.View>

        <View style={styles.textContainer}>
          <AnimatedTitle text={onboardingData[currentPage].title} />
          
          <Animated.Text
            style={[
              styles.subtitleText,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {onboardingData[currentPage].subtitle}
          </Animated.Text>
        </View>

        {renderDots()}

        <TouchableOpacity style={styles.button} onPress={goToNextPage}>
          <View style={styles.solidButton}>
            <Text style={styles.buttonText}>
              {currentPage === onboardingData.length - 1 ? 'Get Started' : 'Next'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  skipText: {
    fontSize: 16,
    color: '#0B153C',
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  iconContainer: {
    height: height * 0.3,
    width: height * 0.3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    backgroundColor: 'rgba(11, 21, 60, 0.1)',
    borderRadius: height * 0.15,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  animatedTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  titleText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0B153C',
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    lineHeight: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 6,
  },
  button: {
    width: width * 0.8,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#0B153C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  solidButton: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0B153C',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default OnboardingScreen;