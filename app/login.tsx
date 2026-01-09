import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme as useSystemColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// Platform-specific SecureStore
import * as SecureStoreWeb from "@/lib/secureStore.web";
import * as SecureStoreNative from "expo-secure-store";
const SecureStore = Platform.OS === 'web' ? SecureStoreWeb : SecureStoreNative;

import { Colors } from "@/constants/theme";
import { fetchUserDashboard, loginUser } from "@/lib/api";
import useAuthStore from "@/store/useAuthStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { router } from "expo-router";

const STORAGE_KEY_REGID = "secureRegId";
const STORAGE_KEY_PASS = "securePassword";

export default function LoginScreen() {
  const systemScheme = useSystemColorScheme();
  const { themeMode, landingPage } = useSettingsStore();
  const colorScheme = themeMode === 'system' ? (systemScheme || 'light') : themeMode;
  const theme = Colors[colorScheme];

  const [regId, setRegId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // --- Animation Values ---
  const [showSlowWarning, setShowSlowWarning] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current; // For Toast Opacity
  const toastShakeAnim = useRef(new Animated.Value(0)).current; // For Toast Wiggle

  const logoFloatAnim = useRef(new Animated.Value(0)).current; // For Logo breathing
  const entranceAnim = useRef(new Animated.Value(0)).current; // For form slide up
  const shakeAnim = useRef(new Animated.Value(0)).current; // For error shake

  const { setAuth, setToken } = useAuthStore.getState();

  // --- Animation Effects ---
  useEffect(() => {
    // 1. Entrance Animation (Fade in + Slide Up)
    Animated.timing(entranceAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
      easing: Easing.out(Easing.exp),
    }).start();

    // 2. Logo Floating Loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoFloatAnim, {
          toValue: -10, // Float up
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(logoFloatAnim, {
          toValue: 0, // Float down
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Trigger Shake on Error (Form fields)
  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

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

  useEffect(() => {
    const autoLogin = async () => {
      try {
        const savedRegId = await SecureStore.getItemAsync(STORAGE_KEY_REGID);
        const savedPassword = await SecureStore.getItemAsync(STORAGE_KEY_PASS);
        if (savedRegId && savedPassword) {
          setRegId(savedRegId);
          setPassword(savedPassword);
          setRemember(true);
          await handleLogin(savedRegId, savedPassword, true);
        }
      } catch (err) { }
    };
    autoLogin();
  }, []);

  const handleLogin = async (
    inputRegId?: string,
    inputPassword?: string,
    silent = false
  ) => {
    if (!silent) setErrorMsg("");
    setLoading(true);

    const reg = inputRegId ?? regId;
    const pass = inputPassword ?? password;

    try {
      let res = await loginUser({ regId: reg, password: pass });
      // console.log(res);
      res = res.data;

      if (res && (res.status === false || res.flag === 0)) {
        const apiMessage = res.message && res.message.length > 0
          ? res.message[0]
          : "Invalid credentials";
        throw new Error(apiMessage);
      }

      const newToken = res.token;
      if (!newToken) throw new Error("Invalid response from server");

      setToken(newToken);

      try {
        const user = await fetchUserDashboard();
        if (!user) throw new Error("User data not found");

        setAuth(user, newToken);

        if (remember) {
          await SecureStore.setItemAsync(STORAGE_KEY_REGID, reg);
          await SecureStore.setItemAsync(STORAGE_KEY_PASS, pass);
        } else {
          await SecureStore.deleteItemAsync(STORAGE_KEY_REGID);
          await SecureStore.deleteItemAsync(STORAGE_KEY_PASS);
        }

        router.replace(landingPage as any);

      } catch (fetchError) {
        console.error("Dashboard fetch failed:", fetchError);
        throw new Error("Server is not responding. Please try again later.");
      }

    } catch (err: any) {
      if (!silent) {
        setErrorMsg(err.message || "An unexpected error occurred");
        triggerShake(); // Form shake
      }
    } finally {
      setLoading(false);
    }
  };

  // Interpolate entrance animation values
  const containerOpacity = entranceAnim;
  const containerTranslateY = entranceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0], // Slide up by 50px
  });

  // Interpolate Toast Slide Up
  const toastTranslateY = fadeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0]
  });

  return (
    <LinearGradient
      colors={
        colorScheme === "dark"
          ? ["#0f172a", "#1e293b"]
          : ["#f0faff", "#d9f2ff"]
      }
      style={styles.gradient}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={{ paddingVertical: 40, flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.container}>
              {/* Animated Logo */}
              <Animated.View style={{ transform: [{ translateY: logoFloatAnim }] }}>
                <Image
                  source={require("@/assets/images/adaptive-icon.png")}
                  style={styles.logo}
                  contentFit="contain"
                />
              </Animated.View>

              {/* Main Content with Entrance & Shake Animations */}
              <Animated.View
                style={[
                  styles.formContainer,
                  {
                    opacity: containerOpacity,
                    transform: [
                      { translateY: containerTranslateY },
                      { translateX: shakeAnim } // Apply shake here
                    ],
                  },
                ]}
              >
                {/* Title */}
                <Text style={[styles.title, { color: theme.text }]}>
                  Welcome Back
                </Text>
                <Text style={[styles.subtitle, { color: theme.icon }]}>
                  Login to continue
                </Text>

                {/* Registration ID */}
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: theme.text,
                      backgroundColor:
                        colorScheme === "dark"
                          ? "rgba(255,255,255,0.08)"
                          : "#ffffff",
                      borderColor:
                        colorScheme === "light" ? "#cbd5e1" : "transparent",
                      borderWidth: colorScheme === "light" ? 1 : 0,
                    },
                  ]}
                  placeholder="Registration ID"
                  placeholderTextColor={theme.icon}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={regId}
                  onChangeText={setRegId}
                />

                {/* Password */}
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[
                      styles.input,
                      styles.passwordInput,
                      {
                        color: theme.text,
                        backgroundColor:
                          colorScheme === "dark"
                            ? "rgba(255,255,255,0.08)"
                            : "#ffffff",
                        borderColor:
                          colorScheme === "light" ? "#cbd5e1" : "transparent",
                        borderWidth: colorScheme === "light" ? 1 : 0,
                      },
                    ]}
                    placeholder="Password"
                    placeholderTextColor={theme.icon}
                    secureTextEntry={!showPassword}
                    value={password}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={setPassword}
                  />

                  <TouchableOpacity
                    onPress={() => setShowPassword((prev) => !prev)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={22}
                      color={theme.text}
                    />
                  </TouchableOpacity>
                </View>

                {/* Error Message */}
                {errorMsg ? (
                  <Text style={styles.errorText}>{errorMsg}</Text>
                ) : null}

                {/* Remember Me */}
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setRemember(!remember)}
                >
                  <Ionicons
                    name={remember ? "checkbox" : "square-outline"}
                    size={20}
                    color={theme.text}
                  />
                  <Text style={[styles.rememberText, { color: theme.text }]}>
                    Remember Me
                  </Text>
                </TouchableOpacity>

                {/* Login Button */}
                <TouchableOpacity
                  style={[
                    styles.loginButton,
                    {
                      backgroundColor: theme.tint,
                    },
                  ]}
                  onPress={() => handleLogin()}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.loginBtnText}>Login</Text>
                  )}
                </TouchableOpacity>

                {/* Footer */}
                <View style={{ marginTop: 30 }}>
                  <Text style={[styles.footerText, { color: theme.icon }]}>
                    NERIST NOT SymphonyX
                  </Text>
                </View>
              </Animated.View>
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

        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },

  container: {
    alignItems: "center",
    paddingHorizontal: 24,
  },

  formContainer: {
    width: '100%',
    alignItems: 'center',
  },

  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 24,
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 14,
    marginBottom: 30,
  },

  input: {
    width: "100%",
    borderRadius: 12,
    padding: 14,
    marginBottom: 15,
    fontSize: 15,
  },

  passwordContainer: {
    width: "100%",
    justifyContent: "center",
  },

  passwordInput: { paddingRight: 45 },

  eyeIcon: {
    position: "absolute",
    right: 16,
    top: 16,
  },

  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 20,
  },

  rememberText: {
    marginLeft: 8,
    fontSize: 14,
  },

  loginButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  loginBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  errorText: {
    color: "#ff6b6b",
    textAlign: "center",
    marginBottom: 10,
  },

  footerText: {
    fontSize: 13,
    opacity: 0.7,
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
