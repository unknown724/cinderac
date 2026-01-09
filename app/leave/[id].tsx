import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useColorScheme,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
  Animated, // Added
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Colors } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { deleteStudentLeave } from "@/lib/api";

// Helper for status
const getStatusInfo = (status: number) => {
  switch (status) {
    case 3:
      return { label: "Approved", color: "#4CAF50", icon: "checkmark-circle" };
    case 2:
      return { label: "Rejected", color: "#F44336", icon: "close-circle" };
    case 1:
      return { label: "Pending", color: "#FF9800", icon: "time" };
    default:
      return { label: "Unknown", color: "#9E9E9E", icon: "help-circle" };
  }
};

export default function LeaveDetailsPage() {
  const scheme = useColorScheme() ?? "dark";
  const theme = Colors[scheme];
  const { data } = useLocalSearchParams();
  const [deleting, setDeleting] = useState(false);

  // --- Animation Values ---
  const [showSlowWarning, setShowSlowWarning] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current; // For Toast Opacity
  const toastShakeAnim = useRef(new Animated.Value(0)).current; // For Toast Wiggle

  // Parse data passed from the list page
  const leave = data ? JSON.parse(data as string) : null;

  // --- Slow Network Monitor (Toast Animation) ---
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (deleting) {
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
  }, [deleting]);

  // Interpolate Toast Slide Up
  const toastTranslateY = fadeAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [20, 0]
  });

  if (!leave) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.text }}>Leave details not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: theme.tint }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleDelete = async () => {
    Alert.alert(
      "Delete Application",
      "Are you sure you want to delete this leave request? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              const res = await deleteStudentLeave(leave);
              if (res?.flag === 1) {
                // Success: Go back to list
                router.back(); 
              } else {
                Alert.alert("Error", res?.message || "Failed to delete leave.");
              }
            } catch (error) {
              Alert.alert("Error", "Could not delete leave. Please try again.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const statusInfo = getStatusInfo(leave.status);
  const fromDate = new Date(leave.fromDate).toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const endDate = new Date(leave.endDate).toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        
        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text }]}>Leave Details</Text>
        </View>

        {/* Status Card */}
        <View style={[styles.statusCard, { backgroundColor: statusInfo.color + "15", borderColor: statusInfo.color + "30" }]}>
          <Ionicons name={statusInfo.icon as any} size={32} color={statusInfo.color} />
          <View style={{ marginLeft: 12 }}>
            <Text style={[styles.statusLabel, { color: statusInfo.color }]}>{statusInfo.label}</Text>
            <Text style={[styles.statusSub, { color: theme.icon }]}>Application Status</Text>
          </View>
        </View>

        {/* Main Details */}
        <View style={[styles.card, { backgroundColor: scheme === 'dark' ? '#ffffff10' : '#fff', borderColor: scheme === 'dark' ? 'transparent' : '#e0e0e0' }]}>
          
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.icon }]}>Reason</Text>
            <Text style={[styles.value, { color: theme.text }]}>{leave.reason}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.icon }]}>Duration</Text>
            <View>
              <Text style={[styles.value, { color: theme.text }]}>From: {fromDate}</Text>
              <Text style={[styles.value, { color: theme.text, marginTop: 4 }]}>To:      {endDate}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.icon }]}>Description</Text>
            <Text style={[styles.value, { color: theme.text, lineHeight: 22 }]}>
              {leave.description || "No description provided."}
            </Text>
          </View>

        </View>

        {/* Attachment Section */}
        {leave.documentDTO && (
          <View style={{ marginTop: 24 }}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Attachments</Text>
            
            <TouchableOpacity 
              onPress={() => Linking.openURL(leave.documentDTO.documentUrl)}
              style={[styles.fileCard, { borderColor: theme.tint }]}
            >
              <View style={[styles.fileIcon, { backgroundColor: theme.tint + "20" }]}>
                <Ionicons name="document-text" size={24} color={theme.tint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fileName, { color: theme.text }]} numberOfLines={1}>
                  {leave.documentDTO.documentName || "Attached Document"}
                </Text>
                <Text style={[styles.fileAction, { color: theme.tint }]}>Tap to view</Text>
              </View>
              <Ionicons name="open-outline" size={20} color={theme.icon} />
            </TouchableOpacity>
          </View>
        )}

        {/* DELETE ACTION - Only visible if Pending (1) */}
        {leave.status === 1 && (
          <View style={{ marginTop: 30 }}>
            <TouchableOpacity 
              onPress={handleDelete}
              disabled={deleting}
              style={[
                styles.deleteButton, 
                { backgroundColor: scheme === 'dark' ? '#3e1f1f' : '#fff0f0' }
              ]}
            >
              {deleting ? (
                <ActivityIndicator color="#F44336" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={20} color="#F44336" />
                  <Text style={styles.deleteText}>Delete Application</Text>
                </>
              )}
            </TouchableOpacity>
            <Text style={[styles.deleteHint, { color: theme.icon }]}>
              You can only delete pending applications.
            </Text>
          </View>
        )}

      </ScrollView>

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
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  statusLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusSub: {
    fontSize: 12,
    marginTop: 2,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  row: {
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#ffffff20',
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 12,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileName: {
    fontSize: 15,
    fontWeight: '600',
  },
  fileAction: {
    fontSize: 12,
    marginTop: 2,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  deleteText: {
    color: "#F44336",
    fontSize: 16,
    fontWeight: "700",
  },
  deleteHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.6,
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
