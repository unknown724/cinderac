import axios from "axios";
import useAuthStore from "@/store/useAuthStore";
import type { Course, SetDTO } from "@/constants/types";
import { Platform } from "react-native";

const api = axios.create({
  baseURL: "https://nerist.symphonyx.in",
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
    "Authorization": "", // default blank — will be replaced by interceptor
  },
});

// ✅ Automatically inject token into every request
api.interceptors.request.use(
  async (config) => {
    const token = useAuthStore.getState().token;
    if (token) config.headers.Authorization = token;
    return config;
  },
  (error) => Promise.reject(error)
);
// ✅ Step 1: Get the temporary service token
export async function initializeServiceToken() {
  try {
    const res = await api.get("/api/slmCore/getServiceUrls");
    const token = res.headers.authorization || res.data?.token;

    if (token) {
      useAuthStore.getState().setToken(token);
    } else {
      console.warn("⚠️ No token found in getServiceUrls response");
    }
  } catch (err) {
    console.error("❌ Failed to fetch service token:", err);
  }
}

// ✅ Step 2: After login — refresh token & fetch dashboard user
export async function fetchUserDashboard() {
  try {
    const token = useAuthStore.getState().token;
    if (!token) throw new Error("⚠️ Missing token — please log in first.");

    // Make the dashboard call
    const res = await api.get(`/api/dashboard?campusId=3`, {
      headers: { Authorization: token },
    });

    const academic = res.data?.data.academicSessionModels;
    const user = res.data?.data.userModel;
    useAuthStore.getState().setAcademicSession(academic[0]);

    if (user) {
      // store in Zustand so you can access across app
      useAuthStore.getState().setAuth(user, token);
      return user;
    } else {
      console.warn("⚠️ No userModel found in dashboard response");
      return null;
    }
  } catch (err) {
    console.error("❌ fetchUserDashboard failed:", err);
    throw err;
  }
}

export async function fetchTimeTable({ dateEnd, dateStart }: { dateEnd: string, dateStart: string }) {
  try {
    const { classes } = useAuthStore.getState();
    const token = useAuthStore.getState().token;
    if (classes[0] == null) await getClassList()

    if (!token) throw new Error("⚠️ Missing token — please log in first.");
    const extractedIds = classes.map((item) => item.classroomGeneratedId);

    const payload = {
      collegeIds: [3],
      classroomGeneratedIds: extractedIds,
      dateEndTimeTo: dateEnd,
      dateStartTimeFrom: dateStart,
      fetchAttendance: true,
      fetchCurrentStudentAttendance: true,
      filterParamModel: {
        multiSearch: [],
        sortAsc: true,
        sortField: 6
      },
      forStudent: true
    };

    const res = await api.post(
      "/api/lecturePlan?getOtherSchedules=true",
      payload,
      {
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
      }
    );

    return res;
  } catch (err) {
    console.error("❌ fetch time table failed:", err);
    throw err;
  }
}

export async function fetchFeedBackCourseDtls() {
  const { user, campusId, academicSession } = useAuthStore.getState();
  const token = useAuthStore.getState().token;

  const payload = {
    academicYear: academicSession.year,
    assignmentType: 0,
    campusId: campusId || 3,
    collegeId: user.collegeId,
    instId: user.instituteId,
    semester: 1,
    studentId: user.userId,
  };

  const res = await api.post("/api/slmFeedback/getStuCourseDtls", payload, {
    headers: { Authorization: token },
  });

  return res;
}

export async function fetchFeedBackStudentFeedback({ assignmentType, courseId, facultyId }: { assignmentType: number, courseId: string, facultyId: string }) {
  try {
    const { user, campusId, academicSession } = useAuthStore.getState();
    const token = useAuthStore.getState().token;

    if (!token) throw new Error("⚠️ Missing token — please log in first.");

    const payload = {
      academicYear: academicSession.year,
      assignmentType: assignmentType,
      campusId: campusId || 3,
      collegeId: user.collegeId || 3,
      courseId: courseId || null,
      facultyId: facultyId || null,
      instId: user.instituteId,
      semester: 1,
      studentId: user.userId
    };

    const res = await api.post(
      "/api/slmFeedback/getStuFdbck",
      payload,
      {
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
      }
    );

    const courseData = res.data?.data
    useAuthStore.getState().setSelectedCourseData(courseData);

    return res;
  } catch (err) {
    console.error("❌ fetchStudentFeedBack failed:", err);
    throw err;
  }
}

export async function saveFeedBackStudentFeedback(payload) {
  const token = useAuthStore.getState().token;

  const res = await api.post(
    "/api/slmFeedback/saveStuFdbck",
    payload,
    {
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
    }
  );

  // console.log(JSON.stringify(payload, null,2))
  return res.data;
}

