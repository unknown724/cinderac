import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
// Platform-specific DocumentPicker
import * as DocumentPickerWeb from "@/lib/documentPicker.web";
import * as DocumentPickerNative from "expo-document-picker";
const DocumentPicker = Platform.OS === 'web' ? DocumentPickerWeb : DocumentPickerNative;

import { Colors } from "@/constants/theme";
import { applyStudentLeave, uploadFileToTemp } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function ApplyLeavePage() {
  const scheme = useColorScheme() ?? "dark";
  const theme = Colors[scheme];

  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);

  // Date State
  const [fromDate, setFromDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // --- Animation Values ---
  const [showSlowWarning, setShowSlowWarning] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current; // For Toast Opacity
  const toastShakeAnim = useRef(new Animated.Value(0)).current; // For Toast Wiggle

  // --- Slow Network Monitor (Toast Animation) ---
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading) {
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
  }, [loading]);

  // Interpolate Toast Slide Up
  const toastTranslateY = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0]
  });

  // 1. Handle File Selection
  const pickDocument = async () => {
    try {
      const result: any = await DocumentPicker.getDocumentAsync({
        type: Platform.OS === 'web' ? ['*/*'] : "*/*" as any,
        copyToCacheDirectory: true,
      });

      // Handle both web (direct result) and native (assets array) formats
      if (Platform.OS === 'web') {
        if (result.type === 'success') {
          setSelectedFile(result);
        }
      } else if (result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
      }
    } catch (err) {
      console.log("Document picker error:", err);
    }
  };

  // 2. Handle Submit
  const handleSubmit = async () => {
    if (!reason || !description) {
      Alert.alert("Missing Fields", "Please enter a reason and description.");
      return;
    }

    setLoading(true);

    try {
      let documentDTO = null;

      // Step A: Upload File (if selected)
      if (selectedFile) {
        const uploadRes = await uploadFileToTemp(selectedFile);

        if (uploadRes?.data?.tempImageName) {
          documentDTO = {
            documentName: uploadRes.data.tempImageName,
            documentUrl: selectedFile.name, // The backend seems to use the original name here or just a placeholder
            documentOpr: 1, // Add Operation
          };
        } else {
          throw new Error("File upload failed to return a temp name.");
        }
      }

      // Step B: Apply Leave
      const leavePayload = {
        reason,
        description,
        fromDate: fromDate.toISOString(),
        endDate: endDate.toISOString(),
        documentDTO,
      };

      const res = await applyStudentLeave(leavePayload);

      if (res?.flag === 1) {
        Alert.alert("Success", "Leave application submitted successfully!", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert("Error", res?.message || "Failed to submit leave.");
      }
    } catch (err) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const DateButton = ({ label, date, onPress }: any) => (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.dateBtn,
        scheme === "dark"
          ? { backgroundColor: "#ffffff12" }
          : { backgroundColor: "#f5f5f5", borderWidth: 1, borderColor: "#e0e0e0" },
      ]}
    >
      <Text style={{ color: theme.icon, fontSize: 12, marginBottom: 4 }}>{label}</Text>
      <Text style={{ color: theme.text, fontSize: 16, fontWeight: "600" }}>
        {date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>

        {/* Header */}
        <Text style={[styles.header, { color: theme.text }]}>New Leave Request</Text>

        {/* Reason Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.icon }]}>Reason</Text>
          <TextInput
            placeholder="e.g. Health Issue, Family Function"
            placeholderTextColor={theme.icon}
            value={reason}
            onChangeText={setReason}
            style={[
              styles.input,
              { color: theme.text, backgroundColor: scheme === "dark" ? "#ffffff12" : "#f5f5f5" },
            ]}
          />
        </View>

        {/* Dates */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
          <View style={{ flex: 1 }}>
            <DateButton label="From Date" date={fromDate} onPress={() => setShowFromPicker(true)} />
          </View>
          <View style={{ flex: 1 }}>
            <DateButton label="End Date" date={endDate} onPress={() => setShowEndPicker(true)} />
          </View>
        </View>

        {/* Date Pickers (Hidden by default) */}
        {showFromPicker && (
          <DateTimePicker
            value={fromDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, date) => {
              setShowFromPicker(false);
              if (date) setFromDate(date);
            }}
          />
        )}
        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, date) => {
              setShowEndPicker(false);
              if (date) setEndDate(date);
            }}
          />
        )}

        {/* Description Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.icon }]}>Description</Text>
          <TextInput
            placeholder="Detailed explanation..."
            placeholderTextColor={theme.icon}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            style={[
              styles.input,
              {
                color: theme.text,
                backgroundColor: scheme === "dark" ? "#ffffff12" : "#f5f5f5",
                height: 100,
                textAlignVertical: 'top'
              },
            ]}
          />
        </View>

        {/* File Upload */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: theme.icon }]}>Attachment (Optional)</Text>
          <TouchableOpacity
            onPress={pickDocument}
            style={[
              styles.uploadBtn,
              { borderColor: theme.tint },
            ]}
          >
            <Ionicons name={selectedFile ? "document-text" : "cloud-upload-outline"} size={24} color={theme.tint} />
            <Text style={[styles.uploadText, { color: theme.tint }]}>
              {selectedFile ? selectedFile.name : "Select Document or Image"}
            </Text>
            {selectedFile && (
              <TouchableOpacity onPress={() => setSelectedFile(null)} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={20} color={theme.icon} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Submit Button */}
      <View style={[styles.footer, { borderTopColor: scheme === "dark" ? "#333" : "#e0e0e0" }]}>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={[styles.submitBtn, { backgroundColor: theme.tint, opacity: loading ? 0.7 : 1 }]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Submit Application</Text>
          )}
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
  header: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  dateBtn: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  uploadBtn: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
  submitBtn: {
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  // Toast Styles
  toast: {
    position: 'absolute',
    bottom: 90, // Positioned slightly higher to clear the footer button
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
