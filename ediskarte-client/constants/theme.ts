import { StyleSheet, Dimensions } from "react-native";

export const theme = {
  colors: {
    // Primary Brand Colors (from eDiskarte Logo)
    primary: "#0B153C", // Deep Logo Navy
    primaryDark: "#050E2D", // Dark Midnight Navy
    primaryLight: "#1E2A5E", // Soft Navy Surface

    // Logo Accent Colors (from Worker Hard-Hat Icon)
    accent: "#F59E0B", // Logo Amber Gold
    accentDark: "#D97706", // Deep Amber
    accentLight: "#FEF3C7", // Soft Gold Tint

    // Complementary Brand Accents
    secondary: "#2563EB", // Sapphire Electric Blue
    secondaryLight: "#DBEAFE", // Soft Blue Tint
    
    // Status & Utility Colors
    success: "#10B981", // Emerald Verified Green
    successLight: "#D1FAE5", // Soft Green Tint
    danger: "#EF4444", // Crimson Red
    dangerLight: "#FEE2E2", // Soft Red Tint
    
    // Neutrals & Surfaces
    dark: "#0F172A", // Dark Slate Charcoal
    textPrimary: "#0F172A", // Primary Body Text
    textSecondary: "#475569", // Subtitle Text
    textMuted: "#94A3B8", // Muted Hints & Timestamps
    
    border: "#E2E8F0", // Soft Card Borders
    background: "#F8FAFC", // Off-white Screen Background
    surface: "#FFFFFF", // Pure White Container Card
    surfaceHover: "#F1F5F9",
  },
  
  shadows: {
    sm: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: "#0F172A",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: "#0B153C",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 8,
    },
  },
  
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
};

export default theme;
