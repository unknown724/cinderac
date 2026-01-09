import { create } from "zustand";
import { persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Course, SetDTO } from "@/constants/types";

interface AuthState {
  user: any | null;
  token: string | null;
  classes: any[];
  academicSession: any,
  attendance: any[];
  campusId: number;
  instituteId: number;
  allowedUser: Array<string>,
  cgpa: number | null;                 // ✅ added CGPA
  faculties: Array<any>;
  selectedCourseData: SetDTO | null;
  coursesDtls: Course[];
  sessionId: number;

  setSessionId: (sessionId: number) => void;
  setAcademicSession: (academicSession: {}) => void;
  setSelectedCourseData: (dto: SetDTO | null) => void;
  setCoursesDtls: (list: Course[]) => void;
  setFaculties: (faculties: Array<any>) => void;
  setAuth: (user: any, token: string) => void;
  setToken: (token: string) => void;
  setClasses: (classes: any[]) => void;
  setAttendance: (attendance: any[]) => void;
  setCGPA: (cgpa: number) => void;      // ✅ CGPA setter

  clearAuth: () => void;
}

const storage = {
  getItem: async (name: string) => {
    const value = await AsyncStorage.getItem(name);
    return value ? JSON.parse(value) : null;
  },
  setItem: async (name: string, value: any) => {
    await AsyncStorage.setItem(name, JSON.stringify(value));
  },
  removeItem: async (name: string) => {
    await AsyncStorage.removeItem(name);
  },
};

const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      campusId: 3,
      instituteId: 1,
      allowedUser: [
        "223/146",
      ],
      classes: [],
      attendance: [],
      cgpa: null,                     // ⭐ persisted CGPA
      faculties: [],
      coursesDtls: [],
      selectedCourseData: null,
      academicSession: {},
      sessionId: null,

      setSessionId: (sessionId) => set({ sessionId}),
      setSelectedCourseData: (selectedCourseData) =>
        set({ selectedCourseData }),
      setAcademicSession: (academicSession) => set({ academicSession }),
      setCoursesDtls: (coursesDtls) => set({ coursesDtls }),
      setFaculties: (faculties) => set({ faculties }),
      setAuth: (user, token) => set({ user, token }),
      setToken: (token) => set({ token }),
      setClasses: (classes) => set({ classes }),
      setAttendance: (attendance) => set({ attendance }),

      setCGPA: (cgpa) => set({ cgpa }),     // ⭐ CGPA setter

      clearAuth: () =>
        set({
          user: null,
          token: null,
          classes: [],
          attendance: [],
          cgpa: null,                   // ⭐ clear CGPA on logout
        }),
    }),
    {
      name: "auth-storage",
      storage,
    }
  )
);

export default useAuthStore;