export async function getAdmitCard() {
  try {
    const { campusId, user, token } = useAuthStore.getState();

    if (!token) throw new Error("Missing token");

    const url = `/api/slmExamSchedule/generateAdmitCard?instId=${user.instituteId}&studentId=${user.userId}&collegeId=${user.collegeId}&campusId=${campusId}`;

    const res = await api.post(url, {
      headers: { Authorization: token }
    });

    return res.data;
  } catch (err) {
    console.error("❌ getAdmitCard failed:", err);
    throw err;
  }
}

export const deleteStudentLeave = async (leaveData: any) => {
  try {
    const { user, token, campusId } = useAuthStore.getState();
    if (!token) throw new Error("Missing token");

    const payload = {
      instId: user.instituteId || 1,
      campusId: campusId || 3,
      collegeId: user.collegeId || 3,
      sessionId: user.sessionId || 2511,
      studentId: user.userId,
      srNo: leaveData.srNo,
      status: leaveData.status,
    };

    const res = await axios.post(
      "https://nerist.symphonyx.in/api/slmStudent/deleteLeaves",
      payload,
      {
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
      }
    );

    return res.data;
  } catch (err) {
    console.error("❌ Delete leave failed:", err);
    throw err;
  }
};

export async function fetchFaculties() {
  try {
    const { campusId } = useAuthStore.getState();
    const token = useAuthStore.getState().token;

    if (!token) throw new Error("⚠️ Missing token — please log in first.");

    const payload = {
      collegeIds: [3],
      campusId: campusId || 3,
      facultyIds: [],
      filterParamModel: {
        multiSearch: [],
        sortAsc: true,
        sortField: 0,
        offset: 0,
        pageSize: -1,
      }
    };

    const res = await api.post(
      "/api/user/faculty",
      payload,
      {
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
      }
    );

    return res;
  } catch (err) {
    console.error("❌ fetch favulty Results failed:", err);
    throw err;
  }
}

