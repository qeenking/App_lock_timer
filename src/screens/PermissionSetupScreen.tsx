import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageBackground,
  SafeAreaView,
  AppState,
  AppStateStatus,
  NativeModules,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  checkUsagePermission,
  requestUsagePermission,
  checkOverlayPermission,
  requestOverlayPermission,
  hasPassword,
} from '../native/NativeModules';
import PasswordSetupModal from '../components/PasswordSetupModal';
import { CHAR_SIZE, HEADER_TEXT_MAX_W, scaleFont, scaleSize } from '../constants/responsive';

const PURPLE = '#6E62E5';
const PURPLE_LIGHT = '#EDEBFC';
const TEXT_MAIN = '#2B2740';
const TEXT_SUB = '#8B87A6';
const GREEN = '#2FAE66';
const GREEN_LIGHT = '#E4F7EC';

interface Props {
  navigation?: { goBack: () => void; navigate: (screen: string) => void };
  onBack?: () => void;
}

export default function PermissionSetupScreen({ navigation, onBack }: Props) {
  const handleBack = onBack ?? (() => navigation?.goBack());

  const [hasUsage, setHasUsage] = useState(false);
  const [hasOverlay, setHasOverlay] = useState(false);
  const [hasBattery, setHasBattery] = useState(false);
  const [hasPw, setHasPw] = useState(false);
  const [pwModalVisible, setPwModalVisible] = useState(false);

  const appState = useRef(AppState.currentState);

  const refreshAll = useCallback(async () => {
    const [usage, overlay, pw] = await Promise.all([
      checkUsagePermission(),
      checkOverlayPermission(),
      hasPassword(),
    ]);
    setHasUsage(usage);
    setHasOverlay(overlay);
    setHasPw(pw);
    try {
      const battery = await NativeModules.OverlayModule?.hasBatteryOptimizationExemption?.();
      setHasBattery(!!battery);
    } catch {
      setHasBattery(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshAll();
    }, [refreshAll])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        refreshAll();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [refreshAll]);

  const requiredDone = hasUsage && hasOverlay && hasPw;

  const handleFinish = () => {
    if (!requiredDone) return;
    navigation?.navigate('Main');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground source={require('../assets/bg_clouds.png')} style={styles.bg} resizeMode="cover">
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* ── 헤더 ── */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>앱 사용 권한 설정</Text>
            <Text style={styles.subtitle}>앱을 정상적으로 사용하기 위해{'\n'}아래 권한을 허용해주세요.</Text>
            <Image source={require('../assets/character_permission.png')} style={styles.character} resizeMode="contain" />
          </View>

          {/* ── 사용정보 접근 ── */}
          <PermissionRow
            icon={require('../assets/icon_perm_usage.png')}
            iconBg="#EFEBFF"
            title="사용정보 접근"
            desc="앱 사용 시간을 정확하게 확인하기 위해 사용정보 접근 권한이 필요합니다."
            done={hasUsage}
            onPress={requestUsagePermission}
          />

          {/* ── 다른 앱 위에 표시 ── */}
          <PermissionRow
            icon={require('../assets/icon_perm_overlay.png')}
            iconBg="#FCEBF7"
            title="다른 앱 위에 표시"
            desc="앱이 제대로 동작하도록 다른 앱 위에 표시 권한이 필요합니다."
            done={hasOverlay}
            onPress={requestOverlayPermission}
          />

          {/* ── 배터리 사용 제한 없음 (선택) ── */}
          <PermissionRow
            icon={require('../assets/icon_perm_battery.png')}
            iconBg="#E4F7EC"
            title="배터리 사용 제한 없음"
            desc="앱이 백그라운드에서도 계속 동작할 수 있도록 배터리 사용 제한 없음 권한을 설정해주세요."
            done={hasBattery}
            optional
            onPress={() => NativeModules.OverlayModule?.requestBatteryOptimizationExemption?.()}
            footnote="이 권한은 선택사항입니다."
          />

          {/* ── 비밀번호 설정 ── */}
          <PermissionRow
            icon={require('../assets/icon_perm_password.png')}
            iconBg="#EAF1FF"
            title="비밀번호 설정"
            desc="앱을 보호하기 위해 4자리 숫자 비밀번호를 설정해주세요."
            done={hasPw}
            onPress={() => setPwModalVisible(true)}
          />

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={styles.footerWrap}>
          <TouchableOpacity
            style={[styles.finishBtn, !requiredDone && styles.finishBtnDisabled]}
            onPress={handleFinish}
            activeOpacity={0.85}
            disabled={!requiredDone}
          >
            <Text style={styles.finishBtnText}>완료</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>

      <PasswordSetupModal
        visible={pwModalVisible}
        onDone={() => {
          setPwModalVisible(false);
          refreshAll();
        }}
        onClose={() => setPwModalVisible(false)}
      />
    </SafeAreaView>
  );
}

function PermissionRow({
  icon,
  iconBg,
  title,
  desc,
  done,
  optional,
  onPress,
  footnote,
}: {
  icon: any;
  iconBg: string;
  title: string;
  desc: string;
  done: boolean;
  optional?: boolean;
  onPress: () => void;
  footnote?: string;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.rowTop}>
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          <Image source={icon} style={styles.iconImg} resizeMode="contain" />
        </View>
        <View style={styles.rowTextCol}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={styles.rowDesc}>{desc}</Text>
        </View>
        {done ? (
          <View style={styles.doneBadge}>
            <Text style={styles.doneBadgeText}>완료 ✓</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.actionBtn, optional && styles.actionBtnOutline]}
            onPress={onPress}
            activeOpacity={0.85}
          >
            <Text style={[styles.actionBtnText, optional && styles.actionBtnTextOutline]}>
              {optional ? '선택사항' : '설정하기'}
            </Text>
            <Text style={[styles.actionBtnChevron, optional && styles.actionBtnTextOutline]}>›</Text>
          </TouchableOpacity>
        )}
      </View>
      {footnote && !done && (
        <View style={styles.footnoteRow}>
          <Text style={styles.footnoteIcon}>ⓘ</Text>
          <Text style={styles.footnoteText}>{footnote}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F3F1FB' },
  bg: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12 },

  header: { paddingTop: 8, paddingBottom: 8, position: 'relative' },
  backArrow: { fontSize: 24, color: TEXT_MAIN, marginBottom: 12 },
  title: { fontSize: scaleFont(24), fontWeight: '800', color: TEXT_MAIN, maxWidth: HEADER_TEXT_MAX_W },
  subtitle: { fontSize: scaleFont(13), color: TEXT_SUB, marginTop: 6, maxWidth: HEADER_TEXT_MAX_W, lineHeight: 19 },
  character: { position: 'absolute', right: 4, top: 8, width: CHAR_SIZE, height: CHAR_SIZE, zIndex: 10, elevation: 10 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginTop: 16,
    shadowColor: '#6E62E5',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start' },
  iconWrap: {
    width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  iconImg: { width: 28, height: 28 },
  rowTextCol: { flex: 1, paddingRight: 10 },
  rowTitle: { fontSize: 15, fontWeight: '800', color: TEXT_MAIN },
  rowDesc: { fontSize: 12, color: TEXT_SUB, marginTop: 4, lineHeight: 17 },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: PURPLE,
    borderRadius: 20, paddingVertical: 9, paddingHorizontal: 14,
  },
  actionBtnOutline: { backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#E7E4F5' },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  actionBtnTextOutline: { color: TEXT_SUB },
  actionBtnChevron: { color: '#fff', fontWeight: '800', fontSize: 13, marginLeft: 2 },

  doneBadge: { backgroundColor: GREEN_LIGHT, borderRadius: 20, paddingVertical: 9, paddingHorizontal: 12 },
  doneBadgeText: { color: GREEN, fontWeight: '800', fontSize: 12 },

  footnoteRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingLeft: 62 },
  footnoteIcon: { fontSize: 12, color: TEXT_SUB, marginRight: 6 },
  footnoteText: { fontSize: 11, color: TEXT_SUB },

  footerWrap: { position: 'absolute', left: 20, right: 20, bottom: 20 },
  finishBtn: {
    backgroundColor: PURPLE, borderRadius: 30, paddingVertical: 18, alignItems: 'center',
    shadowColor: PURPLE, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  finishBtnDisabled: { backgroundColor: '#C9C4E8', shadowOpacity: 0 },
  finishBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
