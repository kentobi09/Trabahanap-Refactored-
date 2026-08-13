import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function ClientLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
          elevation: 10,
          shadowColor: "#0B153C",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          borderTopWidth: 1,
          borderTopColor: "#E2E8F0",
        },
        tabBarActiveTintColor: "#0B153C",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="client-home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="client-message"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="chatbubble-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="client-community"
        options={{
          title: "Community",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="newspaper-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
