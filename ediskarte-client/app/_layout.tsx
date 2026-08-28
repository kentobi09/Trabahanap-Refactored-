import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useColorScheme, ActivityIndicator, View, StyleSheet, Animated, TouchableOpacity, Text, Modal, Image, SafeAreaView } from "react-native";
import { registerLoadingListener } from "./constants/navigation";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { connectSocket, getSocket } from "./services/socket";

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
  const router = useRouter();
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const [loading, setLoading] = useState(false);
  const [notificationBanner, setNotificationBanner] = useState<any>(null);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [ringtoneSound, setRingtoneSound] = useState<Audio.Sound | null>(null);

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

  const playRingtone = async () => {
    try {
      if (ringtoneSound) {
        await ringtoneSound.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        require("../assets/sounds/ringtone.mp3"),
        { shouldPlay: true, isLooping: true }
      );
      setRingtoneSound(sound);
    } catch (error) {
      console.warn("Failed to play ringtone:", error);
    }
  };

  const stopRingtone = async () => {
    try {
      if (ringtoneSound) {
        await ringtoneSound.stopAsync();
        await ringtoneSound.unloadAsync();
        setRingtoneSound(null);
      }
    } catch (error) {
      console.warn("Failed to stop ringtone:", error);
    }
  };

  useEffect(() => {
    let checkInterval: any = null;

    const setupSocket = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const userId = await AsyncStorage.getItem("currentUserId");

        if (token && userId) {
          const socket = await connectSocket();

          socket.off("new_notification");
          socket.on("new_notification", (data: any) => {
            setNotificationBanner(data);
          });

          socket.off("incoming_call");
          socket.on("incoming_call", ({ chatId, callerId, callerInfo, callType }: any) => {
            console.log("Global incoming call received:", callerInfo);
            setIncomingCall({ chatId, callerId, callerInfo, callType });
            playRingtone();
          });

          socket.off("call_ended");
          socket.on("call_ended", () => {
            setIncomingCall(null);
            stopRingtone();
          });
        }
      } catch (error) {
        console.error("Error setting up root layout socket:", error);
      }
    };

    setupSocket();
    checkInterval = setInterval(setupSocket, 3000);

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [ringtoneSound]);

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

          {/* Incoming Call Modal Overlay */}
          <Modal
            visible={!!incomingCall}
            transparent={true}
            animationType="fade"
            onRequestClose={() => {}}
          >
            {incomingCall && (
              <View style={styles.callOverlayContainer}>
                <Image
                  source={{
                    uri: incomingCall.callerInfo?.profileImage
                      ? `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/${incomingCall.callerInfo.profileImage.replace(/\\/g, "/")}`
                      : "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"
                  }}
                  style={styles.callOverlayBackground}
                  blurRadius={30}
                />
                <View style={styles.callOverlayDarken} />

                <SafeAreaView style={styles.callOverlayContent}>
                  <View style={styles.callOverlayInfo}>
                    <Image
                      source={{
                        uri: incomingCall.callerInfo?.profileImage
                          ? `http://${process.env.EXPO_PUBLIC_IP_ADDRESS}:3000/${incomingCall.callerInfo.profileImage.replace(/\\/g, "/")}`
                          : "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y"
                      }}
                      style={styles.callOverlayAvatar}
                    />
                    <Text style={styles.callOverlayName}>
                      {incomingCall.callerInfo?.firstName} {incomingCall.callerInfo?.lastName}
                    </Text>
                    <Text style={styles.callOverlaySubtext}>
                      Incoming {incomingCall.callType === 'video' ? 'Video' : 'Voice'} Call...
                    </Text>
                  </View>

                  <View style={styles.callOverlayButtons}>
                    <TouchableOpacity
                      style={[styles.callOverlayBtn, styles.callOverlayBtnDecline]}
                      onPress={async () => {
                        const socket = getSocket();
                        socket.emit("reject_call", {
                          chatId: incomingCall.chatId,
                          callerId: incomingCall.callerId,
                          calleeId: await AsyncStorage.getItem("currentUserId")
                        });
                        setIncomingCall(null);
                        await stopRingtone();
                      }}
                    >
                      <Ionicons name="call" size={28} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.callOverlayBtn, styles.callOverlayBtnAnswer]}
                      onPress={async () => {
                        const socket = getSocket();
                        const myUserId = await AsyncStorage.getItem("currentUserId");
                        
                        socket.emit("accept_call", {
                          chatId: incomingCall.chatId,
                          callerId: incomingCall.callerId,
                          calleeId: myUserId,
                          callType: incomingCall.callType
                        });
                        
                        setIncomingCall(null);
                        await stopRingtone();

                        router.push({
                          pathname: "/screen/job-seeker-screen/agora-call-room",
                          params: {
                            callType: incomingCall.callType,
                            receiverName: `${incomingCall.callerInfo?.firstName} ${incomingCall.callerInfo?.lastName}`,
                            receiverImage: incomingCall.callerInfo?.profileImage || "",
                            chatId: incomingCall.chatId,
                            isCaller: "false",
                            callerId: incomingCall.callerId,
                            calleeId: myUserId || ""
                          }
                        });
                      }}
                    >
                      <Ionicons name="call" size={28} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </SafeAreaView>
              </View>
            )}
          </Modal>
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
  callOverlayContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  callOverlayBackground: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    opacity: 0.45,
  },
  callOverlayDarken: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(11, 21, 60, 0.4)",
  },
  callOverlayContent: {
    flex: 1,
    width: "100%",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 50,
  },
  callOverlayInfo: {
    alignItems: "center",
    marginTop: 80,
  },
  callOverlayAvatar: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  callOverlayName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
  },
  callOverlaySubtext: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
  },
  callOverlayButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "80%",
    marginBottom: 40,
  },
  callOverlayBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  callOverlayBtnDecline: {
    backgroundColor: "#FF3B30",
  },
  callOverlayBtnAnswer: {
    backgroundColor: "#34C759",
  },
});
























