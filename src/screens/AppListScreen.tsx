import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  SafeAreaView,
  ScrollView,
  Image,
  ImageBackground,
  StatusBar,
  Platform,
  AppState,
  AppStateStatus,
  Modal,
  NativeModules,
  BackHandler,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  loadDaySchedules,
  computeTodayMinutesMap,
  isPackageDayScheduled,
  removeAppFromDaySchedules,
} from '../utils/daySchedule';
import { loadRestTime, isRestActiveNow, isPackageRestScheduled, removeAppFromRestTime, RestTimeConfig } from '../utils/restTime';
import LoadingDots from '../components/LoadingDots';
import LoadingBar from '../components/LoadingBar';
import PasswordVerifyModal from '../components/PasswordVerifyModal';
import {
  InstalledApp,
  LimitedApp,
  getInstalledApps,
  checkUsagePermission,
  checkOverlayPermission,
  startMonitoring,
  removeLimit,
  getLimitedApps,
  hasPassword,
} from '../native/NativeModules';

type Step = 'checking' | 'ready' | 'error';

const PURPLE = '#7C6FEF';
const PURPLE_DARK = '#5B4FCF';
const CARD_BG = '#FFFFFF';

export default function AppListScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  // 일부 기기(엣지투엣지 적용된 Android 15+)에서 insets.top이 0으로 잡히는 경우를 대비한 안전장치
  const topPad = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0, 28);
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [limitedApps, setLimitedApps] = useState<LimitedApp[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [minutes, setMinutes] = useState('30');
  const [step, setStep] = useState<Step>('checking');
  const [errorMsg, setErrorMsg] = useState('');
  const [applying, setApplying] = useState(false);
  const [showPwVerify, setShowPwVerify] = useState(false);
  const [selectedForRemove, setSelectedForRemove] = useState<string[]>([]);
  const [activeRest, setActiveRest] = useState<RestTimeConfig | null>(null);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        checkAndLoad();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, []);

  // 홈 탭이 포커스될 때마다: 이미 준비됐으면 데이터만 새로고침, 아니면(예: 권한 설정 화면에서
  // 방금 돌아온 경우) 권한/비밀번호 상태를 다시 확인
  useFocusEffect(
    useCallback(() => {
      if (step === 'ready') {
        refreshData();
      } else {
        checkAndLoad();
      }
    }, [step])
  );

  // 홈 탭에 있을 때 기기 뒤로가기를 누르면 종료 여부를 물어봄.
  // useFocusEffect 대신 마운트 시 한 번만 등록하고 navigation.isFocused()로 직접 확인해서,
  // 탭을 오갈 때마다 리스너를 재등록/해제하며 생기는 지연을 줄인다.
  useEffect(() => {
    const onBackPress = () => {
      if (!navigation.isFocused()) return false;
      Alert.alert('앱 종료', '앱을 종료하시겠어요?', [
        { text: '취소', style: 'cancel' },
        { text: '종료', style: 'destructive', onPress: () => BackHandler.exitApp() },
      ]);
      return true; // 기본 뒤로가기 동작(배경으로 내려가는 등) 막기
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [navigation]);

  // 1분마다 오늘 요일/휴식 시간대를 다시 확인 (자정을 넘기거나 휴식 시작·종료 시각에 도달해도 반영)
  useEffect(() => {
    const interval = setInterval(() => {
      if (step === 'ready') refreshData();
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [step]);

  const checkAndLoad = async () => {
    try {
      setStep('checking');
      const [hasUsage, hasOverlay, pwSet] = await Promise.all([
        checkUsagePermission(),
        checkOverlayPermission(),
        hasPassword(),
      ]);
      if (!hasUsage || !hasOverlay || !pwSet) {
        navigation.navigate('PermissionSetup');
        return; // 'checking' 상태를 유지 — 위 화면으로 전환되는 동안 로딩 화면이 보임
      }
      await refreshData();
      setStep('ready');
    } catch (e: any) {
      setErrorMsg(String(e?.message ?? e));
      setStep('error');
    }
  };

  const refreshData = async () => {
    const list = await getInstalledApps();
    const sorted = list.sort((a, b) => a.appName.localeCompare(b.appName));
    setApps(sorted);
    await applyTodaySchedules(sorted.map((a) => a.packageName));
    const limits = await getLimitedApps();
    setLimitedApps(limits);

    try {
      const restConfig = await loadRestTime();
      setActiveRest(restConfig && isRestActiveNow(restConfig) ? restConfig : null);
      if (restConfig) {
        NativeModules.OverlayModule?.setRestTimeConfig?.(JSON.stringify(restConfig));
      } else {
        NativeModules.OverlayModule?.clearRestTimeConfig?.();
      }
    } catch (e) {
      console.warn('휴식 시간 상태 확인 실패', e);
    }
  };

  // 요일별 설정(DayScheduleScreen에서 저장한 값)을 오늘 요일 기준으로 계산해 실제 제한에 반영
  const applyTodaySchedules = async (allPackageNames: string[]) => {
    try {
      const configs = await loadDaySchedules();
      if (configs.length === 0) return;
      const todayMap = computeTodayMinutesMap(configs, allPackageNames);
      Object.entries(todayMap).forEach(([pkg, minutes]) => {
        if (minutes > 0) startMonitoring(pkg, minutes);
      });
    } catch (e) {
      console.warn('요일별 설정 적용 실패', e);
    }
  };

  const applyLimit = async () => {
    if (!selected) { Alert.alert('앱을 먼저 선택해주세요'); return; }
    const min = parseInt(minutes, 10);
    if (isNaN(min) || min <= 0) { Alert.alert('올바른 시간을 입력해주세요'); return; }
    setApplying(true);
    startMonitoring(selected, min);
    await new Promise((resolve) => setTimeout(resolve, 900));
    await refreshData();
    setApplying(false);
  };

  const toggleSelectForRemove = (packageName: string) => {
    setSelectedForRemove((prev) =>
      prev.includes(packageName) ? prev.filter((p) => p !== packageName) : [...prev, packageName]
    );
  };

  const restOnlyPackages = (activeRest?.packages ?? []).filter(
    (pkg) => !limitedApps.some((item) => item.packageName === pkg)
  );
  const removableCount = limitedApps.length + restOnlyPackages.length;
  const allSelectedForRemove = removableCount > 0 && selectedForRemove.length === removableCount;
  const toggleSelectAllForRemove = () => {
    setSelectedForRemove(
      allSelectedForRemove ? [] : [...limitedApps.map((item) => item.packageName), ...restOnlyPackages]
    );
  };

  const requestRemoveSelected = async () => {
    if (selectedForRemove.length === 0) {
      Alert.alert('해제할 앱을 선택해주세요');
      return;
    }
    const configs = await loadDaySchedules();
    const restConfig = await loadRestTime();
    const hasDayScheduled = selectedForRemove.some((pkg) => isPackageDayScheduled(configs, pkg));
    const hasRestScheduled = selectedForRemove.some((pkg) => isPackageRestScheduled(restConfig, pkg));

    if (hasDayScheduled || hasRestScheduled) {
      const parts: string[] = [];
      if (hasDayScheduled) parts.push('요일별로 설정된 제한');
      if (hasRestScheduled) parts.push('휴식 시간으로 설정된 제한');
      Alert.alert(
        '설정 해제',
        `선택하신 앱 중 ${parts.join(', ')}이 있어요. 해제하면 해당 설정이 전체 삭제됩니다.`,
        [
          { text: '취소', style: 'cancel' },
          { text: '해제', style: 'destructive', onPress: () => setShowPwVerify(true) },
        ]
      );
      return;
    }
    setShowPwVerify(true);
  };

  const onPasswordVerified = async () => {
    setShowPwVerify(false);
    setApplying(true);
    for (const pkg of selectedForRemove) {
      removeLimit(pkg);
      await removeAppFromDaySchedules(pkg);
      await removeAppFromRestTime(pkg);
    }
    setSelectedForRemove([]);
    await new Promise((resolve) => setTimeout(resolve, 900));
    await refreshData();
    setApplying(false);
  };

  const getApp = (packageName: string) => apps.find((a) => a.packageName === packageName);

  if (step === 'checking') {
    return (
      <SafeAreaView style={styles.center}>
        <Image source={require('../assets/loading_checking.png')} style={styles.loadingCharacter} resizeMode="contain" />
        <LoadingBar />
      </SafeAreaView>
    );
  }
  if (step === 'error') {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.infoText}>오류가 발생했어요{'\n'}{errorMsg}</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={checkAndLoad}>
          <Text style={styles.primaryBtnText}>다시 시도</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <ImageBackground
        source={require('../assets/main_background.png')}
        style={styles.bg}
        resizeMode="cover"
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContentStyle}
          showsVerticalScrollIndicator={false}
        >
          {/* eslint-disable-next-line react-native/no-inline-styles */}
          <View style={[styles.header, { paddingTop: topPad + 16 }]}>
            <Text style={styles.headerTitle}>앱 사용시간 제한</Text>
            {/* eslint-disable-next-line react-native/no-inline-styles */}
            <Image
              source={require('../assets/dino_character.png')}
              style={[styles.headerDino, { top: topPad - 4 }]}
              resizeMode="contain"
            />
          </View>

          <View style={styles.body}>
            <View style={styles.settingCard}>
              <Text style={styles.settingLabel}>선택된 앱</Text>
              <Text style={styles.selectedName}>{selected ? getApp(selected)?.appName : '없음'}</Text>

              <View style={styles.divider} />

              <Text style={styles.settingLabel}>하루 사용 시간 설정</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={minutes}
                  onChangeText={setMinutes}
                  keyboardType="numeric"
                  placeholder="30"
                />
                <Text style={styles.unitText}>분</Text>
              </View>

              <TouchableOpacity style={styles.primaryBtnFull} onPress={applyLimit} disabled={applying}>
                <Text style={styles.primaryBtnText}>제한 적용</Text>
              </TouchableOpacity>
            </View>

            {(limitedApps.length > 0 || (activeRest?.packages.length ?? 0) > 0) && (
              <View style={styles.limitedCard}>
                <View style={styles.limitedHeaderRow}>
                  <Text style={styles.sectionTitle}>현재 제한 중</Text>
                  {removableCount > 0 && (
                    <View style={styles.limitedHeaderActions}>
                      <TouchableOpacity onPress={toggleSelectAllForRemove}>
                        <Text style={styles.selectAllText}>{allSelectedForRemove ? '선택 해제' : '전체 선택'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={requestRemoveSelected}>
                        <Text style={styles.removeText}>해제</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                {limitedApps.map((item) => {
                  const app = getApp(item.packageName);
                  const isSelected = selectedForRemove.includes(item.packageName);
                  const isResting = activeRest?.packages.includes(item.packageName) ?? false;
                  return (
                    <TouchableOpacity
                      key={item.packageName}
                      style={styles.limitedRow}
                      onPress={() => toggleSelectForRemove(item.packageName)}
                    >
                      <View style={styles.limitedIconWrap}>
                        {isSelected ? (
                          <View style={styles.checkCircle}>
                            <Text style={styles.checkMark}>✓</Text>
                          </View>
                        ) : app?.icon ? (
                          <Image source={{ uri: `data:image/png;base64,${app.icon}` }} style={styles.limitedIconImg} />
                        ) : (
                          <View style={styles.limitedIconFallback}>
                            <Text style={styles.limitedIconFallbackText}>{(app?.appName ?? item.packageName).charAt(0)}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.limitedText}>
                        {app?.appName ?? item.packageName} · 하루 {item.limitMinutes}분
                        {isResting ? ' · 🌙 휴식 시간' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                {restOnlyPackages.map((pkg) => {
                  const app = getApp(pkg);
                  const isSelected = selectedForRemove.includes(pkg);
                  return (
                    <TouchableOpacity
                      key={pkg}
                      style={styles.limitedRow}
                      onPress={() => toggleSelectForRemove(pkg)}
                    >
                      <View style={styles.limitedIconWrap}>
                        {isSelected ? (
                          <View style={styles.checkCircle}>
                            <Text style={styles.checkMark}>✓</Text>
                          </View>
                        ) : app?.icon ? (
                          <Image source={{ uri: `data:image/png;base64,${app.icon}` }} style={styles.limitedIconImg} />
                        ) : (
                          <View style={styles.limitedIconFallback}>
                            <Text style={styles.limitedIconFallbackText}>{(app?.appName ?? pkg).charAt(0)}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.limitedText}>{app?.appName ?? pkg} · 🌙 휴식 시간</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <View style={styles.listCard}>
              <Text style={styles.sectionTitle}>전체 앱</Text>
              <FlatList
                data={apps}
                keyExtractor={(item) => item.packageName}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.appRow, selected === item.packageName && styles.appRowSelected]}
                    onPress={() => setSelected(item.packageName)}
                  >
                    {item.icon ? (
                      <Image source={{ uri: `data:image/png;base64,${item.icon}` }} style={styles.appIconImg} />
                    ) : (
                      <View style={styles.appIcon}><Text style={styles.appIconText}>{item.appName.charAt(0)}</Text></View>
                    )}
                    <Text style={styles.appName}>{item.appName}</Text>
                    <Text style={styles.chevron}>›</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </ScrollView>
      </ImageBackground>

      <Modal visible={applying} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Image source={require('../assets/loading_setting.png')} style={styles.loadingCharacter} resizeMode="contain" />
            <Text style={styles.modalTitle}>설정 중이에요</Text>
            <Text style={styles.modalSubtitle}>곧 완료될 거예요!</Text>
            <LoadingDots />
          </View>
        </View>
      </Modal>

      <PasswordVerifyModal
        visible={showPwVerify}
        onSuccess={onPasswordVerified}
        onCancel={() => setShowPwVerify(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#8B7FF0' },
  bg: { flex: 1 },
  scroll: { flex: 1 },
  scrollContentStyle: { paddingBottom: 90 },
  center: { flex: 1, backgroundColor: '#F1EFFF', alignItems: 'center', justifyContent: 'center', padding: 24 },
  header: { paddingHorizontal: 20, position: 'relative', zIndex: 10 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '800', maxWidth: '65%' },
  headerDino: {
    position: 'absolute',
    right: 4,
    width: 130,
    height: 130,
    zIndex: 10,
    elevation: 10,
  },
  body: { paddingHorizontal: 16, paddingTop: 8 },
  settingCard: { backgroundColor: CARD_BG, borderRadius: 20, padding: 18, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  settingLabel: { fontSize: 13, color: '#8B87A8', fontWeight: '600' },
  selectedName: { fontSize: 18, fontWeight: '800', color: '#2C2A3D', marginTop: 4 },
  divider: { height: 1, backgroundColor: '#EEEBFB', marginVertical: 14 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F6F5FF', borderRadius: 14, borderWidth: 1.5, borderColor: PURPLE, paddingHorizontal: 16, marginTop: 10, marginBottom: 16 },
  input: { flex: 1, fontSize: 22, fontWeight: '800', color: '#2C2A3D', paddingVertical: 14 },
  unitText: { fontSize: 15, color: '#8B87A8', fontWeight: '600' },
  primaryBtnFull: { backgroundColor: PURPLE, borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  primaryBtn: { backgroundColor: PURPLE, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28, marginTop: 20 },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  infoTitle: { fontSize: 20, fontWeight: '800', color: '#2C2A3D', marginBottom: 8, marginTop: 8 },
  infoText: { fontSize: 15, color: '#6B6885', textAlign: 'center', lineHeight: 22 },
  loadingCharacter: { width: 180, height: 180 },
  limitedCard: { backgroundColor: '#FFF1F1', borderRadius: 20, padding: 16, marginTop: 16 },
  limitedHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  limitedHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  selectAllText: { color: PURPLE_DARK, fontWeight: '700', fontSize: 13 },
  limitedRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  limitedIconWrap: { marginRight: 10 },
  limitedIconImg: { width: 32, height: 32, borderRadius: 8 },
  limitedIconFallback: { width: 32, height: 32, borderRadius: 8, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center' },
  limitedIconFallbackText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  checkCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: '#fff', fontWeight: '900', fontSize: 16 },
  limitedText: { fontSize: 14, color: '#2C2A3D', fontWeight: '600', flex: 1 },
  removeText: { color: '#FF5A5F', fontWeight: '800', fontSize: 13 },
  listCard: { backgroundColor: CARD_BG, borderRadius: 20, padding: 16, marginTop: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: PURPLE_DARK, marginBottom: 10, letterSpacing: 0.3 },
  appRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F1FC' },
  appRowSelected: { backgroundColor: '#F1EFFF', borderRadius: 12, paddingHorizontal: 8, marginHorizontal: -8 },
  appIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  appIconImg: { width: 40, height: 40, borderRadius: 10, marginRight: 12 },
  appIconText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  appName: { flex: 1, fontSize: 15, fontWeight: '700', color: '#2C2A3D' },
  chevron: { fontSize: 20, color: '#C7C4DE' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { backgroundColor: '#fff', borderRadius: 24, paddingVertical: 32, paddingHorizontal: 40, alignItems: 'center', width: 280 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#2C2A3D', marginTop: 8 },
  modalSubtitle: { fontSize: 13, color: '#8B87A8', marginTop: 4 },
});
