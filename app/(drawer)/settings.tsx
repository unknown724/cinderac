import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  useColorScheme as useSystemColorScheme,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useSettingsStore } from '@/store/useSettingsStore';

// Updated Landing Page Options matching your Drawer
const LANDING_OPTIONS = [
  { label: 'Dashboard / Profile', value: '/profile', icon: 'person' },
  { label: 'Attendance', value: '/attendance', icon: 'calendar' },
  { label: 'Exam Result', value: '/exams', icon: 'school' },
  { label: 'Admit Card', value: '/admitcard', icon: 'card' },
  { label: 'Time Table', value: '/timetable', icon: 'time' },
  { label: 'Time Table (Grid)', value: '/timetablegrid', icon: 'grid' },
  { label: 'Fetch Leave', value: '/fetch', icon: 'cloud-download' },
  { label: 'Feedback', value: '/feedback', icon: 'chatbox-ellipses' },
];

export default function SettingsPage() {
  // --- Theme Logic ---
  const systemScheme = useSystemColorScheme();
  const { themeMode, landingPage, setThemeMode, setLandingPage } = useSettingsStore();
  
  // Resolve actual current theme for UI rendering
  const currentScheme = themeMode === 'system' ? (systemScheme ?? 'light') : themeMode;
  const theme = Colors[currentScheme];
  
  const [modalVisible, setModalVisible] = useState(false);

  // Helper to get label for current selection
  const currentLandingLabel = LANDING_OPTIONS.find(o => o.value === landingPage)?.label || 'Dashboard / Profile';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        
        {/* --- HEADER --- */}
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
        <Text style={[styles.headerSubtitle, { color: theme.icon }]}>Preferences & Customization</Text>

        {/* --- SECTION: APPEARANCE --- */}
        <View style={[styles.section, { backgroundColor: currentScheme === 'dark' ? '#ffffff08' : '#f5f5f5' }]}>
          <Text style={[styles.sectionTitle, { color: theme.tint }]}>APPEARANCE</Text>
          
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="moon" size={20} color={theme.text} />
                <Text style={[styles.rowLabel, { color: theme.text }]}>Dark Mode</Text>
              </View>
              <Text style={[styles.rowSubLabel, { color: theme.icon }]}>
                {themeMode === 'system' ? 'Follow System' : themeMode === 'dark' ? 'On' : 'Off'}
              </Text>
            </View>

            <Switch
              value={themeMode === 'dark'}
              onValueChange={(val) => setThemeMode(val ? 'dark' : 'light')}
              trackColor={{ false: '#767577', true: theme.tint }}
              thumbColor={'#f4f3f4'}
            />
          </View>
        </View>

        {/* --- SECTION: GENERAL --- */}
        <View style={[styles.section, { backgroundColor: currentScheme === 'dark' ? '#ffffff08' : '#f5f5f5' }]}>
          <Text style={[styles.sectionTitle, { color: theme.tint }]}>GENERAL</Text>

          <TouchableOpacity 
            style={styles.row} 
            activeOpacity={0.7}
            onPress={() => setModalVisible(true)}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="home" size={20} color={theme.text} />
                <Text style={[styles.rowLabel, { color: theme.text }]}>Default Landing Page</Text>
              </View>
              <Text style={[styles.rowSubLabel, { color: theme.icon }]}>
                {currentLandingLabel}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.icon} />
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* --- LANDING PAGE SELECTOR MODAL --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Choose Landing Page</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={{ padding: 4 }}>
                <Ionicons name="close" size={24} color={theme.icon} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ maxHeight: 400 }}>
              {LANDING_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionItem, 
                    { 
                      backgroundColor: landingPage === option.value ? theme.tint + '20' : 'transparent',
                      borderColor: currentScheme === 'dark' ? '#333' : '#e0e0e0'
                    }
                  ]}
                  onPress={() => {
                    setLandingPage(option.value);
                    setModalVisible(false);
                  }}
                >
                  <Ionicons 
                    name={option.icon as any} 
                    size={20} 
                    color={landingPage === option.value ? theme.tint : theme.text} 
                  />
                  <Text style={[
                    styles.optionText, 
                    { 
                      color: landingPage === option.value ? theme.tint : theme.text,
                      fontWeight: landingPage === option.value ? '700' : '400'
                    }
                  ]}>
                    {option.label}
                  </Text>
                  {landingPage === option.value && (
                    <Ionicons name="checkmark" size={20} color={theme.tint} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    marginBottom: 24,
  },
  section: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  rowSubLabel: {
    fontSize: 13,
    marginTop: 4,
    marginLeft: 28, // Align with text, skipping icon
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  optionText: {
    fontSize: 16,
    flex: 1,
  },
});
