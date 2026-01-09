import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Image,
  useColorScheme,
  ActivityIndicator,
  Alert,
  Animated, // Added
} from "react-native";
import { Ionicons } from "@expo/vector-icons"; // Added
import { Colors } from "@/constants/theme";
import { fetchUserDashboard } from "@/lib/api";
import { router } from "expo-router";
import useAuthStore from "@/store/useAuthStore";

export default function ProfileScreen() {
  const scheme = useColorScheme() ?? "light";
  const theme = Colors[scheme];

  const { clearAuth, allowedUser } = useAuthStore.getState();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- Animation Values ---
  const [showSlowWarning, setShowSlowWarning] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current; // For Toast Opacity
  const toastShakeAnim = useRef(new Animated.Value(0)).current; // For Toast Wiggle

  // --- Slow Network Monitor (Toast Animation) ---
  useEffect(() => {
    let timer: NodeJS.Timeout;
    // Monitor both loading and refreshing states
    if (loading || refreshing) {
      timer = setTimeout(() => {
        setShowSlowWarning(true);
        
        // Sequence: Fade In -> Wiggle
        Animated.sequence([
            // 1. Fade in
            Animated.timing(fadeAnim, { 
                toValue: 1, 
                duration: 300, 
                useNativeDriver: true 
            }),
            // 2. Subtle Wiggle to grab attention
            Animated.loop(
                Animated.sequence([
                    Animated.timing(toastShakeAnim, { toValue: -3, duration: 100, useNativeDriver: true }),
                    Animated.timing(toastShakeAnim, { toValue: 3, duration: 100, useNativeDriver: true }),
                    Animated.timing(toastShakeAnim, { toValue: -1, duration: 100, useNativeDriver: true }),
                    Animated.timing(toastShakeAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
                    Animated.timing(toastShakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
                    Animated.delay(2000) // Wait before wiggling again
                ])
            )
        ]).start();
        
      }, 2000);
    } else {
      setShowSlowWarning(false);
      fadeAnim.setValue(0);
      toastShakeAnim.setValue(0);
    }
    return () => clearTimeout(timer);
  }, [loading, refreshing]);

  // Interpolate Toast Slide Up
  const toastTranslateY = fadeAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [20, 0]
  });

  /** ========== LOGOUT ========= */
  const forceLogout = useCallback(() => {
    clearAuth();
    router.replace("/login");
  }, []);

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: forceLogout },
    ]);
  };

  /** ========== FETCH USER ========= */
  const loadUser = async () => {
    try {
      const data = await fetchUserDashboard();
      if (!data) return forceLogout();
      setUser(data);
    } catch {
      forceLogout();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  /** ========== PULL TO REFRESH ========= */
  const onRefresh = async () => {
    setRefreshing(true);
    setUser(null);
    await loadUser();
  };

  /** ========== LOADING UI ========= */
  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
        <Text style={{ color: theme.text, marginTop: 10 }}>Loading profile...</Text>
        
        {/* Toast in Loading View */}
        {showSlowWarning && (
            <Animated.View 
                style={[
                    styles.toast, 
                    { 
                        opacity: fadeAnim,
                        transform: [
                            { translateY: toastTranslateY }, 
                            { translateX: toastShakeAnim }
                        ]
                    }
                ]}
            >
            <View style={styles.toastIconContainer}>
                <Ionicons name="warning" size={24} color="#F59E0B" />
            </View>
            <View style={styles.toastContent}>
                <Text style={styles.toastTitle}>Experiencing Slowness?</Text>
                <Text style={styles.toastMessage}>
                The symphonyx.in server is responding slowly. This is an external fault and the app can't do anything about it.
                </Text>
            </View>
            </Animated.View>
        )}
      </View>
    );
  }
  /** ========== FAILED STATE / REFRESHING STATE ========= */
  if (!user) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
        
        {/* Toast in Refreshing/Empty State */}
        {showSlowWarning && (
            <Animated.View 
                style={[
                    styles.toast, 
                    { 
                        opacity: fadeAnim,
                        transform: [
                            { translateY: toastTranslateY }, 
                            { translateX: toastShakeAnim }
                        ]
                    }
                ]}
            >
            <View style={styles.toastIconContainer}>
                <Ionicons name="warning" size={24} color="#F59E0B" />
            </View>
            <View style={styles.toastContent}>
                <Text style={styles.toastTitle}>Experiencing Slowness?</Text>
                <Text style={styles.toastMessage}>
                The symphonyx.in server is responding slowly. This is an external fault and the app can't do anything about it.
                </Text>
            </View>
            </Animated.View>
        )}
      </View>
    );
  }

  /** ========== MAIN UI ========= */
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background }
      ]}
    >
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.tint}
            colors={[theme.tint]}
          />
        }
        contentContainerStyle={styles.scroll}
      >
        {/* Profile Avatar */}
        <Image
          source={{
            uri: user.photoPath || "https://placehold.co/120x120/png?text=User",
          }}
          style={styles.profileImage}
        />

        {/* Name */}
        <Text style={[styles.name, { color: theme.text }]}>{user.fullName}</Text>
        <Text style={[styles.subText, { color: theme.icon }]}>
          {user.degreeName} — {user.programName}
        </Text>

        {/* Logout Button */}
        <TouchableOpacity
          style={[
            styles.logoutBtn,
            scheme === "light"
              ? { backgroundColor: "#00000006", borderWidth: 1, borderColor: "#d1d1d1" }
              : { backgroundColor: "#ffffff15" }
          ]}
          onPress={handleLogout}
        >
          <Text style={[styles.logoutBtnText, { color: theme.tint }]}>
            Log Out
          </Text>
        </TouchableOpacity>

        {/* Info Fields */}
        <View style={styles.infoContainer}>
          <InfoField label="User ID" value={user.userId} theme={theme} scheme={scheme} />
          <InfoField label="Enrollment" value={user.enrollmentNumber} theme={theme} scheme={scheme} />
          <InfoField label="Email" value={user.emailId} theme={theme} scheme={scheme} />
          <InfoField label="Mobile" value={user.mobile} theme={theme} scheme={scheme} />
          <InfoField label="Year" value={String(user.enrollYear)} theme={theme} scheme={scheme} />
        </View>
      </ScrollView>
    </View>
  );
}