export const uploadFileToTemp = async (file: any) => {
  try {
    const { user, token } = useAuthStore.getState();
    if (!token) throw new Error("Missing token");

    const instId = user?.instituteId || 1;

    // Create FormData
    const formData = new FormData();
    formData.append("file", {
      uri: Platform.OS === "ios" ? file.uri.replace("file://", "") : file.uri,
      name: file.name || "upload.pdf",
      type: file.mimeType || "application/pdf",
    } as any);

    const res = await axios.post(
      `https://nerist.symphonyx.in/api/slmCore/uploadFileToTemp?instId=${instId}`,
      formData,
      {
        headers: {
          Authorization: token,
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return res.data;
  } catch (err) {
    console.error("❌ File upload failed:", err);
    throw err;
  }
};

// 2. Apply Leave Function
export const applyStudentLeave = async (leaveData: any) => {
  try {
    const { user, token, campusId } = useAuthStore.getState();
    if (!token) throw new Error("Missing token");

    const payload = {
      instId: user.instituteId || 1,
      campusId: campusId || 3,
      collegeId: user.collegeId || 3,
      sessionId: user.sessionId || 2511,
      studentId: user.userId,
      applierId: user.userId,
      reqType: 1, // Hardcoded based on your request payload
      userType: 2, // Hardcoded based on your request payload
      leaveType: "6", // Defaulting to 6 (Medical/General) as per example
      ...leaveData,
    };

    const res = await axios.post(
      "https://nerist.symphonyx.in/api/slmStudent/applyLeaves",
      payload,
      {
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
      }
    );

    return res.data;
  } catch (err) {
    console.error("❌ Apply leave failed:", err);
    throw err;
  }
};

export async function fetchLeave() {
  try {
    const { campusId, user, academicSession } = useAuthStore.getState();
    const token = useAuthStore.getState().token;

    if (!token) throw new Error("⚠️ Missing token — please log in first.");

    const payload = {
      campusId: campusId || 3,
      collegeId: user.collegeId || 3,
      instId: user.instituteId || 1,
      sessionId: academicSession.sessionId,
      studentId: user.userId,
    };

    const res = await api.post(
      "/api/slmStudent/fetchLeaves",
      payload,
      {
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
      }
    );

    return res;
  } catch (err) {
    console.error("❌ fetch leave failed:", err);
    throw err;
  }
}

export async function fetchStudents() {
  try {
    const { campusId } = useAuthStore.getState();
    const token = useAuthStore.getState().token;

    if (!token) throw new Error("⚠️ Missing token — please log in first.");

    const payload = {
      activeStatus: true,
      campusId: campusId || 3,
      studentIds: [],
    };

    const res = await api.post(
      "/api/user/student",
      payload,
      {
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
      }
    );

    return res;
  } catch (err) {
    console.error("❌ fetchExamResults failed:", err);
    throw err;
  }
}

export async function fetchExamResults({ semester }: { semester: number }) {
  try {
    const { campusId, instituteId, user, academicSession } = useAuthStore.getState();
    const token = useAuthStore.getState().token;

    if (!token) throw new Error("⚠️ Missing token — please log in first.");

    const payload = {
      instituteId: instituteId || 1,
      campusId: campusId || 3,
      semester: String(semester),
      selectedStuIds: [String(user.userId)], // ensure string
      userType: 2,
      sessionId: String(academicSession.sessionId - 1)
    };
    console.log(payload)

    const res = await api.post(
      "/api/slmResult/student/getStudentResult",
      payload,
      {
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
      }
    );

    return res;
  } catch (err) {
    console.error("❌ fetchExamResults failed:", err);
    throw err;
  }
}

// ✅ Step 3: Login & automatically refresh token afterward
export async function loginUser({ regId, password }: { regId: string; password: string }) {
  try {
    const { campusId, instituteId } = useAuthStore.getState()

    // Login API request — must match curl body
    const res = await api.post("/login/verify/password", {
      instituteId,
      campusId,
      loginId: regId,
      password,
    });

    // After login, get new token (refresh session)
    const newToken = res.headers.authorization || res.data?.token;
    if (newToken) {
      useAuthStore.getState().setToken(newToken);
    }

    return res;
  } catch (err) {
    console.error("❌ loginUser failed:", err);
    throw err;
  }
}

export async function getClassList() {
  try {
    const token = useAuthStore.getState().token;
    if (!token) throw new Error("⚠️ Missing token — please log in first.");

    const res = await api.get("/api/classroom/linked", {
      headers: { Authorization: token },
    });

    const classList = res.data?.data || [];
    useAuthStore.getState().setClasses(classList);

    return classList;
  } catch (err) {
    console.error("❌ getClassList failed:", err);
    throw err;
  }
}

export async function getAttendanceStatsForAllSubjects() {
  try {
    const { token, classes, user } = useAuthStore.getState();
    if (!token) throw new Error("⚠️ Missing token — please log in first.");
    if (!classes || classes.length === 0)
      throw new Error("⚠️ No classes found — call getClassList() first.");

    const studentId =
      user?.userId ||
      user?.studentId ||
      classes[0]?.classroomStudentLinkingModels?.[0]?.studentId;

    const academicSessionId = classes[0]?.academicSessionId;

    if (!studentId || !academicSessionId)
      throw new Error("⚠️ Missing studentId or academicSessionId.");

    // Build all API requests concurrently
    const requests = classes.map((cls) =>
      api.get(
        `/api/attendance/studentclassroomStatsTillDate?studentIds=${encodeURIComponent(
          studentId
        )}&academicSessionId=${academicSessionId}&classroomGeneratedIds=${cls.classroomGeneratedId}`,
        { headers: { Authorization: token } }
      )
    );

    const results = await Promise.allSettled(requests);

    // Merge successful results
    let attendanceData = results
      .filter((r) => r.status === "fulfilled")
      .flatMap((r: any) => r.value.data?.data || [])
      .map((record) => {
        // Find matching subject info by classroomGeneratedId
        const cls = classes.find(
          (c) => c.classroomGeneratedId === record.classroomGeneratedId
        );
        return {
          ...record,
          courseName: cls?.courseName || "Unknown",
          courseId: cls?.courseId || "N/A",
          classroomGeneratedId: record.classroomGeneratedId,
        };
      });

    // ✅ Remove duplicates (by classroomGeneratedId or courseId)
    const seenIds = new Set<number>();
    const seenCourses = new Set<string>();
    attendanceData = attendanceData.filter((item) => {
      const isDuplicate =
        seenIds.has(item.classroomGeneratedId) ||
        seenCourses.has(item.courseId);
      if (!isDuplicate) {
        seenIds.add(item.classroomGeneratedId);
        seenCourses.add(item.courseId);
        return true;
      }
      return false;
    });

    // ✅ Remove entries with 0/0 theory classes
    attendanceData = attendanceData.filter(
      (a) => !(a.theoryClassCount === 0 && a.attendedTheoryClassCount === 0)
    );

    // ✅ Store in Zustand
    useAuthStore.getState().setAttendance(attendanceData);

    return attendanceData;
  } catch (err) {
    console.error("❌ getAttendanceStatsForAllSubjects failed:", err);
    throw err;
  }
}

export async function computeAndStoreCGPA() {
  try {
    const { user, setCGPA } = useAuthStore.getState();
    const currentSem = user?.currentStage || 1;

    let totalQP = 0;   // quality points
    let totalCredits = 0;

    for (let sem = 1; sem <= currentSem; sem++) {
      const res: any = await fetchExamResults({ semester: sem });
      const data = res?.data?.data;
      if (!data) continue;

      const sgpa = Number(data.sgpa) || 0;
      const credits = data.studentResultList?.reduce(
        (sum: number, s: any) => sum + (s.credit || 0),
        0
      ) || 0;

      totalQP += sgpa * credits;
      totalCredits += credits;
    }

    const cgpa = totalCredits === 0 ? 0 : Number((totalQP / totalCredits).toFixed(2));

    // Save in Zustand
    setCGPA(cgpa);

    return cgpa;
  } catch (err) {
    console.error("❌ CGPA computation failed:", err);
    return null;
  }
}
export default api;
