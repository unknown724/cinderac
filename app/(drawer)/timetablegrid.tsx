import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
  useColorScheme,
  Animated, // Added
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { fetchTimeTable } from "@/lib/api";
import useAuthStore from "@/store/useAuthStore";

// --- Configuration ---
const START_HOUR = 8; // 8:00 AM
const END_HOUR = 17;  // 5:00 PM
const CELL_WIDTH = 120; // Width of one hour block
const CELL_HEIGHT = 100; // Height of one day row
const SIDEBAR_WIDTH = 60; 

// --- UPDATED: Lighter Pastel Palette ---
const PASTEL_COLORS = [
  "#d4edda", // Very Light Green
  "#cce5ff", // Very Light Blue
  "#e2d9f3", // Very Light Purple
  "#fff3cd", // Very Light Yellow/Orange
  "#f8d7da", // Very Light Red/Pink
  "#d1ecf1", // Very Light Cyan
];

// --- Helpers ---
const getCourseColor = (str: string) => {
  if (!str) return "#f5f5f5";
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PASTEL_COLORS.length;
  return PASTEL_COLORS[index];
};

const getMonday = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
};

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const formatDateDisplay = (date: Date) => {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// --- Main Component ---

export default function TimetableGridPage() {
  const scheme = useColorScheme() ?? "dark";
  const theme = Colors[scheme];
  const { classes } = useAuthStore();

  const [currentWeekStart, setCurrentWeekStart] = useState(getMonday(new Date()));
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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

  const loadTimetable = useCallback(async () => {
    setLoading(true);
    try {
      const start = new Date(currentWeekStart);
      start.setHours(0, 0, 0, 0);
      const end = new Date(currentWeekStart);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      const res = await fetchTimeTable({
        dateStart: start.toISOString(),
        dateEnd: end.toISOString(),
      });

      const rawList = res?.data?.data?.data ?? [];
      if (Array.isArray(rawList)) {
        setScheduleData(rawList);
      }
    } catch (err) {
      console.error("Timetable fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [currentWeekStart]);

  useEffect(() => {
    loadTimetable();
  }, [loadTimetable]);

  const handlePrevWeek = () => setCurrentWeekStart(addDays(currentWeekStart, -7));
  const handleNextWeek = () => setCurrentWeekStart(addDays(currentWeekStart, 7));

  // --- Grid Lookups ---
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  const getSession = (dayIndex: number, hour: number) => {
    const targetApiInd = dayIndex + 2; 
    return scheduleData.find(item => {
      if (item.weekdayInd !== targetApiInd) return false;
      const startH = new Date(item.dateStartTime).getHours();
      return startH === hour;
    });
  };

  const formatCourseCode = (raw: string) => {
    if(!raw) return "";
    const parts = raw.split('-');
    if(parts.length > 1) return `${parts[0]} (${parts[1]})`;
    return raw;
  };

  // --- NEW Helper: Extract Status from StudentAttendance Map ---
  const getAttendanceStatus = (session: any) => {
    if (!session?.sessionAttendanceModel?.studentAttendance) return 0;
    
    // The studentAttendance is an object like { "222/032": { status: 2, ... } }
    // We grab the values and take the first one since the key is dynamic
    const records = Object.values(session.sessionAttendanceModel.studentAttendance);
    
    if (records.length > 0) {
      // @ts-ignore - TS might not know the shape of the record
      return records[0].status; 
    }
    return 0;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.background === "#000" ? "#333" : "#e0e0e0" }]}>
        <TouchableOpacity onPress={handlePrevWeek} style={styles.arrowBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.dateRangeContainer}>
          <Ionicons name="calendar-outline" size={16} color={theme.tint} style={{ marginRight: 6 }} />
          <Text style={[styles.dateRangeText, { color: theme.text }]}>
            {formatDateDisplay(currentWeekStart)} - {formatDateDisplay(addDays(currentWeekStart, 4))}
          </Text>
        </View>
        <TouchableOpacity onPress={handleNextWeek} style={styles.arrowBtn}>
          <Ionicons name="chevron-forward" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Grid Container */}
      <ScrollView 
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadTimetable} />}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View style={{ flexDirection: 'row' }}>
            
            {/* Left Sidebar */}
            <View style={[styles.sidebar, { backgroundColor: theme.background, borderRightColor: scheme === 'dark' ? '#333' : '#e0e0e0' }]}>
                <View style={[styles.cornerCell, { borderColor: scheme === 'dark' ? '#333' : '#e0e0e0' }]}>
                    <Text style={{ fontSize: 10, color: theme.icon, fontWeight: 'bold' }}>Day / Hr</Text>
                </View>
                {weekDays.map((day) => (
                    <View key={day} style={[styles.sidebarCell, { borderColor: scheme === 'dark' ? '#333' : '#e0e0e0' }]}>
                        <Text style={[styles.sidebarText, { color: theme.text }]}>{day}</Text>
                    </View>
                ))}
            </View>

            {/* Right Scrollable Area */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View>
                    {/* Header Row */}
                    <View style={styles.row}>
                        {hours.map((h) => {
                             const timeLabel = `${h > 12 ? h - 12 : h} ${h >= 12 ? 'pm' : 'am'}`;
                             return (
                                <View key={h} style={[styles.headerCell, { backgroundColor: scheme === 'dark' ? '#1a1a1a' : '#f9f9f9', borderColor: scheme === 'dark' ? '#333' : '#e0e0e0' }]}>
                                    <Text style={[styles.headerText, { color: theme.icon }]}>{timeLabel}</Text>
                                </View>
                             );
                        })}
                    </View>

                    {/* Grid Body */}
                    {weekDays.map((_, dayIndex) => (
                        <View key={dayIndex} style={styles.row}>
                            {hours.map((hour) => {
                                const session = getSession(dayIndex, hour);
                                
                                if (!session) {
                                    return <View key={hour} style={[styles.cell, { borderColor: scheme === 'dark' ? '#333' : '#f0f0f0', backgroundColor: 'transparent', borderRightWidth: 0.5, borderBottomWidth: 0.5 }]} />;
                                }

                                const courseCode = formatCourseCode(session.classroomId);
                                const color = getCourseColor(courseCode);
                                
                                // UPDATED LOGIC:
                                // 2 = Absent (Red), 1 = Present (Green)
                                const status = getAttendanceStatus(session);
                                const isAbsent = status === 2;
                                const isPresent = status === 1;
                                const showStatus = isAbsent || isPresent;

                                return (
                                    <View 
                                        key={hour} 
                                        style={[
                                            styles.cell, 
                                            { 
                                                backgroundColor: color, 
                                                borderColor: scheme === 'dark' ? '#000' : '#fff', 
                                                borderRightWidth: 2,
                                                borderBottomWidth: 2
                                            }
                                        ]}
                                    >
                                        {/* Status Bubble */}
                                        {showStatus && (
                                            <View style={[
                                                styles.statusBubble, 
                                                // Red for Absent (2), Green for Present (1)
                                                { backgroundColor: isAbsent ? '#F44336' : '#4CAF50' }
                                            ]}>
                                                <Text style={styles.statusText}>
                                                    {isAbsent ? 'A' : 'P'}
                                                </Text>
                                            </View>
                                        )}

                                        <View style={styles.cellContent}>
                                            <Text style={styles.cellCode}>{courseCode}</Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    ))}
                </View>
            </ScrollView>

        </View>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  dateRangeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff10", 
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  dateRangeText: {
    fontSize: 15,
    fontWeight: "600",
  },
  arrowBtn: {
    padding: 8,
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    zIndex: 2, 
    borderRightWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 1, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cornerCell: {
    height: 40, 
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  sidebarCell: {
    height: CELL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  sidebarText: {
    fontWeight: '700',
    fontSize: 15,
    textTransform: 'uppercase',
    opacity: 0.8
  },
  row: {
    flexDirection: 'row',
  },
  headerCell: {
    width: CELL_WIDTH,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderRightWidth: 1,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  cell: {
    width: CELL_WIDTH,
    height: CELL_HEIGHT,
    padding: 8,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellContent: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12, 
  },
  cellCode: {
    fontSize: 13,
    fontWeight: '800',
    color: '#222222',
    textAlign: 'center',
  },
  statusBubble: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ffffff80'
  },
  statusText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
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