/** ========== INFO BOX COMPONENT ========= */
function InfoField({ label, value, theme, scheme }: any) {
  return (
    <View style={styles.fieldWrapper}>
      <Text style={[styles.label, { color: theme.icon }]}>{label}</Text>

      <View
        style={[
          styles.fieldBox,
          scheme === "light"
            ? {
                backgroundColor: "#fafafa",
                borderWidth: 1,
                borderColor: "#d4d4d4",
              }
            : {
                backgroundColor: "#ffffff12",
              },
        ]}
      >
        <Text style={[styles.fieldValue, { color: theme.text }]}>{value || "-"}</Text>
      </View>
    </View>
  );
}

/** ========== STYLES ========= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scroll: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 50,
    alignItems: "center",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 60,
    marginBottom: 16,
  },

  name: {
    fontSize: 23,
    fontWeight: "700",
    marginBottom: 6,
  },
  subText: {
    fontSize: 15,
    opacity: 0.7,
    marginBottom: 22,
  },

  logoutBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 26,
  },

  logoutBtnText: {
    fontSize: 15,
    fontWeight: "600",
  },

  infoContainer: {
    width: "100%",
    marginTop: 10,
  },

  fieldWrapper: {
    marginBottom: 16,
  },

  label: {
    fontSize: 14,
    marginBottom: 6,
    opacity: 0.75,
  },

  fieldBox: {
    padding: 14,
    borderRadius: 12,
  },

  fieldValue: {
    fontSize: 16,
    fontWeight: "500",
  },

  retryBox: {
    marginTop: 25,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: "#ffffff20",
  },
  retryText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },

  // Toast Styles
  toast: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: '#334155', // Slate-700
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
    zIndex: 1000,
  },
  toastIconContainer: {
    marginRight: 12,
  },
  toastContent: {
    flex: 1,
  },
  toastTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 2,
  },
  toastMessage: {
    color: '#cbd5e1', // Slate-300
    fontSize: 12,
    lineHeight: 16,
  },
});
