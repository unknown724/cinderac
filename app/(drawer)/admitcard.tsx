import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  useColorScheme,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/theme";
import { getAdmitCard } from "@/lib/api";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

export default function AdmitCardPage() {
  const scheme = useColorScheme() ?? "dark";
  const theme = Colors[scheme];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string>("");
  
  // State to hold the file URL and download status
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const loadCard = async () => {
    try {
      const res = await getAdmitCard();

      if (res.flag === 0 || !res.data) {
        setMessage(res?.message?.[0]?.msg ?? "Admit card not available");
        setDownloadUrl(null);
      } else {
        setMessage("Admit card available");
        // Assuming res.data contains the valid URL string
        setDownloadUrl(res.data);
      }
    } catch (err) {
      setMessage("Failed to load admit card");
      setDownloadUrl(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCard();
  }, []);

  const handleDownload = async () => {
    if (!downloadUrl) return;

    setIsDownloading(true);
    try {
      // 1. Create a local file URI (assuming PDF, but works for others)
      const filename = "AdmitCard.pdf";
      const fileUri = FileSystem.documentDirectory + filename;

      // 2. Check if file already exists locally
      const fileInfo = await FileSystem.getInfoAsync(fileUri);

      let finalUri = fileUri;

      if (!fileInfo.exists) {
        // 3. Download the file from the remote URL only if it doesn't exist
        const downloadRes = await FileSystem.downloadAsync(downloadUrl, fileUri);
        finalUri = downloadRes.uri;
      }

      // 4. Share/Save the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(finalUri);
      } else {
        Alert.alert("Error", "Sharing is not available on this device");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to download the admit card. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.background }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadCard();
          }}
          tintColor={theme.tint}
        />
      }
      contentContainerStyle={{ padding: 20 }}
    >
      <Text style={[styles.title, { color: theme.text }]}>Admit Card</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.tint} />
        </View>
      ) : (
        <>
          {/* Show API message */}
          <Text style={[styles.message, { color: theme.text }]}>{message}</Text>

          {/* Download Button */}
          <TouchableOpacity
            style={[
              styles.btn,
              { backgroundColor: theme.tint },
              (message !== "Admit card available" || !downloadUrl) && styles.disabledBtn,
            ]}
            activeOpacity={message === "Admit card available" ? 0.8 : 1}
            disabled={message !== "Admit card available" || !downloadUrl || isDownloading}
            onPress={handleDownload}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color="#1B1F2F" style={{ marginRight: 6 }} />
            ) : (
              <Ionicons name="download" size={18} color="#1B1F2F" style={{ marginRight: 6 }} />
            )}
            <Text style={styles.btnText}>
              {isDownloading ? "Opening..." : "Download"}
            </Text>
          </TouchableOpacity>

          {/* Share Button (Reusing the download logic as Sharing handles both) */}
          <TouchableOpacity
            style={[
              styles.btn,
              { backgroundColor: "#6C5CE7" },
              (message !== "Admit card available" || !downloadUrl) && styles.disabledBtn,
            ]}
            activeOpacity={message === "Admit card available" ? 0.8 : 1}
            disabled={message !== "Admit card available" || !downloadUrl || isDownloading}
            onPress={handleDownload}
          >
            <Ionicons name="share-social" size={18} color="#1B1F2F" style={{ marginRight: 6 }} />
            <Text style={styles.btnText}>Share</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: "700", marginBottom: 20 },
  center: { alignItems: "center", marginTop: 30 },
  message: { fontSize: 16, marginBottom: 20 },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  disabledBtn: {
    opacity: 0.4,
  },
  btnText: {
    color: "#1B1F2F",
    fontWeight: "700",
    fontSize: 16,
  },
});
