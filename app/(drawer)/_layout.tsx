import React from "react";
import {
  View,
  Text,
  Platform,
  Image,
  TouchableOpacity,
  Linking,
} from "react-native";
import { Drawer } from "expo-router/drawer";
import {
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";
import { useColorScheme as useSystemColorScheme } from "react-native";
import { Colors } from "@/constants/theme";
import { useSettingsStore } from "@/store/useSettingsStore";
import useAuthStore from "@/store/useAuthStore";
import { Ionicons } from "@expo/vector-icons";

/* ----------------------------- */
/* Custom Drawer Content         */
/* ----------------------------- */
function CustomDrawerContent(props: any) {
  const { theme, scheme, navigation } = props;
  const { user, logout } = useAuthStore();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={{ paddingTop: 0 }}
      >
        {/* CLICKABLE PROFILE HEADER */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => navigation.navigate("profile")}
        >
          <View
            style={{
              padding: 20,
              paddingTop: Platform.OS === "android" ? 40 : 50,
              backgroundColor: theme.tint,
              marginBottom: 10,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: "rgba(255,255,255,0.2)",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: "rgba(255,255,255,0.3)",
                }}
              >
                <Image
                  source={{
                    uri:
                      user?.photoPath ||
                      "https://placehold.co/120x120/png?text=User",
                  }}
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                  }}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: "#fff",
                    fontSize: 16,
                    fontWeight: "bold",
                  }}
                >
                  {user?.fullName || "Guest User"}
                </Text>

                <Text
                  style={{
                    color: "rgba(255,255,255,0.8)",
                    fontSize: 12,
                  }}
                >
                  {user?.userId || "No ID"}
                </Text>

                <Text
                  style={{
                    color: "rgba(255,255,255,0.8)",
                    fontSize: 12,
                  }}
                >
                  {user?.enrollmentNumber || "No ID"}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* DRAWER ITEMS */}
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      {/* FOOTER */}
      <View
        style={{
          padding: 20,
          borderTopWidth: 1,
          borderTopColor: scheme === "dark" ? "#333" : "#e0e0e0",
        }}
      >
        {/* LOGOUT BUTTON */}
        <TouchableOpacity
          onPress={logout}
          activeOpacity={0.7}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 12,
            borderRadius: 8,
            backgroundColor: scheme === "dark" ? "#2a2a2a" : "#f5f5f5",
            marginBottom: 14,
          }}
        >
          <Ionicons
            name="log-out-outline"
            size={18}
            color="#e53935"
            style={{ marginRight: 8 }}
          />
          <Text
            style={{
              color: "#e53935",
              fontSize: 14,
              fontWeight: "600",
            }}
          >
            Logout
          </Text>
        </TouchableOpacity>

        {/* APP INFO */}
        <Text
          style={{
            color: theme.icon,
            fontSize: 11,
            marginBottom: 6,
            textAlign: "center",
          }}
        >
          Cinderac Not SymphonyX v1.1.0
        </Text>

        <TouchableOpacity
          onPress={() => Linking.openURL("mailto:tulpachk@gmail.com")}
        >
          <Text
            style={{
              color: theme.tint,
              fontSize: 12,
              fontWeight: "600",
              textAlign: "center",
            }}
          >
            Contact: tulpachk@gmail.com
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ----------------------------- */
/* Drawer Layout                 */
/* ----------------------------- */
export default function DrawerLayout() {
  const systemScheme = useSystemColorScheme();
  const { themeMode } = useSettingsStore();

  const scheme =
    themeMode === "system" ? systemScheme ?? "light" : themeMode;

  const theme = Colors[scheme];

  return (
    <Drawer
      drawerContent={(props) => (
        <CustomDrawerContent {...props} theme={theme} scheme={scheme} />
      )}
      screenOptions={{
        headerStyle: {
          backgroundColor: scheme === "dark" ? "#1a1a1a" : "#f2f2f2",
        },
        headerTintColor: scheme === "dark" ? "#fff" : "#000",
        headerTitleStyle: { fontWeight: "600" },

        drawerActiveTintColor: theme.tint,
        drawerInactiveTintColor: theme.icon,
        drawerActiveBackgroundColor:
          scheme === "dark" ? "#333" : "#e6f0ff",

        drawerStyle: {
          backgroundColor: theme.background,
          borderRightWidth: 0,
          width: "75%",
        },

        drawerLabelStyle: {
          fontSize: 14,
          fontWeight: "500",
          marginLeft: -10,
        },

        drawerItemStyle: {
          borderRadius: 8,
          marginHorizontal: 10,
          marginVertical: 2,
        },
      }}
    >
      <Drawer.Screen
        name="profile"
        options={{
          title: "Profile",
          drawerLabel: "Profile",
          drawerIcon: ({ color }) => (
            <Ionicons name="person-outline" size={20} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="attendance"
        options={{
          title: "Attendance",
          drawerLabel: "Attendance",
          drawerIcon: ({ color }) => (
            <Ionicons name="calendar-outline" size={20} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="exams"
        options={{
          title: "Exam Result",
          drawerLabel: "Exam Result",
          drawerIcon: ({ color }) => (
            <Ionicons name="school-outline" size={20} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="admitcard"
        options={{
          title: "Admit Card",
          drawerLabel: "Admit Card",
          drawerIcon: ({ color }) => (
            <Ionicons name="card-outline" size={20} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="timetable"
        options={{
          title: "Time Table",
          drawerLabel: "Time Table",
          drawerIcon: ({ color }) => (
            <Ionicons name="time-outline" size={20} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="timetablegrid"
        options={{
          title: "Time Table (Grid)",
          drawerLabel: "Time Table (Grid)",
          drawerIcon: ({ color }) => (
            <Ionicons name="grid-outline" size={20} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="fetch"
        options={{
          title: "Fetch Leave",
          drawerLabel: "Fetch Leave",
          drawerIcon: ({ color }) => (
            <Ionicons
              name="cloud-download-outline"
              size={20}
              color={color}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="feedback"
        options={{
          title: "Feedback",
          drawerLabel: "Feedback",
          drawerIcon: ({ color }) => (
            <Ionicons
              name="chatbox-ellipses-outline"
              size={20}
              color={color}
            />
          ),
        }}
      />

      <Drawer.Screen
        name="settings"
        options={{
          title: "Settings",
          drawerLabel: "Settings",
          drawerIcon: ({ color }) => (
            <Ionicons name="settings-outline" size={20} color={color} />
          ),
        }}
      />
    </Drawer>
  );
}
