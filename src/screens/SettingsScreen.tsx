import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ImageBackground,
  StatusBar,
  Platform,
  ScrollView,
  Alert,
  NativeModules,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PasswordSetupModal from '../components/PasswordSetupModal';
import PasswordVerifyModal from '../components/PasswordVerifyModal';
import { CHAR_SIZE, HEADER_TEXT_MAX_W, scaleFont } from '../constants/responsive';

const PURPLE_DARK = '#5B4FCF';
const CARD_BG = '#FFFFFF';

type Row = { icon: any; title: string; subtitle: string; onPress: () => void };

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  // 일부 기기(엣지투엣지 적용된 Android 15+)에서 insets.top이 0으로 잡히는 경우를 대비한 안전장치
  const topPad = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0, 28);
  const [showVerify, setShowVerify] = useState(false);
  const [showChangeSetup, setShowChangeSetup] = useState(false);
  const [batteryExempt, setBatteryExempt] = useState<boolean | null>(null);

  useFocusEffect(
    useCallback(() => {
      NativeModules.OverlayModule?.hasBatteryOptimizationExemption?.()
        .then((v: boolean) => setBatteryExempt(v))
        .catch(() => {});
    }, [])
  );

  const handleBatteryPress = () => {
    if (batteryExempt) {
      Alert.alert('이미 설정돼 있어요', '배터리 사용 제한 없음으로 이미 등록돼 있어요.');
      return;
    }
    Alert.alert(
      '배터리 사용 제한 없음',
      '이 설정을 켜두면 배터리 절약 모드에서도 앱 감시가 끊기지 않아요.',
      [
        { text: '취소', style: 'cancel' },
        { text: '설정하기', onPress: () => NativeModules.OverlayModule?.requestBatteryOptimizationExemption?.() },
      ]
    );
  };

  const timeSection: Row[] = [
    { icon: require('../assets/icon_calendar.png'), title: '요일별 설정', subtitle: '요일별로 다른 시간을 설정해요', onPress: () => navigation.navigate('DaySchedule') },
    { icon: require('../assets/icon_moon.png'), title: '휴식 시간 설정', subtitle: '앱 사용을 잠시 쉬는 시간을 설정해요', onPress: () => navigation.navigate('RestTime') },
  ];

  const securitySection: Row[] = [
    { icon: require('../assets/icon_shield.png'), title: '비밀번호 변경', subtitle: '앱 제한 비밀번호를 변경해요', onPress: () => navigation.navigate('PasswordChange') },
    {
      icon: require('../assets/icon_shield.png'),
      title: '배터리 사용 제한 없음',
      subtitle:
        batteryExempt === null
          ? '확인 중...'
          : batteryExempt
          ? '설정 완료 - 감시가 끊기지 않아요'
          : '꺼짐 - 절전 모드에서 제한이 멈출 수 있어요',
      onPress: handleBatteryPress,
    },
  ];

  const etcSection: Row[] = [
    { icon: require('../assets/icon_help.png'), title: '도움말', subtitle: '자주 묻는 질문을 확인해요', onPress: () => navigation.navigate('Help') },
    { icon: require('../assets/icon_info.png'), title: '앱 정보', subtitle: '앱 버전 및 정보를 확인해요', onPress: () => navigation.navigate('AppInfo') },
  ];

  const renderRow = (row: Row, isLast: boolean) => (
    <TouchableOpacity key={row.title} style={[styles.row, !isLast && styles.rowBorder]} onPress={row.onPress}>
      <View style={styles.rowIconWrap}>
        <Image source={row.icon} style={styles.rowIconImg} resizeMode="contain" />
      </View>
      <View style={styles.rowTextCol}>
        <Text style={styles.rowTitle}>{row.title}</Text>
        <Text style={styles.rowSubtitle}>{row.subtitle}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <ImageBackground
        source={require('../assets/settings_background.png')}
        style={styles.bg}
        resizeMode="cover"
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* eslint-disable-next-line react-native/no-inline-styles */}
          <View style={[styles.headerRow, { paddingTop: topPad + 16 }]}>
            <Text style={styles.headerTitle}>설정</Text>
            <Text style={styles.headerSubtitle}>앱 사용 시간을 더 스마트하게{'\n'}관리해보세요!</Text>
            {/* eslint-disable-next-line react-native/no-inline-styles */}
            <Image
              source={require('../assets/gear_character.png')}
              style={[styles.headerGear, { top: topPad - 4 }]}
              resizeMode="contain"
            />
          </View>

          <View style={styles.body}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>시간 제한 설정</Text>
              {timeSection.map((row, i) => renderRow(row, i === timeSection.length - 1))}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>앱 보호 설정</Text>
              {securitySection.map((row, i) => renderRow(row, i === securitySection.length - 1))}
              <Text style={styles.hintText}>비밀번호를 잊으셨다면 앱을 삭제 후 재설치해주세요.</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>기타</Text>
              {etcSection.map((row, i) => renderRow(row, i === etcSection.length - 1))}
            </View>
          </View>
        </ScrollView>
      </ImageBackground>

      <PasswordVerifyModal
        visible={showVerify}
        onSuccess={() => {
          setShowVerify(false);
          setShowChangeSetup(true);
        }}
        onCancel={() => setShowVerify(false)}
      />

      <PasswordSetupModal
        visible={showChangeSetup}
        onDone={() => setShowChangeSetup(false)}
        onClose={() => setShowChangeSetup(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#8B7FF0' },
  bg: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 90 },
  headerRow: { paddingHorizontal: 20, paddingRight: 140, position: 'relative', zIndex: 10 },
  headerTitle: { color: '#fff', fontSize: scaleFont(26), fontWeight: '800', maxWidth: HEADER_TEXT_MAX_W },
  headerSubtitle: { color: '#EDE9FF', fontSize: scaleFont(13), marginTop: 8, lineHeight: 19, maxWidth: HEADER_TEXT_MAX_W },
  headerGear: {
    position: 'absolute',
    right: 4,
    width: CHAR_SIZE,
    height: CHAR_SIZE,
    zIndex: 10,
    elevation: 10,
  },
  body: { paddingHorizontal: 16, marginTop: 8 },
  card: { backgroundColor: CARD_BG, borderRadius: 20, padding: 16, marginTop: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: PURPLE_DARK, marginBottom: 6, letterSpacing: 0.3 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F1FC' },
  rowIconWrap: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rowIconImg: { width: 38, height: 38 },
  rowTextCol: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: '#2C2A3D' },
  rowSubtitle: { fontSize: 12, color: '#9C99B4', marginTop: 2 },
  chevron: { fontSize: 20, color: '#C7C4DE' },
  hintText: { fontSize: 11, color: '#B0ACC7', marginTop: 12, lineHeight: 16 },
});
