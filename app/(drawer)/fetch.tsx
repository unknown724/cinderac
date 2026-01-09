import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  useColorScheme,
  Animated, // Added
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Colors } from "@/constants/theme";
import { fetchLeave } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons"; 

// Helper to format dates (YYYY-MM-DD -> DD Mon)
const formatDate = (dateString: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
};

// Updated Status Logic
const getStatusInfo = (status: number) => {
  switch (status) {
    case 3:
      return { label: "Approved", color: "#4CAF50" }; // Green
    case 2:
      return { label: "Rejected", color: "#F44336" }; // Red
    case 1:
      return { label: "Pending", color: "#FF9800" }; // Orange
    default:
      return { label: "Unknown", color: "#9E9E9E" }; // Grey
  }
};

export default function LeavePage() {
  const scheme = useColorScheme() ?? "dark";
  const theme = Colors[scheme];

  const [leaves, setLeaves] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

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

  const loadLeaves = async () => {
    try {
      const res = await fetchLeave();
      const list = res?.data?.data?.studentLeaveApplicationDTOList ?? [];
      setLeaves(list);
    } catch (err) {
      console.error("Leave fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadLeaves();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLeaves();
    setRefreshing(false);
  }, []);

  const filtered = leaves.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.reason?.toLowerCase().includes(q) ||
      l.description?.toLowerCase().includes(q) ||
      l.status?.toString().includes(q)
    );
  });

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* SEARCH BAR */}
      <View
        style={[
          styles.searchBox,
          scheme === "dark"
            ? { backgroundColor: "#ffffff15" }
            : { backgroundColor: "#f5f5f5", borderWidth: 1, borderColor: "#d4d4d4" },
        ]}
      >
        <TextInput
          placeholder="Search leaves..."
          placeholderTextColor={theme.icon}
          value={search}
          onChangeText={setSearch}
          style={{ color: theme.text, fontSize: 15 }}
        />
      </View>

      {/* LIST */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.srNo?.toString() || Math.random().toString()}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.tint}
            colors={[theme.tint]}
          />
        }
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListEmptyComponent={
          !loading && (
            <Text style={{ color: theme.icon, textAlign: "center", marginTop: 20 }}>
              No leave history found.
            </Text>
          )
        }
        renderItem={({ item }) => {
          const statusInfo = getStatusInfo(item.status);
          const dateRange = `${formatDate(item.fromDate)} - ${formatDate(item.endDate)}`;

          return (
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => 
                router.push({
                  pathname: "/leave/[id]",
                  params: { data: JSON.stringify(item) }
                })
              }
            >
              <View
                style={[
                  styles.card,
                  scheme === "dark"
                    ? { backgroundColor: "#ffffff12" }
                    : { backgroundColor: "#fafafa", borderWidth: 1, borderColor: "#d4d4d4" },
                ]}
              >
                {/* Date Badge */}
                <View style={[styles.dateBadge, { backgroundColor: theme.tint + "20" }]}>
                  <Text style={[styles.dateText, { color: theme.tint }]}>
                    {new Date(item.fromDate).getDate()}
                  </Text>
                  <Text style={[styles.monthText, { color: theme.tint }]}>
                    {new Date(item.fromDate).toLocaleString('default', { month: 'short' }).toUpperCase()}
                  </Text>
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: 'center' }}>
                    <Text style={[styles.name, { color: theme.text, flex: 1 }]}>
                      {item.reason || "No Reason"}
                    </Text>
                    
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + "20" }]}>
                      <Text style={[styles.statusText, { color: statusInfo.color }]}>
                        {statusInfo.label}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.sub, { color: theme.icon, marginTop: 4 }]}>
                    {dateRange}
                  </Text>

                  {item.description ? (
                    <Text 
                      numberOfLines={2} 
                      style={[styles.description, { color: theme.icon }]}
                    >
                      {item.description}
                    </Text>
                  ) : null}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* NEW: Prominent Apply Button at Bottom */}
      <View style={[styles.bottomContainer, { backgroundColor: theme.background, borderTopColor: scheme === 'dark' ? '#333' : '#e0e0e0' }]}>
        <TouchableOpacity
          onPress={() => router.push("/leave/apply")}
          style={[styles.applyButton, { backgroundColor: theme.tint }]}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={24} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.applyButtonText}>Apply New Leave</Text>
        </TouchableOpacity>
      </View>

      {/* Slow Network Warning Toast with Animation */}
      {showSlowWarning && (
        <Animated.View 
            style={[
                styles.toast, 
                { 
                    opacity: fadeAnim,
                    transform: [
                        { translateY: toastTranslateY }, // Slide Up
                        { translateX: toastShakeAnim }   // Wiggle
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

const styles = StyleSheet.create({
  searchBox: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15,
    marginHorizontal: 16,
    marginTop: 16,
  },
  card: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    alignItems: "center",
  },
  dateBadge: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  dateText: {
    fontSize: 20,
    fontWeight: "700",
  },
  monthText: {
    fontSize: 11,
    fontWeight: "600",
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
  },
  sub: {
    fontSize: 13,
    fontWeight: "600",
  },
  description: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  bottomContainer: {
    padding: 16,
    paddingBottom: 30, 
    borderTopWidth: 1,
  },
  applyButton: {
    flexDirection: "row",
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  applyButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  // Toast Styles
  toast: {
    position: 'absolute',
    bottom: 110, // Positioned above the Apply button footer
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
