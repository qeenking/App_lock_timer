import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ImageBackground, SafeAreaView, Linking } from 'react-native';

const PRIVACY_URL = 'https://qeenking.github.io/App_lock_timer/';

const TEXT_MAIN = '#2B2740';
const TEXT_SUB = '#6B6885';
const PURPLE = '#6E62E5';

interface Props {
  navigation?: { goBack: () => void };
  onBack?: () => void;
}

const SECTIONS: { title: string; body: string }[] = [
  {
    title: '1. 수집하는 정보와 저장 위치',
    body:
      'AppLockTimer는 서비스 제공을 위해 아래 정보를 처리합니다.\n\n' +
      '· 기기에 설치된 앱 목록 및 앱 아이콘\n' +
      '· 앱별 사용 시간(Usage Access API를 통해 조회)\n' +
      '· 사용자가 설정한 시간 제한, 요일별 설정, 휴식 시간, 앱 제한 비밀번호(PIN)\n\n' +
      '위 정보는 모두 사용자의 기기 내부(로컬 저장소)에만 저장되며, 어떠한 외부 서버로도 전송되지 않습니다. 이 앱은 별도의 회원가입이나 계정 시스템을 사용하지 않습니다.',
  },
  {
    title: '2. 사용 권한',
    body:
      '앱의 핵심 기능을 위해 아래 권한을 사용합니다.\n\n' +
      '· 사용 정보 접근(Usage Access) — 앱별 사용 시간을 확인하기 위해 사용해요.\n' +
      '· 다른 앱 위에 표시(Overlay) — 제한 시간 초과 시 잠금 화면을 띄우기 위해 사용해요.\n\n' +
      '이 권한들은 오직 기기 내에서 사용시간을 계산하고 잠금 화면을 표시하는 용도로만 사용되며, 수집된 정보를 외부로 전송하지 않습니다.',
  },
  {
    title: '3. 제3자 제공',
    body: '이 앱은 사용자의 정보를 어떠한 제3자에게도 제공하거나 판매하지 않습니다.',
  },
  {
    title: '4. 정보의 보관 및 삭제',
    body:
      '저장된 모든 설정과 데이터는 앱을 삭제하면 기기에서 함께 삭제됩니다. 별도의 서버 저장소가 없으므로, 앱 삭제 시 데이터도 함께 사라집니다.',
  },
  {
    title: '5. 문의',
    body: '개인정보 처리에 관해 궁금한 점이 있으시면 아래 이메일로 문의해주세요.\nqeenking@daum.net',
  },
  {
    title: '6. 고지 사항 변경',
    body: '본 방침은 법령이나 서비스 변경에 따라 수정될 수 있으며, 변경 시 앱 정보 화면을 통해 안내합니다.',
  },
];

export default function PrivacyPolicyScreen({ navigation, onBack }: Props) {
  const handleBack = onBack ?? (() => navigation?.goBack());

  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground source={require('../assets/bg_clouds.png')} style={styles.bg} resizeMode="cover">
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>개인정보처리방침</Text>
            <Text style={styles.subtitle}>시행일: 2026년 9월 1일</Text>
            <TouchableOpacity
              style={styles.webLinkBtn}
              onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}
              activeOpacity={0.7}
            >
              <Text style={styles.webLinkText}>웹에서 보기</Text>
              <Text style={styles.webLinkArrow}>↗</Text>
            </TouchableOpacity>
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
  webLinkBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: '#EDEBFC', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, marginTop: 12,
  },
  webLinkText: { fontSize: 13, color: PURPLE, fontWeight: '700' },
  webLinkArrow: { fontSize: 13, color: PURPLE, fontWeight: '700', marginLeft: 4 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginTop: 16,
    shadowColor: '#6E62E5', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: PURPLE, marginBottom: 8 },
  sectionBody: { fontSize: 13, color: TEXT_SUB, lineHeight: 21 },
});
