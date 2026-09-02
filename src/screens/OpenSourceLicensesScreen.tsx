import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ImageBackground, SafeAreaView } from 'react-native';

const TEXT_MAIN = '#2B2740';
const TEXT_SUB = '#8B87A6';
const PURPLE = '#6E62E5';

interface Props {
  navigation?: { goBack: () => void };
  onBack?: () => void;
}

const LIBRARIES: { name: string; license: string }[] = [
  { name: 'React', license: 'MIT License' },
  { name: 'React Native', license: 'MIT License' },
  { name: '@react-navigation/native', license: 'MIT License' },
  { name: '@react-navigation/native-stack', license: 'MIT License' },
  { name: '@react-navigation/bottom-tabs', license: 'MIT License' },
  { name: 'react-native-screens', license: 'MIT License' },
  { name: 'react-native-safe-area-context', license: 'MIT License' },
  { name: '@react-native-async-storage/async-storage', license: 'MIT License' },
];

export default function OpenSourceLicensesScreen({ navigation, onBack }: Props) {
  const handleBack = onBack ?? (() => navigation?.goBack());

  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground source={require('../assets/bg_clouds.png')} style={styles.bg} resizeMode="cover">
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>오픈소스 라이선스</Text>
            <Text style={styles.subtitle}>이 앱은 아래 오픈소스 라이브러리를 사용합니다.</Text>
          </View>

          <View style={styles.card}>
            {LIBRARIES.map((lib, i) => (
              <View key={lib.name} style={[styles.row, i !== LIBRARIES.length - 1 && styles.rowBorder]}>
                <Text style={styles.libName}>{lib.name}</Text>
                <Text style={styles.libLicense}>{lib.license}</Text>
              </View>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F3F1FB' },
  bg: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12 },
  header: { paddingTop: 8, paddingBottom: 8 },
  backArrow: { fontSize: 24, color: TEXT_MAIN, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: TEXT_MAIN },
  subtitle: { fontSize: 13, color: TEXT_SUB, marginTop: 4 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginTop: 16,
    shadowColor: '#6E62E5', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  row: { paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F1FC' },
  libName: { fontSize: 14, fontWeight: '700', color: TEXT_MAIN },
  libLicense: { fontSize: 12, color: PURPLE, marginTop: 3, fontWeight: '600' },
});
