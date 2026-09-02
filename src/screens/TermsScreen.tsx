import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ImageBackground, SafeAreaView } from 'react-native';

const TEXT_MAIN = '#2B2740';
const TEXT_SUB = '#6B6885';
const PURPLE = '#6E62E5';

interface Props {
  navigation?: { goBack: () => void };
  onBack?: () => void;
}

const SECTIONS: { title: string; body: string }[] = [
  {
    title: '제1조 (목적)',
    body: '이 약관은 AppLockTimer(이하 "앱")의 이용과 관련하여 앱과 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.',
  },
  {
    title: '제2조 (서비스의 내용)',
    body: '앱은 이용자가 직접 설정한 시간 제한, 요일별 설정, 휴식 시간 등에 따라 특정 앱의 사용을 제한하는 기능을 제공합니다. 모든 설정은 이용자 본인의 판단과 책임 하에 이루어집니다.',
  },
  {
    title: '제3조 (비밀번호 관리)',
    body:
      '이용자는 앱 제한 비밀번호(PIN)를 스스로 설정하고 관리할 책임이 있습니다. 비밀번호를 잊어버린 경우 앱을 삭제 후 재설치해야 하며, 이 경우 저장된 모든 설정이 함께 초기화됩니다. 앱은 비밀번호 분실로 인한 불편에 대해 책임지지 않습니다.',
  },
  {
    title: '제4조 (면책 조항)',
    body:
      '앱은 이용자가 설정한 제한으로 인해 발생하는 불편, 업무·학업 지장, 기타 손해에 대해 책임을 지지 않습니다. 앱은 무료로 제공되며, 어떠한 형태의 보증도 하지 않습니다.',
  },
  {
    title: '제5조 (권한 사용)',
    body: '앱은 사용시간 제한 기능 제공을 위해 사용 정보 접근 권한과 다른 앱 위에 표시 권한을 사용합니다. 자세한 내용은 개인정보처리방침을 참고해주세요.',
  },
  {
    title: '제6조 (약관의 변경)',
    body: '이 약관은 필요 시 개정될 수 있으며, 개정 시 앱 정보 화면을 통해 공지합니다.',
  },
];

export default function TermsScreen({ navigation, onBack }: Props) {
  const handleBack = onBack ?? (() => navigation?.goBack());

  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground source={require('../assets/bg_clouds.png')} style={styles.bg} resizeMode="cover">
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>이용약관</Text>
            <Text style={styles.subtitle}>시행일: 2026년 9월 1일</Text>
          </View>

          <View style={styles.card}>
            {SECTIONS.map((section) => (
              <View key={section.title} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionBody}>{section.body}</Text>
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
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: PURPLE, marginBottom: 8 },
  sectionBody: { fontSize: 13, color: TEXT_SUB, lineHeight: 21 },
});
