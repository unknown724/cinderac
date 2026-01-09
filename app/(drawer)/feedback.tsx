import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  memo,
  Fragment,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  useColorScheme,
  Image,
  FlatList,
  ListRenderItemInfo,
  Alert,
  Animated, // Added
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import {
  fetchFeedBackCourseDtls,
  fetchFeedBackStudentFeedback,
  saveFeedBackStudentFeedback,
} from "@/lib/api";
import useAuthStore from "@/store/useAuthStore";
import type {
  Course,
  OptionDTO,
  SectionDTO,
  SetDTO,
} from "@/constants/types";

/** ---------- Small presentational rows ---------- */
const getCourseBadge = (course: Course) => {
  if (!course.courseId && !course.facultyId) {
    return { label: "Non Academic", color: "#888" };
  }

  switch (course.courseType) {
    case 0:
      return { label: "College", color: "#6C5CE7" };
    case 1:
      return { label: "Lecture", color: "#0984e3" };
    case 2:
      return { label: "Practical", color: "#00b894" };
    default:
      return { label: "Course", color: "#b2bec3" };
  }
};

const DropdownRow = memo(function DropdownRow({ course, onPress, theme }: { course: Course, onPress: any, theme: any }) {
  const { label, color } = getCourseBadge(course);
  // Check both status and feedbackFilled for safety
  const isFilled = course.status === 1 || course.feedbackFilled === 1;

  return (
    <TouchableOpacity
      onPress={() => onPress(course)}
      style={styles.dropdownItem}
      activeOpacity={0.7}
    >
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={{ color: theme.text, fontSize: 15, fontWeight: "600" }}
      >
        {(!course.courseId && !course.facultyId) ? "Non Academic" : course.courseName}
      </Text>

      <View style={{ marginTop: 4, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: theme.icon, fontSize: 12 }}>{course.courseId}</Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Badge label={label} color={color} />

          {isFilled && (
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={theme.tint}
              style={{ marginLeft: 6 }}
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

const OptionRow = memo(function OptionRow({
  opt,
  selected,
  onPress,
  theme,
  disabled,
}: {
  opt: OptionDTO;
  selected: boolean;
  onPress: () => void;
  theme: any;
  disabled: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.optionRow,
        disabled && { opacity: 0.4 }
      ]}
      onPress={() => {
        if (!disabled) onPress();
      }}
      activeOpacity={disabled ? 1 : 0.75}
      disabled={disabled}
    >
      {selected ? (
        <Image
          source={require("@/assets/pokeball.png")}
          style={{ width: 24, height: 24, marginRight: 10 }}
        />
      ) : (
        <Ionicons
          name="radio-button-off"
          size={22}
          color={theme.icon}
          style={{ marginRight: 10 }}
        />
      )}

      <Text
        style={{
          color: selected ? theme.tint : theme.text,
          fontWeight: selected ? "700" : "500",
        }}
      >
        {opt.description}
      </Text>
    </TouchableOpacity>
  );
},
  (prev, next) =>
    prev.selected === next.selected &&
    prev.opt.optionId === next.opt.optionId &&
    prev.disabled === next.disabled
);

const Badge = ({ label, color }: { label: string; color: string }) => (
  <View style={{
    backgroundColor: color + "33",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8
  }}>
    <Text style={{ color, fontSize: 11, fontWeight: "600" }}>
      {label}
    </Text>
  </View>
);

/** ---------- Main Component ---------- */
export default function FeedbackPage(): JSX.Element {
  const scheme = useColorScheme() ?? "dark";
  const theme = Colors[scheme];
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [bulkValue, setBulkValue] = useState(5);
  const [refreshing, setRefreshing] = useState(false);

  const [courseList, setCourseList] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [feedbackData, setFeedbackData] = useState<SetDTO | null>(null);

  const [loadingCourses, setLoadingCourses] = useState<boolean>(true);
  const [loadingFeedback, setLoadingFeedback] = useState<boolean>(false);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);

  const answersRef = useRef<Record<number, number>>({});
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion(v => v + 1), []);

  const contrastText = "#1B1F2F";

  // --- Animation Values ---
  const [showSlowWarning, setShowSlowWarning] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current; // For Toast Opacity
  const toastShakeAnim = useRef(new Animated.Value(0)).current; // For Toast Wiggle

  // --- Slow Network Monitor (Toast Animation) ---
  const isLoadingAny = loadingCourses || loadingFeedback || refreshing;

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLoadingAny) {
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
  }, [isLoadingAny]);

  // Interpolate Toast Slide Up
  const toastTranslateY = fadeAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [20, 0]
  });

  useEffect(() => {
    if (!loadingCourses && courseList.length > 0 && !selectedCourse) {
      handleSelectCourse(courseList[0]);
    }
  }, [loadingCourses, courseList]);

  /** ---------------- Load course list ---------------- */
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingCourses(true);
      try {
        const res = await fetchFeedBackCourseDtls();
        const list = Array.isArray(res) ? res : (res?.data?.data ?? res?.data ?? []);
        if (mounted) setCourseList(list as Course[]);
      } catch (err) {
        console.warn("fetchFeedBackCourseDtls failed:", err);
      } finally {
        if (mounted) setLoadingCourses(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  /** ---------------- Select course & load feedback ---------------- */
  const handleSelectCourse = useCallback(async (course: Course) => {
    setSelectedCourse(course);
    setDropdownOpen(false);
    setLoadingFeedback(true);
    setFeedbackData(null);
    answersRef.current = {};
    bump();

    try {
      const res = await fetchFeedBackStudentFeedback({
        assignmentType: course.courseId == null ? 0 : course.courseType,
        courseId: course.courseId,
        facultyId: course.facultyId,
      });

      const full = res?.data?.data;
      const feedbackFilled = full?.feedbackFilled ?? 0;

      setSelectedCourse({
        ...course,
        feedbackFilled,
        status: feedbackFilled
      });

      setFeedbackData({
        ...full.setDTO,
        instId: full.instId,
        campusId: full.campusId,
        collegeId: full.collegeId,
        academicYear: full.academicYear,
        sessionNo: full.sessionNo,
        studentId: full.studentId,
        courseId: full.courseId,
        lectureType: full.lectureType,
        assignmentNo: full.assignmentNo,
        feedbackNo: full.feedbackNo,
        facultyId: full.facultyId,
        feedbackFilled: full.feedbackFilled,
      });
      const initialAnswers: Record<number, number> = {};

      full.setDTO.sectionDTOList.forEach((section: SectionDTO) => {
        if (section.active !== 1) return;

        section.questionList.forEach(q => {
          const chosen = q.optionDTOList.find(o => o.optionChoosen === 1);
          if (chosen) {
            initialAnswers[q.questionId] = chosen.optionId;
          }
        });
      });

      answersRef.current = initialAnswers;
      bump();

    } catch (err) {
      console.error("Load failed:", err);
      Alert.alert("Error", "Failed to load feedback.");
    } finally {
      setLoadingFeedback(false);
    }
  }, []);

  const chooseAnswer = useCallback((questionId: number, optionId: number) => {
    const prev = answersRef.current[questionId];
    if (prev === optionId) return;
    answersRef.current[questionId] = optionId;
    bump();
  }, [bump]);

  const setAllTo = useCallback((value: number) => {
    if (!feedbackData) return;
    const newMap: Record<number, number> = {};
    for (const section of feedbackData.sectionDTOList) {
      for (const q of section.questionList) {
        newMap[q.questionId] = value;
      }
    }
    answersRef.current = newMap;
    bump();
  }, [feedbackData, bump]);

  /** ---------------- REFRESH LOGIC ---------------- */
  // This re-fetches the *currently selected* course to update UI (like locking fields)
  const onRefresh = useCallback(async () => {
    if (!selectedCourse) return;

    try {
      setRefreshing(true);

      const res = await fetchFeedBackStudentFeedback({
        assignmentType: selectedCourse.courseType,
        courseId: selectedCourse.courseId,
        facultyId: selectedCourse.facultyId,
      });

      const full = res?.data?.data;
      const feedbackFilled = full?.feedbackFilled ?? 0;

      // Update the Selected Course State
      setSelectedCourse(prev => ({
        ...prev!,
        feedbackFilled,
        status: feedbackFilled // FORCE status update
      }));

      // Update the Dropdown List State (so green checkmarks appear immediately)
      setCourseList(prevList => prevList.map(c => {
        if (c.courseId === selectedCourse.courseId && c.facultyId === selectedCourse.facultyId) {
          return { ...c, status: feedbackFilled, feedbackFilled: feedbackFilled };
        }
        return c;
      }));

      setFeedbackData({
        ...full.setDTO,
        instId: full.instId,
        campusId: full.campusId,
        collegeId: full.collegeId,
        academicYear: full.academicYear,
        sessionNo: full.sessionNo,
        studentId: full.studentId,
        courseId: full.courseId,
        lectureType: full.lectureType,
        assignmentNo: full.assignmentNo,
        feedbackNo: full.feedbackNo,
        facultyId: full.facultyId,
        feedbackFilled: full.feedbackFilled,
      });

    } catch (err) {
      console.error("Refresh failed:", err);
      Alert.alert("Error", "Failed to refresh.");
    } finally {
      setRefreshing(false);
    }
  }, [selectedCourse]);

  /** ---------------- SAVE (Single) ---------------- */
  const handleSave = useCallback(async () => {
    if (!feedbackData) {
      Alert.alert("Error", "No feedback loaded.");
      return;
    }

    try {
      const finalData = JSON.parse(JSON.stringify(feedbackData));

      finalData.sectionDTOList = finalData.sectionDTOList.map((section: SectionDTO) => {
        if (section.active !== 1) {
          return {
            ...section,
            questionList: section.questionList.map(q => ({
              ...q,
              optionDTOList: []
            }))
          };
        }

        return {
          ...section,
          questionList: section.questionList.map(q => {
            const chosenOptionId = answersRef.current[q.questionId];
            const selected = q.optionDTOList.find(o => o.optionId === chosenOptionId);

            return {
              ...q,
              optionDTOList: selected
                ? [{ ...selected, optionChoosen: 1 }]
                : []
            };
          })
        };
      });

      const payload = {
        instId: finalData.instId,
        campusId: finalData.campusId,
        collegeId: finalData.collegeId,
        academicYear: finalData.academicYear,
        sessionNo: finalData.sessionNo,
        studentId: finalData.studentId,
        courseId: finalData.courseId,
        lectureType: finalData.lectureType,
        assignmentNo: finalData.assignmentNo,
        feedbackNo: finalData.feedbackNo,
        facultyId: finalData.facultyId,
        setDTO: {
          instId: finalData.instId,
          setId: finalData.setId,
          setTitile: finalData.setTitile,
          setDescription: finalData.setDescription,
          active: finalData.active,
          sectionDTOList: finalData.sectionDTOList,
        },
        feedbackFilled: finalData.feedbackFilled
      };

      await saveFeedBackStudentFeedback(payload);

      Alert.alert("Success", "Feedback saved!");
      
      // ✅ AUTOMATICALLY REFRESH AFTER SAVE
      onRefresh();

    } catch (err) {
      console.error("❌ Save failed:", err);
      Alert.alert("Error", "Save failed.");
    }
  }, [feedbackData, onRefresh]);

  /** ---------------- SAVE (Bulk) ---------------- */
  const handleFillAndSubmitAll = useCallback(async (value: number) => {
    try {
      Alert.alert("Processing", "Submitting all courses...");

      for (const course of courseList) {
        // Skip already filled courses to save time/bandwidth (optional, remove if you want to overwrite)
        if (course.status === 1 || course.feedbackFilled === 1) continue;

        const res = await fetchFeedBackStudentFeedback({
          assignmentType: course.courseId == null ? 0 : course.courseType,
          courseId: course.courseId,
          facultyId: course.facultyId,
        });

        const full = res?.data?.data;
        if (!full) continue;

        const dto = JSON.parse(JSON.stringify(full.setDTO));

        dto.sectionDTOList.forEach((section: SectionDTO) => {
          if (section.active !== 1) {
            section.questionList = section.questionList.map(q => ({
              ...q,
              optionDTOList: []
            }));
          } else {
            section.questionList = section.questionList.map(q => {
              const option = q.optionDTOList.find(o => o.pointScore === value);
              return {
                ...q,
                optionDTOList: option
                  ? [{ ...option, optionChoosen: 1 }]
                  : []
              };
            });
          }
        });

        const payload = {
          instId: full.instId,
          campusId: full.campusId,
          collegeId: full.collegeId,
          academicYear: full.academicYear,
          sessionNo: full.sessionNo,
          studentId: full.studentId,
          courseId: full.courseId,
          lectureType: full.lectureType,
          assignmentNo: full.assignmentNo,
          feedbackNo: full.feedbackNo,
          facultyId: full.facultyId,
          setDTO: dto,
        };

        await saveFeedBackStudentFeedback(payload);
      }

      Alert.alert("Success", "All courses submitted!");

      // ✅ AUTOMATICALLY REFRESH CURRENT PAGE AND LIST
      onRefresh();
      
      // ✅ UPDATE ALL LOCAL BADGES TO FILLED
      setCourseList(prev => prev.map(c => ({ ...c, status: 1, feedbackFilled: 1 })));

    } catch (err) {
      console.error("❌ Bulk Submit Failed:", err);
      Alert.alert("Error", "Some courses failed to submit.");
    }
  }, [courseList, onRefresh]);

  /** ---------- Render helpers ---------- */
  // Check feedbackFilled safely
  const isFilled = selectedCourse?.feedbackFilled === 1 || selectedCourse?.status === 1;

  const ListHeader = () => (
    <View style={{ padding: 16 }}>
      <Text style={[styles.header, { color: theme.text }]}>Select Course</Text>

      {/* Dropdown button */}
      <TouchableOpacity
        onPress={() => setDropdownOpen(v => !v)}
        style={[
          styles.dropdown,
          {
            backgroundColor: scheme === "dark" ? "#ffffff12" : "#f5f5f5",
            borderColor: scheme === "light" ? "#d4d4d4" : "transparent",
          },
        ]}
        activeOpacity={0.85}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <Text
            style={{ color: theme.text, fontSize: 16, flex: 1 }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {selectedCourse
              ? (!selectedCourse.courseId && !selectedCourse.facultyId)
                ? "Non Academic"
                : selectedCourse.courseName
              : "Choose a course"}
          </Text>

          {selectedCourse && (
            <Badge {...getCourseBadge(selectedCourse)} />
          )}

          {isFilled && (
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={theme.tint}
              style={{ marginLeft: 6 }}
            />
          )}
        </View>
        <Ionicons name={dropdownOpen ? "chevron-up" : "chevron-down"} size={20} color={theme.text} />
      </TouchableOpacity>

      {dropdownOpen && (
        <View style={[styles.dropdownList, { backgroundColor: scheme === "dark" ? "#ffffff12" : "#fafafa" }]}>
          {loadingCourses ? (
            <View style={styles.center}>
              <ActivityIndicator size="small" color={theme.tint} />
              <Text style={{ color: theme.text, marginTop: 8 }}>Loading courses...</Text>
            </View>
          ) : (
            courseList.map((c, i) => (
              <DropdownRow key={`${c.courseId}_${c.facultyId}_${i}`} course={c} onPress={handleSelectCourse} theme={theme} />
            ))
          )}
        </View>
      )}

      {loadingFeedback && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.tint} />
          <Text style={{ color: theme.text, marginTop: 8 }}>Loading feedback...</Text>
        </View>
      )}

      {feedbackData && !isFilled && (
        <Fragment>
          <View style={{ marginTop: 16, marginBottom: 12 }}>
            <Text style={[styles.headerSmall, { color: theme.text }]}>Set all answers</Text>

            <View style={styles.row}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity
                  key={n}
                  onPress={() => setAllTo(n)}
                  style={[
                    styles.numberBtn,
                    { backgroundColor: scheme === "dark" ? "#ffffff12" : "#efefef" },
                  ]}
                  activeOpacity={0.85}
                >
                  <Text style={{ color: theme.text, fontSize: 16 }}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>


            <TouchableOpacity
              onPress={() => setBulkModalVisible(true)}
              style={[
                styles.saveBtn,
                { backgroundColor: "#6C5CE7" },
                isFilled && styles.disabledBtn
              ]}
              activeOpacity={0.9}
              disabled={isFilled}
            >
              <Text style={{ color: contrastText, fontWeight: "700" }}>
                Fill All & Submit All Courses
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              style={[
                styles.saveBtn,
                { backgroundColor: theme.tint },
                isFilled && styles.disabledBtn
              ]}
              activeOpacity={0.9}
              disabled={isFilled}
            >
              <Text style={{ color: contrastText, fontWeight: "700" }}>Save</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.sectionHeader, { color: theme.tint }]}>{feedbackData.setTitile}</Text>
        </Fragment>
      )}
    </View>
  );

  const renderSection = ({ item: section }: ListRenderItemInfo<SectionDTO>) => {
    return (
      <View key={section.sectionId} style={{ marginBottom: 25, paddingHorizontal: 16 }}>
        <Text style={[styles.sectionName, { color: theme.tint }]}>{section.sectionName}</Text>

        {section.questionList
          .filter(q => q.active === 1)
          .map((q, index) => {
            const number = index + 1;
            const selectedOptionId = answersRef.current[q.questionId];
            return (
              <View key={q.questionId} style={styles.questionBox}>
                <Text style={[styles.questionText, { color: theme.text }]}>{number}. {q.questionDesc}</Text>

                {q.optionDTOList.map(opt => {
                  const selected = selectedOptionId === opt.optionId;
                  return (
                    <OptionRow
                      key={opt.optionId}
                      opt={opt}
                      selected={selected}
                      onPress={() => chooseAnswer(q.questionId, opt.optionId)}
                      theme={theme}
                      disabled={!!isFilled}
                    />
                  );
                })}
              </View>
            );
          })}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <FlatList
        data={
          feedbackData
            ? feedbackData.sectionDTOList.filter(sec => sec.active === 1)
            : []
        }
        renderItem={renderSection}
        keyExtractor={item => item.sectionId.toString()}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.tint}
            colors={[theme.tint]}
          />
        }
      />

      {bulkModalVisible && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.8)",
            justifyContent: "center",
            alignItems: "center",
            padding: 20
          }}
        >
          <View
            style={{
              width: "100%",
              backgroundColor: theme.background,
              padding: 20,
              borderRadius: 12
            }}
          >
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: "600", marginBottom: 14 }}>
              Fill All Courses With:
            </Text>

            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              {[1, 2, 3, 4, 5].map(n => (
                <TouchableOpacity
                  key={n}
                  onPress={() => setBulkValue(n)}
                  style={{
                    padding: 12,
                    backgroundColor: bulkValue === n ? theme.tint : "#ccc",
                    borderRadius: 8,
                    width: 48,
                    alignItems: "center"
                  }}
                >
                  <Text style={{ color: bulkValue === n ? "#000" : "#333", fontSize: 16 }}>
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => {
                setBulkModalVisible(false);
                handleFillAndSubmitAll(bulkValue);
              }}
              style={{
                marginTop: 20,
                backgroundColor: theme.tint,
                padding: 12,
                borderRadius: 8,
                alignItems: "center"
              }}
            >
              <Text style={{ color: "#000", fontWeight: "600" }}>Submit All</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setBulkModalVisible(false)}
              style={{
                marginTop: 10,
                padding: 10,
                alignItems: "center"
              }}
            >
              <Text style={{ color: theme.text }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  header: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  headerSmall: { fontSize: 16, fontWeight: "600", marginBottom: 10 },
  dropdown: { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  dropdownList: { marginBottom: 16, borderRadius: 12, overflow: "hidden" },
  disabledBtn: {
    opacity: 0.4,
  },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 0.4, borderColor: "#00000020" },
  row: { flexDirection: "row", gap: 10, marginBottom: 12 },
  numberBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  saveBtn: { paddingVertical: 12, borderRadius: 10, alignItems: "center", marginTop: 6 },
  sectionHeader: { fontSize: 18, fontWeight: "700", marginBottom: 14 },
  sectionName: { fontSize: 16, fontWeight: "600", marginBottom: 10 },
  questionBox: { marginBottom: 18 },
  questionText: { fontSize: 15, marginBottom: 10 },
  optionRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  center: { alignItems: "center", paddingVertical: 20 },
  
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
