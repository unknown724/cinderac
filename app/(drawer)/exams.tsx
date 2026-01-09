import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  useColorScheme,
  RefreshControl,
  FlatList,
  StyleSheet,
  Animated, // Added
} from "react-native";
import { Colors } from "@/constants/theme";
import { fetchExamResults, computeAndStoreCGPA } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import useAuthStore from "@/store/useAuthStore";

export default function Exam() {
  const scheme = useColorScheme() ?? "dark";
  const theme = Colors[scheme];
  const { user, cgpa, setCGPA } = useAuthStore();

  const [semester, setSemester] = useState(user.currentStage);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState("");
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

  const loadResults = async () => {
    setError("");
    try {
      const res: any = await fetchExamResults({ semester });
      const data = res?.data?.data;
      if (!data) throw new Error("No result data found");
      setResults(data);
    } catch (err) {
      setError("Unable to load results");
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadResults();
    // computeAndStoreCGPA();
  }, [semester]);

  // Pull-to-Refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setResults([]);
    setCGPA(0);
    await loadResults();
    await computeAndStoreCGPA();
    setRefreshing(false);
  }, [semester]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
        <Text style={{ color: theme.icon, marginTop: 10 }}>Loading results...</Text>

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

  const isError = error || !results;
  const subjects = results?.studentResultList ?? [];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={subjects}
        keyExtractor={(item, index) => `${item.courseId}-${index}`}
        ListHeaderComponent={
          <>
            {/* Semester Selector */}
            <TouchableOpacity
              onPress={() => setShowDropdown(!showDropdown)}
              style={[
                styles.dropdownButton,
                scheme === "dark"
                  ? { backgroundColor: "#ffffff12" }
                  : { backgroundColor: "#fafafa", borderWidth: 1, borderColor: "#d4d4d4" },
              ]}
            >
              <Text style={[styles.dropdownText, { color: theme.text }]}>
                Semester {semester}
              </Text>
              <Ionicons
                name={showDropdown ? "chevron-up" : "chevron-down"}
                size={18}
                color={theme.text}
              />
            </TouchableOpacity>

            {showDropdown && (
              <View
                style={[
                  styles.dropdown,
                  scheme === "dark"
                    ? { backgroundColor: "#ffffff10" }
                    : { backgroundColor: "#fafafa", borderWidth: 1, borderColor: "#d4d4d4" },
                ]}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <TouchableOpacity
                    key={sem}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSemester(sem);
                      setShowDropdown(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        { color: sem === semester ? theme.tint : theme.text },
                      ]}
                    >
                      Semester {sem}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* SGPA / CGPA */}
            <View
              style={[
                styles.card,
                scheme === "dark"
                  ? { backgroundColor: "#ffffff12" }
                  : { backgroundColor: "#fafafa", borderWidth: 1, borderColor: "#d4d4d4" },
              ]}
            >
              <View style={styles.subcard}>
                <Text style={[styles.label, { color: theme.icon }]}>SGPA</Text>
                <Text style={[styles.value, { color: theme.text }]}>
                  {isError ? "—" : results.sgpa}
                </Text>
              </View>

              <View style={styles.subcard}>
                <Text style={[styles.label, { color: theme.icon }]}>Percentage</Text>
                <Text style={[styles.value, { color: theme.text }]}>
{results.cgpa ? (results.cgpa * 10 - 5).toFixed(2) : "—"}%
                </Text>
              </View>

              <View style={styles.subcard}>
                <Text style={[styles.label, { color: theme.icon }]}>CGPA</Text>
                <Text style={[styles.value, { color: theme.text }]}>{isError ? "—" : results.cgpa}</Text>
              </View>
            </View>

            {/* Error */}
            {isError && (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ color: theme.text, marginBottom: 10, opacity: 0.7 }}>
                  {error || "Could not load results."}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.retryButton,
                    scheme === "dark"
                      ? { backgroundColor: "#ffffff25" }
                      : { backgroundColor: "#ececec", borderWidth: 1, borderColor: "#c9c9c9" },
                  ]}
                  onPress={loadResults}
                >
                  <Text style={[styles.retryText, { color: theme.tint }]}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={[styles.subHeader, { color: theme.text }]}>Subjects</Text>
          </>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.tint}
            colors={[theme.tint]}
          />
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.subjectCard,
              scheme === "dark"
                ? { backgroundColor: "#ffffff12" }
                : { backgroundColor: "#fafafa", borderWidth: 1, borderColor: "#d4d4d4" },
            ]}
          >
            <Text style={[styles.courseName, { color: theme.text }]}>
              {item.courseName}
            </Text>

            <View style={styles.row}>
              <Text style={[styles.item, { color: theme.icon }]}>
                Code: <Text style={{ color: theme.text }}>{item.courseId}</Text>
              </Text>
              <Text style={[styles.item, { color: theme.icon }]}>
                Credit: <Text style={{ color: theme.text }}>{item.credit}</Text>
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={[styles.item, { color: theme.icon }]}>
                Marks:
                <Text style={{ color: theme.text }}>
                  {" "}
                  {item.marksObtained}/{item.total}
                </Text>
              </Text>

              <Text style={[styles.item, { color: theme.icon }]}>
                Grade: <Text style={{ color: theme.text }}>{item.grade}</Text>
              </Text>
            </View>
          </View>
        )}
      />

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
  container: { flex: 1, paddingTop: 16, paddingHorizontal: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  scroll: { paddingHorizontal: 16, paddingBottom: 40 },

  dropdownButton: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownText: { fontSize: 16, fontWeight: "600" },
  dropdown: { borderRadius: 12, paddingVertical: 6, marginBottom: 15 },
  dropdownItem: { padding: 12 },
  dropdownItemText: { fontSize: 15 },

  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  subcard: { padding: 6 },

  subjectCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 14,
  },

  subHeader: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  courseName: { fontSize: 16, fontWeight: "600", marginBottom: 8 },

  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  item: { fontSize: 14 },

  label: { fontSize: 14, fontWeight: "500" },
  value: { fontSize: 20, fontWeight: "700", marginTop: 4 },

  retryButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  retryText: { fontSize: 15, fontWeight: "600" },

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
