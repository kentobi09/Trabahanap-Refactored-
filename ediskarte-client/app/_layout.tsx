import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useColorScheme, ActivityIndicator, View, StyleSheet, Animated, TouchableOpacity, Text } from "react-native";
import { registerLoadingListener } from "./constants/navigation";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import io, { Socket } from "socket.io-client";

const client = new QueryClient();
// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const AnimatedNotificationBanner = ({ notification, onClose }: { notification: any; onClose: () => void }) => {
  const slideAnim = useState(new Animated.Value(-150))[0];

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 20,
      useNativeDriver: true,
      tension: 10,
      friction: 4,
    }).start();

    const timer = setTimeout(() => {
      handleClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [notification]);

  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: -150,
      duration: 300,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  return (
    <Animated.View
      style={[
        styles.bannerContainer,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity 
        style={styles.bannerContent} 
        onPress={handleClose}
        activeOpacity={0.9}
      >
        <View style={styles.bannerIconContainer}>
          <Ionicons name="notifications" size={24} color="#FFF" />
        </View>
        <View style={styles.bannerTextContainer}>
          <Text style={styles.bannerTitle} numberOfLines={1}>
            {notification.notificationTitle || "Notification"}
          </Text>
          <Text style={styles.bannerMessage} numberOfLines={2}>
            {notification.notificationMessage || ""}
          </Text>
        </View>
        <TouchableOpacity onPress={handleClose} style={styles.bannerCloseButton}>
          <Ionicons name="close" size={20} color="#666" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const [loading, setLoading] = useState(false);
  const [notificationBanner, setNotificationBanner] = useState<any>(null);

  useEffect(() => {
    registerLoadingListener((visible) => {
      setLoading(visible);
    });
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    let socket: Socket | null = null;
    let checkInterval: any = null;

    const setupSocket = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const userId = await AsyncStorage.getItem("currentUserId");

        if (token && userId) {
          if (!socket) {
            const activeSocket = io(`http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000`, {
              auth: { token },
              transports: ["websocket"]
            });
            socket = activeSocket;

            activeSocket.on("connect", () => {
              activeSocket.emit("register_user", userId);
            });

            activeSocket.on("new_notification", (data: any) => {
              setNotificationBanner(data);
            });
          }
        } else {
          if (socket) {
            socket.disconnect();
            socket = null;
          }
        }
      } catch (error) {
        console.error("Error setting up root layout socket:", error);
      }
    };

    setupSocket();
    checkInterval = setInterval(setupSocket, 3000);

    return () => {
      if (socket) socket.disconnect();
      if (checkInterval) clearInterval(checkInterval);
    };
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={client}>
        <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(main)/(tabs)" />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="auto" />
          {loading && (
            <View style={styles.loadingOverlay}>
              <View style={styles.spinnerContainer}>
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
            </View>
          )}
          {notificationBanner && (
            <AnimatedNotificationBanner 
              notification={notificationBanner}
              onClose={() => setNotificationBanner(null)}
            />
          )}
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(11, 21, 60, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  spinnerContainer: {
    backgroundColor: "#0B153C",
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
  },
  bannerContainer: {
    position: "absolute",
    top: 30,
    left: 16,
    right: 16,
    zIndex: 99999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  bannerContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  bannerIconContainer: {
    backgroundColor: "#0B153C",
    padding: 8,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  bannerTextContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  bannerMessage: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },
  bannerCloseButton: {
    padding: 4,
  },
});
