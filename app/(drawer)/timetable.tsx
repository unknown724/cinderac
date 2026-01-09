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

// Import the specific API function you provided
import { fetchTimeTable } from "@/lib/api"; 
import useAuthStore from "@/store/useAuthStore"; 

const { width } = Dimensions.get("window");

// --- Date Helpers ---
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

export default function TimetablePage() {
  const scheme = useColorScheme() ?? "dark";
  const theme = Colors[scheme];

  // Store Data (Used for looking up full Course Names)
  const { classes } = useAuthStore();

  // State
  const [currentWeekStart, setCurrentWeekStart] = useState(getMonday(new Date()));
  const [selectedDayIndex, setSelectedDayIndex] = useState(new Date().getDay() - 1);
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // --- Animation Values ---
  const [showSlowWarning, setShowSlowWarning] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current; // For Toast Opacity
  const toastShakeAnim = useRef(new Animated.Value(0)).current; // For Toast Wiggle

  // Ensure selected day is Mon-Fri
  useEffect(() => {
    const day = new Date().getDay();
    if (day === 0 || day === 6) setSelectedDayIndex(0);
    else setSelectedDayIndex(day - 1);
  }, []);

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

  // --- Fetch Logic ---
  const loadTimetable = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Calculate Start/End of the current week view
      const start = new Date(currentWeekStart);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(currentWeekStart);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      // 2. Call the API
      const res = await fetchTimeTable({
        dateStart: start.toISOString(),
        dateEnd: end.toISOString(),
      });

      // 3. Extract Data
      const rawList = res?.data?.data?.data || [];
      if (Array.isArray(rawList)) {
        setScheduleData(rawList);
      } else {
        console.warn("Unexpected API response format", res.data);
        setScheduleData([]);
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

  // --- Helpers for Rendering ---

  const handlePrevWeek = () => setCurrentWeekStart(addDays(currentWeekStart, -7));
  const handleNextWeek = () => setCurrentWeekStart(addDays(currentWeekStart, 7));

  // Helper: Format "CS23100-A" -> "CS23100"
  const formatClassCode = (rawId: string) => {
    if (!rawId) return "Unknown";
    return rawId.split('-')[0];
  };

  // Helper: Get Full Course Name from Store
  const getCourseName = (classroomId: string) => {
    const found = classes.find((c) => c.classroomId === classroomId);
    return found ? found.courseName : null;
  };

  // --- NEW Helper: Extract Status from StudentAttendance Map ---
  const getAttendanceStatus = (session: any) => {
    if (!session?.sessionAttendanceModel?.studentAttendance) return 0;
    
    // The studentAttendance is an object like { "222/032": { status: 2, ... } }
    const records = Object.values(session.sessionAttendanceModel.studentAttendance);
    
    if (records.length > 0) {
      // @ts-ignore
      return records[0].status; 
    }
    return 0;
  };

  // Filter Data for the View
  const targetWeekdayInd = selectedDayIndex + 2; // API uses 2=Mon
  
  const daySessions = scheduleData.filter(
    (item) => item.weekdayInd === targetWeekdayInd
  );
  
  // Sort by start time
  daySessions.sort((a, b) => new Date(a.dateStartTime).getTime() - new Date(b.dateStartTime).getTime());

  // Generate Slots (8 AM - 4 PM)
  const timeSlots = [];
  for (let i = 8; i <= 16; i++) {
    timeSlots.push(i);
  }

  const getSessionForHour = (hour: number) => {
    return daySessions.find((session) => {
      const dateObj = new Date(session.dateStartTime);
      return dateObj.getHours() === hour;
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* 1. HEADER */}
      <View style={[styles.header, { borderBottomColor: theme.background === "#000" ? "#333" : "#e0e0e0" }]}>
        <TouchableOpacity onPress={handlePrevWeek} style={styles.arrowBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.dateRangeContainer}>
          <Ionicons name="calendar-outline" size={16} color={theme.tint} style={{ marginRight: 6 }} />
          <Text style={[styles.dateRangeText, { color: theme.text }]}>
            {formatDateDisplay(currentWeekStart)} - {formatDateDisplay(addDays(currentWeekStart, 6))}
          </Text>
        </View>
        <TouchableOpacity onPress={handleNextWeek} style={styles.arrowBtn}>
          <Ionicons name="chevron-forward" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* 2. DAY TABS */}
      <View style={styles.tabsContainer}>
        {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, index) => {
          const isActive = selectedDayIndex === index;
          const tabDate = addDays(currentWeekStart, index);
          return (
            <TouchableOpacity
              key={day}
              onPress={() => setSelectedDayIndex(index)}
              style={[
                styles.tab,
                isActive && { backgroundColor: theme.tint },
                !isActive && scheme === 'dark' && { backgroundColor: "#ffffff10" },
                !isActive && scheme === 'light' && { backgroundColor: "#f0f0f0" },
              ]}
            >
              <Text style={[styles.tabDay, { color: isActive ? "#fff" : theme.icon }]}>{day}</Text>
              <Text style={[styles.tabDate, { color: isActive ? "#fff" : theme.text }]}>
                {tabDate.getDate()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 3. TIMETABLE SCROLL VIEW */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadTimetable} tintColor={theme.tint} />}
      >
        {timeSlots.map((hour) => {
          const session = getSessionForHour(hour);
          const timeLabel = `${hour > 12 ? hour - 12 : hour} ${hour >= 12 ? 'PM' : 'AM'}`;

          // DATA EXTRACTION
          let displayCode = "";
          let displayName = "";
          let facultyName = "Faculty";
          let roomName = "N/A";
          
          let isPresent = false;
          let isAbsent = false;

          if (session) {
            // A. Codes & Names
            displayCode = formatClassCode(session.classroomId);
            displayName = getCourseName(session.classroomId) || session.classroomId;
            
            // B. Meta Info
            roomName = session.roomName || "Room N/A";
            if (session.sessionAttendanceModel) {
                facultyName = session.sessionAttendanceModel.facultyName || "Faculty";
            }

            // C. Attendance (Using the new helper)
            const status = getAttendanceStatus(session);
            isAbsent = status === 2; // 2 = Absent (Red)
            isPresent = status === 1; // 1 = Present (Green)
          }

          const showStatus = isPresent || isAbsent;

          return (
            <View key={hour} style={styles.timeRow}>
              {/* Time Column */}
              <View style={styles.timeCol}>
                <Text style={[styles.timeText, { color: theme.icon }]}>{timeLabel}</Text>
              </View>

              {/* Event Column */}
              <View style={styles.eventCol}>
                {session ? (
                  <View
                    style={[
                      styles.classCard,
                      { 
                        backgroundColor: theme.tint + "15", 
                        borderLeftColor: theme.tint 
                      },
                    ]}
                  >
                    {/* TOP ROW: Code/Name + Status Badge */}
                    <View style={styles.cardHeader}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                            {/* Primary: Course Name */}
                            <Text numberOfLines={1} style={[styles.subjectTitle, { color: theme.text }]}>
                                {displayName}
                            </Text>
                            {/* Secondary: Code (CS23100) */}
                            <Text style={[styles.subjectCode, { color: theme.icon }]}>
                                {displayCode}
                            </Text>
                        </View>

                        {/* STATUS BADGE */}
                        {showStatus && (
                            <View style={[
                                styles.statusBadge, 
                                { backgroundColor: isAbsent ? '#F44336' : '#4CAF50' }
                            ]}>
                                <Text style={styles.statusText}>
                                    {isAbsent ? 'A' : 'P'}
                                </Text>
                            </View>
                        )}
                    </View>
                    
                    {/* BOTTOM ROW: Room & Faculty */}
                    <View style={styles.metaRow}>
                      
                      {/* Room */}
                      <View style={styles.metaItem}>
                        <Ionicons name="location-outline" size={12} color={theme.icon} />
                        <Text style={[styles.metaText, { color: theme.icon }]}>
                          {roomName}
                        </Text>
                      </View>
                      
                      {/* Faculty (Expanded Width) */}
                      <View style={[styles.metaItem, { flex: 1 }]}>
                        <Ionicons name="person-outline" size={12} color={theme.icon} />
                        <Text numberOfLines={1} style={[styles.metaText, { color: theme.icon }]}>
                          {facultyName}
                        </Text>
                      </View>

                    </View>
                  </View>
                ) : (
                  // Empty Slot
                  <View style={[styles.emptySlot, { borderColor: scheme === 'dark' ? '#ffffff10' : '#f0f0f0' }]} />
                )}
              </View>
            </View>
          );
        })}
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
  tabsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 12,
  },
  tabDay: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  tabDate: {
    fontSize: 16,
    fontWeight: "bold",
  },
  
  // Timetable Grid
  timeRow: {
    flexDirection: "row",
    minHeight: 90, 
  },
  timeCol: {
    width: 60,
    alignItems: "center",
    paddingTop: 12, 
    borderRightWidth: 1,
    borderRightColor: "#ffffff10",
  },
  timeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  eventCol: {
    flex: 1,
    padding: 6,
  },
  emptySlot: {
    flex: 1,
    borderBottomWidth: 1,
    borderStyle: 'dashed',
  },
  classCard: {
    flex: 1,
    borderRadius: 8,
    borderLeftWidth: 4,
    padding: 10,
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start'
  },
  subjectTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 2,
  },
  subjectCode: {
    fontSize: 12,
    marginBottom: 6,
    fontWeight: "500",
    opacity: 0.8
  },
  
  // Meta Info (Room & Faculty)
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    alignItems: 'center'
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    // Removed maxWidth to allow expansion
  },

  // Status Badge (Present/Absent)
  statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      minWidth: 28,
      alignItems: 'center',
      justifyContent: 'center'
  },
  statusText: {
      color: '#fff',
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
