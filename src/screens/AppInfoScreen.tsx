import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageBackground,
  SafeAreaView,
  Linking,
  NativeModules,
} from 'react-native';

const PURPLE = '#6E62E5';
const TEXT_MAIN = '#2B2740';
const TEXT_SUB = '#8B87A6';

const APP_NAME = 'AppLockTimer';
const SUPPORT_EMAIL = 'qeenking@daum.net';

interface Props {
  navigation?: { goBack: () => void; navigate: (screen: string) => void };
  onBack?: () => void;
}

type Row = { icon: any; title: string; desc: string; onPress: () => void };

export default function AppInfoScreen({ navigation, onBack }: Props) {
  const handleBack = onBack ?? (() => navigation?.goBack());

  const [versionName, setVersionName] = useState('');
  const [versionCode, setVersionCode] = useState<number | null>(null);

  useEffect(() => {
    NativeModules.OverlayModule?.getAppVersion?.()
      .then((v: { versionName: string; versionCode: number }) => {
        setVersionName(v.versionName);
        setVersionCode(v.versionCode);
      })
      .catch(() => {});
  }, []);

  const openContactEmail = () => {
    const subject = encodeURIComponent(`${APP_NAME} 문의`);
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}`).catch(() => {});
  };

  const rows: Row[] = [
    {
      icon: require('../assets/icon_privacy.png'),
      title: '개인정보처리방침',
      desc: '이 앱은 설치된 앱 목록과 사용 시간을 기기 내에만 저장하며, 서버로 전송하지 않습니다.',
      onPress: () => navigation?.navigate('PrivacyPolicy'),
    },
    {
      icon: require('../assets/icon_terms.png'),
      title: '이용약관',
      desc: '앱 이용에 관한 약관을 확인할 수 있습니다.',
      onPress: () => navigation?.navigate('Terms'),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground source={require('../assets/bg_clouds.png')} style={styles.bg} resizeMode="cover">
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* ── 헤더 ── */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>앱 정보</Text>
            <Image source={require('../assets/gear_character.png')} style={styles.character} resizeMode="contain" />
          </View>

          {/* ── 앱 아이콘 / 버전 ── */}
          <View style={styles.card}>
            <View style={styles.appIconWrap}>
              <Image source={require('../assets/app_icon_display.png')} style={styles.appIconImg} resizeMode="cover" />
            </View>
            <Text style={styles.appName}>{APP_NAME}</Text>
            <Text style={styles.appVersion}>
              {versionName ? `버전 ${versionName}  |  빌드 ${versionCode}` : '버전 확인 중...'}
            </Text>
          </View>

          {/* ── 정책 링크 ── */}
          <View style={styles.card}>
            {rows.map((row, i) => (
              <TouchableOpacity
                key={row.title}
                style={[styles.row, i !== rows.length - 1 && styles.rowBorder]}
                onPress={row.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.rowIconWrap}>
                  <Image source={row.icon} style={styles.rowIconImg} resizeMode="contain" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{row.title}</Text>
                  <Text style={styles.rowDesc}>{row.desc}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── 문의하기 ── */}
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={openContactEmail} activeOpacity={0.7}>
              <View style={styles.rowIconWrap}>
                <Image source={require('../assets/icon_mail.png')} style={styles.rowIconImg} resizeMode="contain" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>문의하기</Text>
                <Text style={styles.rowDesc}>이메일로 문의하거나 피드백을 남겨주세요.</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.emailBox} onPress={openContactEmail} activeOpacity={0.7}>
              <Text style={styles.emailText}>{SUPPORT_EMAIL}</Text>
            </TouchableOpacity>
          </View>

          {/* ── 오픈소스 라이선스 ── */}
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={() => navigation?.navigate('OpenSourceLicenses')} activeOpacity={0.7}>
              <View style={styles.rowIconWrap}>
                <Image source={require('../assets/icon_opensource.png')} style={styles.rowIconImg} resizeMode="contain" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>오픈소스 라이선스</Text>
                <Text style={styles.rowDesc}>이 앱에서 사용하는 오픈소스 라이브러리 정보를 확인할 수 있습니다.</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
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

  header: { paddingTop: 8, paddingBottom: 8, position: 'relative' },
  backArrow: { fontSize: 24, color: TEXT_MAIN, marginBottom: 12 },
  title: { fontSize: 26, fontWeight: '800', color: TEXT_MAIN },
  character: { position: 'absolute', right: 4, top: 8, width: 130, height: 130, zIndex: 10, elevation: 10 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginTop: 16,
    shadowColor: '#6E62E5',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    alignItems: 'center',
  },

  appIconWrap: {
    width: 96, height: 96, borderRadius: 24, overflow: 'hidden',
    shadowColor: PURPLE, shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  appIconImg: { width: 96, height: 96 },
  appName: { fontSize: 18, fontWeight: '800', color: TEXT_MAIN, marginTop: 14 },
  appVersion: { fontSize: 13, color: TEXT_SUB, marginTop: 4 },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, alignSelf: 'stretch' },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F1FC' },
  rowIconWrap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowIconImg: { width: 44, height: 44 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: TEXT_MAIN },
  rowDesc: { fontSize: 12, color: TEXT_SUB, marginTop: 3, lineHeight: 17 },
  chevron: { fontSize: 20, color: '#C7C4DE', marginLeft: 8 },

  emailBox: {
    alignSelf: 'stretch', backgroundColor: '#F3F1FB', borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 16, marginTop: 4,
  },
  emailText: { fontSize: 14, color: PURPLE, fontWeight: '700' },
});
