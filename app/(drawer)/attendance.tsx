import React, { useCallback, useEffect, useState, useMemo, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  useColorScheme,
  RefreshControl,
  TextInput,
  Animated, // Added
  StyleSheet, // Added if not present, though usually inline styles were used in original, I'll add StyleSheet for toast
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";
import { getAttendanceStatsForAllSubjects, getClassList } from "@/lib/api";
import useAuthStore from "@/store/useAuthStore";
import { Ionicons } from "@expo/vector-icons"; // Added

export default function AttendancePage() {
  const scheme = useColorScheme() ?? "dark";
  const theme = Colors[scheme];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [target, setTarget] = useState(75); // ★ NEW: Dynamic target %

  const { attendance, setAttendance } = useAuthStore();

  const BAD = "#ef4444";

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

  useEffect(() => {
    (async () => {
      try {
        await getClassList();
        await getAttendanceStatsForAllSubjects();
      } catch (e) {
        console.error("Attendance load error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setAttendance([]);
      await getClassList();
      await getAttendanceStatsForAllSubjects();
    } finally {
      setRefreshing(false);
    }
  }, []);

  const overall = useMemo(() => {
    if (!attendance?.length) return 0;

    const {
      totalAttended,
      totalClasses,
    } = attendance.reduce(
      (acc, a) => {
        // Use totalAttended and totalLecture (or totalClasses) for the overall total
        acc.totalAttended += parseFloat(a.attendedTheoryClassCount || 0) + parseFloat(a.attendedPracticalClassCount || 0);
        acc.totalClasses += parseFloat(a.theoryClassCount || 0) + parseFloat(a.practicalClassCount || 0);
        return acc;
      },
      { totalAttended: 0, totalClasses: 0 }
    );

    if (totalClasses === 0) return 0;

    // Calculate percentage and format to 2 decimal places
    return ((totalAttended / totalClasses) * 100).toFixed(2);
  }, [attendance]);

  // ---

  /**
   * Calculates the overall theory attendance percentage
   * using the sum of attended theory classes / sum of total theory classes.
   */
  const overallTheory = useMemo(() => {
    if (!attendance?.length) return 0;

    const {
      totalAttendedTheory,
      totalTheoryClasses,
    } = attendance.reduce(
      (acc, a) => {
        // Sum theory counts for all subjects
        acc.totalAttendedTheory += parseFloat(a.attendedTheoryClassCount || 0);
        acc.totalTheoryClasses += parseFloat(a.theoryClassCount || 0);
        return acc;
      },
      { totalAttendedTheory: 0, totalTheoryClasses: 0 }
    );

    if (totalTheoryClasses === 0) return 0;

    // Calculate percentage and format to 2 decimal places
    return ((totalAttendedTheory / totalTheoryClasses) * 100).toFixed(2);
  }, [attendance]);

  // ---

  /**
   * Calculates the overall practical attendance percentage,
   * only including subjects that have recorded practical classes.
   */
  const overallPractical = useMemo(() => {
    if (!attendance?.length) return 0;

    const {
      totalAttendedPractical,
      totalPracticalClasses,
    } = attendance.reduce(
      (acc, a) => {
        // ONLY include this subject's practical count if it has practical classes (practicalClassCount > 0)
        const practicalCount = parseFloat(a.practicalClassCount || 0);

        if (practicalCount > 0) {
          acc.totalAttendedPractical += parseFloat(a.attendedPracticalClassCount || 0);
          acc.totalPracticalClasses += practicalCount;
        }
        return acc;
      },
      { totalAttendedPractical: 0, totalPracticalClasses: 0 }
    );

    if (totalPracticalClasses === 0) return 0;

    // Calculate percentage and format to 2 decimal places
    return ((totalAttendedPractical / totalPracticalClasses) * 100).toFixed(2);
  }, [attendance]);


  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: theme.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator color={theme.tint} size="large" />
        <Text style={{ marginTop: 10, color: theme.text }}>
          Loading attendance...
        </Text>

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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <FlatList
        data={attendance}
        keyExtractor={(item) => item.classroomGeneratedId.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.text}
            colors={[theme.tint]}
          />
        }
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 40,
        }}
        ListHeaderComponent={
          <View
            style={[
              {
                borderRadius: 14,
                padding: 18,
                marginBottom: 18,
              },
              scheme === "dark"
                ? { backgroundColor: "#ffffff12" }
                : { backgroundColor: "#fafafa", borderWidth: 1, borderColor: "#d4d4d4" },
            ]}
          >
            <Text
              style={{
                color: theme.text,
                fontSize: 20,
                fontWeight: "700",
              }}
            >
              🎯 Target Attendance
            </Text>

            {/* ★ NEW Input field */}
            <TextInput
              keyboardType="numeric"
              value={String(target)}
              onChangeText={(v) => setTarget(Number(v) || 0)}
              style={{
                marginTop: 10,
                backgroundColor: scheme === "dark" ? "#ffffff22" : "#e5e5e5",
                padding: 10,
                borderRadius: 8,
                color: theme.text,
                fontSize: 18,
              }}
              placeholder="Enter %"
              placeholderTextColor={theme.icon}
            />

            <Text
              style={{
                color: overall >= target ? theme.text : BAD,
                fontSize: 32,
                fontWeight: "800",
                marginTop: 12,
              }}
            >
              Overall: {overall}%
            </Text>
            <Text
              style={{
                color: overallTheory >= target ? theme.text : BAD,
                fontSize: 16,
                fontWeight: "800",
                marginTop: 12,
              }}
            >
              Overall Theory: {overallTheory}%
            </Text>
            <Text
              style={{
                color: overallPractical >= target ? theme.text : BAD,
                fontSize: 16,
                fontWeight: "800",
                marginTop: 12,
              }}
            >
              Overall Practical: {overallPractical}%
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const targetFraction = target / 100;

          const theory = parseFloat(item.theoryClassPercentage || 0);
          const practical = parseFloat(item.practicalClassPercentage || 0);
          const total = parseFloat(item.totalPercentage || 0);

          // Dynamic formulas
          const requiredTheory =
            theory < target
              ? Math.ceil(
                (targetFraction * item.theoryClassCount -
                  item.attendedTheoryClassCount) /
                (1 - targetFraction)
              )
              : 0;

          const requiredPractical =
            practical < target && item.practicalClassCount > 0
              ? Math.ceil(
                (targetFraction * item.practicalClassCount -
                  item.attendedPracticalClassCount) /
                (1 - targetFraction)
              )
              : 0;

          const requiredTotal =
            total < target
              ? Math.ceil(
                (targetFraction * item.theoryClassCount -
                  item.attendedTheoryClassCount) /
                (1 - targetFraction)
              )
              : 0;

          return (
            <View
              style={[
                {
                  padding: 16,
                  borderRadius: 14,
                  marginBottom: 14,
                },
                scheme === "dark"
                  ? { backgroundColor: "#ffffff12" }
                  : { backgroundColor: "#fafafa", borderWidth: 1, borderColor: "#d4d4d4" },
              ]}
            >
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "600",
                  color: theme.text,
                }}
              >
                {item.courseName}
              </Text>

              <Text style={{ color: theme.icon, marginBottom: 10 }}>
                {item.courseId}
              </Text>

              {/* Theory */}
              <Text
                style={{
                  color: theory < target ? BAD : theme.text,
                  fontWeight: "600",
                }}
              >
                Theory: {item.attendedTheoryClassCount}/{item.theoryClassCount} ({theory.toFixed(2)}%)
              </Text>

              {requiredTheory > 0 && (
                <Text style={{ fontSize: 13, color: BAD }}>
                  Attend next {requiredTheory} theory class
                  {requiredTheory > 1 ? "es" : ""} to reach {target}%.
                </Text>
              )}

              {/* Practical */}
              {item.practicalClassCount > 0 && (
                <>
                  <Text
                    style={{
                      marginTop: 6,
                      color: practical < target ? BAD : theme.text,
                      fontWeight: "600",
                    }}
                  >
                    Practical: {item.attendedPracticalClassCount}/{item.practicalClassCount} ({practical.toFixed(2)}%)
                  </Text>

                  {requiredPractical > 0 && (
                    <Text style={{ fontSize: 13, color: BAD }}>
                      Attend next {requiredPractical} practical class
                      {requiredPractical > 1 ? "es" : ""} to reach {target}%.
                    </Text>
                  )}
                </>
              )}

              {/* Total */}
              <Text
                style={{
                  color: total < target ? BAD : theme.text,
                  marginTop: 10,
                  fontWeight: "700",
                  fontSize: 16,
                }}
              >
                Total: {total.toFixed(2)}%
              </Text>

              {requiredTotal > 0 && (
                <Text style={{ fontSize: 13, color: BAD, marginTop: 4 }}>
                  Attend next {requiredTotal} total class
                  {requiredTotal > 1 ? "es" : ""} to reach {target}% overall.
                </Text>
              )}
            </View>
          );
        }}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
