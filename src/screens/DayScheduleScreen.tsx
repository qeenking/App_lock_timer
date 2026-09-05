import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Image,
  ImageBackground,
  SafeAreaView,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { getInstalledApps, InstalledApp, removeLimit } from '../native/NativeModules';
import {
  DayScheduleConfig,
  makeScheduleId,
  saveDaySchedule,
  loadDaySchedules,
  clearAllDaySchedules,
  removeAppFromDaySchedules,
  getAppliedPackages,
  findConfigForPackage,
} from '../utils/daySchedule';
import { CHAR_SIZE, HEADER_TEXT_MAX_W, scaleFont, scaleSize } from '../constants/responsive';

// ── 팔레트 (App.tsx와 통일) ─────────────────────────────
const PURPLE = '#6E62E5';
const PURPLE_LIGHT = '#EDEBFC';
const GRAY = '#B7B4D6';
const TEXT_MAIN = '#2B2740';
const TEXT_SUB = '#8B87A6';

// ── 요일 데이터 ─────────────────────────────────────────
type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

const DAYS: { key: DayKey; label: string; short: string; badgeBg: string; badgeText: string }[] = [
  { key: 'mon', label: '월요일', short: '월', badgeBg: PURPLE_LIGHT, badgeText: PURPLE },
  { key: 'tue', label: '화요일', short: '화', badgeBg: PURPLE_LIGHT, badgeText: PURPLE },
  { key: 'wed', label: '수요일', short: '수', badgeBg: PURPLE_LIGHT, badgeText: PURPLE },
  { key: 'thu', label: '목요일', short: '목', badgeBg: PURPLE_LIGHT, badgeText: PURPLE },
  { key: 'fri', label: '금요일', short: '금', badgeBg: PURPLE_LIGHT, badgeText: PURPLE },
  { key: 'sat', label: '토요일', short: '토', badgeBg: '#E4F1FF', badgeText: '#4A90E2' },
  { key: 'sun', label: '일요일', short: '일', badgeBg: '#FFE9EF', badgeText: '#E2568C' },
];

type DayState = { minutes: string; enabled: boolean };
type ApplyMode = 'perDay' | 'weekdayWeekend';

const DEFAULT_STATE: Record<DayKey, DayState> = {
  mon: { minutes: '30', enabled: true },
  tue: { minutes: '30', enabled: true },
  wed: { minutes: '30', enabled: true },
  thu: { minutes: '30', enabled: true },
  fri: { minutes: '30', enabled: true },
  sat: { minutes: '60', enabled: true },
  sun: { minutes: '60', enabled: true },
};

const WEEKDAYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri'];
const WEEKENDS: DayKey[] = ['sat', 'sun'];
const DAY_KEYS_LOCAL: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

interface Props {
  /** React Navigation이 Stack.Screen으로 등록 시 자동으로 넘겨주는 navigation 객체 */
  navigation?: { goBack: () => void };
  onBack?: () => void;
  onSave?: (config: DayScheduleConfig) => void;
}

type AppListItem = { packageName: string; appName: string; icon?: string };

export default function DayScheduleScreen({ navigation, onBack, onSave }: Props) {
  const handleBack = onBack ?? (() => navigation?.goBack());
  const [schedule, setSchedule] = useState<Record<DayKey, DayState>>(DEFAULT_STATE);
  const [applyMode, setApplyMode] = useState<ApplyMode>('perDay');

  // ── 앱 목록 & 선택 상태 (새 설정 작성용 드래프트) ──
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]); // 빈 배열 = 선택된 앱 없음
  const [modalVisible, setModalVisible] = useState(false);
  const [tempSelected, setTempSelected] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // ── 이미 적용된 요일별 설정 목록 ──
  const [appliedConfigs, setAppliedConfigs] = useState<DayScheduleConfig[]>([]);
  const [infoModalPkg, setInfoModalPkg] = useState<string | null>(null);

  const loadInstalled = useCallback(() => {
    getInstalledApps()
      .then((list) => setInstalledApps(list.sort((a, b) => a.appName.localeCompare(b.appName))))
      .catch(() => {});
  }, []);

  const refreshAppliedConfigs = useCallback(() => {
    loadDaySchedules().then(setAppliedConfigs).catch(() => {});
  }, []);

  useEffect(() => {
    loadInstalled();
    refreshAppliedConfigs();
  }, [loadInstalled, refreshAppliedConfigs]);

  const appAppMap = useMemo(() => {
    const map = new Map<string, InstalledApp>();
    installedApps.forEach((a) => map.set(a.packageName, a));
    return map;
  }, [installedApps]);

  const appliedApps: AppListItem[] = useMemo(() => {
    return getAppliedPackages(appliedConfigs).map((pkg) => {
      const app = appAppMap.get(pkg);
      return { packageName: pkg, appName: app?.appName ?? pkg, icon: app?.icon };
    });
  }, [appliedConfigs, appAppMap]);

  const selectedAppLabel = useMemo(() => {
    if (selectedPackages.length === 0) return '없음';
    if (selectedPackages.length === 1) {
      const app = installedApps.find((a) => a.packageName === selectedPackages[0]);
      return app?.appName ?? '앱 1개';
    }
    return `앱 ${selectedPackages.length}개`;
  }, [selectedPackages, installedApps]);

  const openAppSelect = () => {
    setTempSelected(selectedPackages);
    setSearchQuery('');
    setModalVisible(true);
  };

  const closeAppSelectWithoutSaving = () => {
    setModalVisible(false);
  };

  const confirmAppSelect = () => {
    setSelectedPackages(tempSelected);
    setModalVisible(false);
  };

  const toggleTempApp = (packageName: string) => {
    setTempSelected((prev) =>
      prev.includes(packageName) ? prev.filter((p) => p !== packageName) : [...prev, packageName]
    );
  };

  const filteredApps: AppListItem[] = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return query
      ? installedApps.filter((a) => a.appName.toLowerCase().includes(query))
      : installedApps;
  }, [installedApps, searchQuery]);

  const updateMinutes = (key: DayKey, value: string) => {
    const numeric = value.replace(/[^0-9]/g, '');
    setSchedule((prev) => ({ ...prev, [key]: { ...prev[key], minutes: numeric } }));
  };

  const toggleEnabled = (key: DayKey) => {
    setSchedule((prev) => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } }));
  };

  // 주중/주말로 설정 모드일 때, 평일 값이 바뀌면 평일 전체에, 주말 값이 바뀌면 주말 전체에 반영
  const updateGroupMinutes = (group: 'weekday' | 'weekend', value: string) => {
    const numeric = value.replace(/[^0-9]/g, '');
    const keys = group === 'weekday' ? WEEKDAYS : WEEKENDS;
    setSchedule((prev) => {
      const next = { ...prev };
      keys.forEach((k) => {
        next[k] = { ...next[k], minutes: numeric };
      });
      return next;
    });
  };

  const handleSave = async () => {
    if (selectedPackages.length === 0) {
      Alert.alert('앱을 선택해주세요', '요일별 제한을 적용할 앱을 하나 이상 선택해야 저장할 수 있어요.');
      return;
    }

    const days = DAY_KEYS_LOCAL.reduce((acc, key) => {
      const state = schedule[key];
      acc[key] = { minutes: parseInt(state.minutes || '0', 10), enabled: state.enabled };
      return acc;
    }, {} as Record<DayKey, { minutes: number; enabled: boolean }>);

    const config: DayScheduleConfig = {
      id: makeScheduleId(selectedPackages),
      packages: selectedPackages,
      applyMode,
      days,
      updatedAt: Date.now(),
    };

    try {
      await saveDaySchedule(config);
    } catch (e) {
      console.warn('요일별 설정 저장 실패', e);
    }

    // 적용된 앱 리스트를 즉시 갱신하고, 다음 설정을 이어서 만들 수 있도록 드래프트를 초기화
    refreshAppliedConfigs();
    setSelectedPackages([]);
    setSchedule(DEFAULT_STATE);
    setApplyMode('perDay');

    onSave?.(config);
    Alert.alert('저장 완료', '요일별 설정이 적용됐어요.');
  };

  // ── 적용된 앱 리스트 관리 ──
  const handleRemoveAppliedApp = (pkg: string) => {
    const app = appAppMap.get(pkg);
    Alert.alert(
      '요일별 설정 해제',
      `${app?.appName ?? pkg}의 요일별 설정을 해제할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '해제',
          style: 'destructive',
          onPress: async () => {
            removeLimit(pkg);
            await removeAppFromDaySchedules(pkg);
            refreshAppliedConfigs();
          },
        },
      ]
    );
  };

  const handleClearAllApplied = () => {
    if (appliedApps.length === 0) return;
    Alert.alert(
      '전체 삭제',
      '적용된 요일별 설정을 모두 삭제할까요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '전체 삭제',
          style: 'destructive',
          onPress: async () => {
            appliedApps.forEach((a) => removeLimit(a.packageName));
            await clearAllDaySchedules();
            refreshAppliedConfigs();
          },
        },
      ]
    );
  };

  const infoConfig = infoModalPkg ? findConfigForPackage(appliedConfigs, infoModalPkg) : undefined;
  const infoApp = infoModalPkg ? appAppMap.get(infoModalPkg) : undefined;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground
        source={require('../assets/bg_clouds.png')}
        style={styles.bg}
        resizeMode="cover"
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── 헤더 ── */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>요일별 설정</Text>
            <Text style={styles.subtitle}>요일별로 다른 사용 시간을 설정해요</Text>
            <Image
              source={require('../assets/character_calendar.png')}
              style={styles.character}
              resizeMode="contain"
            />
          </View>

          {/* ── 적용된 앱 리스트 카드 ── */}
          {appliedApps.length > 0 && (
            <View style={styles.card}>
              <View style={styles.appliedHeaderRow}>
                <Text style={styles.cardLabel}>적용된 앱 리스트</Text>
                <TouchableOpacity onPress={handleClearAllApplied}>
                  <Text style={styles.clearAllText}>전체 삭제</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.appliedRow}>
                {appliedApps.map((item) => (
                  <View key={item.packageName} style={styles.appliedItem}>
                    <TouchableOpacity onPress={() => setInfoModalPkg(item.packageName)} activeOpacity={0.7}>
                      {item.icon ? (
                        <Image source={{ uri: `data:image/png;base64,${item.icon}` }} style={styles.appliedIconImg} />
                      ) : (
                        <View style={styles.appliedIconFallback}>
                          <Text style={styles.appliedIconFallbackText}>{item.appName.charAt(0)}</Text>
                        </View>
                      )}
                      <TouchableOpacity
                        style={styles.appliedRemoveBadge}
                        onPress={() => handleRemoveAppliedApp(item.packageName)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.appliedRemoveBadgeText}>✕</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                    <Text style={styles.appliedItemLabel} numberOfLines={1}>{item.appName}</Text>
                  </View>
                ))}
                <TouchableOpacity style={styles.appliedItem} onPress={openAppSelect} activeOpacity={0.7}>
                  <View style={styles.appliedAddIcon}>
                    <Text style={styles.appliedAddIconText}>＋</Text>
                  </View>
                  <Text style={styles.appliedItemLabel}>앱 추가</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── 앱 선택 카드 ── */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>앱 선택</Text>
            <TouchableOpacity style={styles.appSelect} onPress={openAppSelect} activeOpacity={0.7}>
              <View style={styles.appIconWrap}>
                <View style={styles.appIconGrid}>
                  {[0, 1, 2, 3].map((i) => (
                    <View key={i} style={styles.appIconDot} />
                  ))}
                </View>
              </View>
              <Text style={styles.appSelectText}>{selectedAppLabel}</Text>
            </TouchableOpacity>
          </View>

          {/* ── 적용 방식 카드 ── */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>적용 방식</Text>
            <View style={styles.segmentRow}>
              <TouchableOpacity
                style={[styles.segmentBtn, applyMode === 'perDay' && styles.segmentBtnActive]}
                onPress={() => setApplyMode('perDay')}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.segmentText, applyMode === 'perDay' && styles.segmentTextActive]}
                >
                  매일 다르게 설정
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  styles.segmentBtnOutline,
                  applyMode === 'weekdayWeekend' && styles.segmentBtnActive,
                ]}
                onPress={() => setApplyMode('weekdayWeekend')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.segmentText,
                    applyMode === 'weekdayWeekend' && styles.segmentTextActive,
                  ]}
                >
                  주중/주말로 설정
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── 요일별 사용 시간 카드 ── */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>요일별 사용 시간</Text>

            {applyMode === 'perDay' ? (
              DAYS.map((day) => {
                const state = schedule[day.key];
                return (
                  <View key={day.key} style={styles.dayRow}>
                    <View style={[styles.dayBadge, { backgroundColor: day.badgeBg }]}>
                      <Text style={[styles.dayBadgeText, { color: day.badgeText }]}>
                        {day.short}
                      </Text>
                    </View>
                    <Text style={styles.dayLabel}>{day.label}</Text>
                    <View style={styles.minutesBox}>
                      <TextInput
                        style={styles.minutesInput}
                        value={state.minutes}
                        onChangeText={(v) => updateMinutes(day.key, v)}
                        keyboardType="number-pad"
                        maxLength={3}
                      />
                      <Text style={styles.minutesUnit}>분</Text>
                    </View>
                    <Switch
                      value={state.enabled}
                      onValueChange={() => toggleEnabled(day.key)}
                      trackColor={{ false: '#E3E1F0', true: PURPLE }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                );
              })
            ) : (
              <>
                <GroupRow
                  label="평일 (월~금)"
                  value={schedule.mon.minutes}
                  onChange={(v) => updateGroupMinutes('weekday', v)}
                />
                <GroupRow
                  label="주말 (토~일)"
                  value={schedule.sat.minutes}
                  onChange={(v) => updateGroupMinutes('weekend', v)}
                />
              </>
            )}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ── 저장하기 버튼 ── */}
        <View style={styles.saveWrap}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
            <Text style={styles.saveBtnText}>저장하기</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>

      {/* ── 앱 선택 모달 ── */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeAppSelectWithoutSaving}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderSpacer} />
              <Text style={styles.modalTitle}>앱 선택</Text>
              <TouchableOpacity
                onPress={closeAppSelectWithoutSaving}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>사용 시간을 설정할 앱을 선택해주세요</Text>

            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="앱 이름 검색"
                placeholderTextColor="#B0ACC7"
              />
            </View>

            <FlatList
              data={filteredApps}
              keyExtractor={(item) => item.packageName}
              style={styles.modalList}
              renderItem={({ item }) => {
                const isSelected = tempSelected.includes(item.packageName);
                return (
                  <TouchableOpacity
                    style={[styles.modalRow, isSelected && styles.modalRowSelected]}
                    onPress={() => toggleTempApp(item.packageName)}
                    activeOpacity={0.7}
                  >
                    {isSelected ? (
                      <View style={styles.checkCircle}>
                        <Text style={styles.checkMark}>✓</Text>
                      </View>
                    ) : item.icon ? (
                      <Image source={{ uri: `data:image/png;base64,${item.icon}` }} style={styles.modalAppIconImg} />
                    ) : (
                      <View style={styles.modalAppIconFallback}>
                        <Text style={styles.modalAppIconFallbackText}>{item.appName.charAt(0)}</Text>
                      </View>
                    )}
                    <Text style={styles.modalRowText}>{item.appName}</Text>
                  </TouchableOpacity>
                );
              }}
            />

            <View style={styles.modalFooterRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={closeAppSelectWithoutSaving} activeOpacity={0.8}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={confirmAppSelect} activeOpacity={0.85}>
                <Text style={styles.modalConfirmText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── 앱 정보(적용된 제한 내역) 모달 ── */}
      <Modal visible={infoModalPkg !== null} transparent animationType="fade" onRequestClose={() => setInfoModalPkg(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.infoSheet}>
            <TouchableOpacity
              onPress={() => setInfoModalPkg(null)}
              style={styles.infoCloseBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>

            {infoApp?.icon ? (
              <Image source={{ uri: `data:image/png;base64,${infoApp.icon}` }} style={styles.infoAppIcon} />
            ) : (
              <View style={styles.infoAppIconFallback}>
                <Text style={styles.infoAppIconFallbackText}>{(infoApp?.appName ?? infoModalPkg ?? '?').charAt(0)}</Text>
              </View>
            )}
            <Text style={styles.infoAppName}>{infoApp?.appName ?? infoModalPkg}</Text>
            <Text style={styles.infoSubtitle}>다음과 같이 제한 설정이 적용됩니다.</Text>

            {infoConfig && (
              <View style={styles.infoCard}>
                <View style={styles.infoApplyModeRow}>
                  <Text style={styles.infoApplyModeLabel}>⏰ 적용 방식</Text>
                  <Text style={styles.infoApplyModeValue}>
                    {infoConfig.applyMode === 'perDay' ? '매일 다르게 설정' : '주중/주말로 설정'}
                  </Text>
                </View>
                <Text style={styles.infoDaysLabel}>요일별 사용 시간</Text>
                {DAYS.map((day) => (
                  <View key={day.key} style={styles.infoDayRow}>
                    <View style={[styles.dayBadge, { backgroundColor: day.badgeBg }]}>
                      <Text style={[styles.dayBadgeText, { color: day.badgeText }]}>{day.short}</Text>
                    </View>
                    <Text style={styles.infoDayLabel}>{day.label}</Text>
                    <Text style={styles.infoDayMinutes}>
                      {infoConfig.days[day.key]?.enabled ? `${infoConfig.days[day.key].minutes} 분` : 'off'}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity style={styles.infoConfirmBtn} onPress={() => setInfoModalPkg(null)} activeOpacity={0.85}>
              <Text style={styles.infoConfirmText}>확인</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function GroupRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.dayRow}>
      <Text style={[styles.dayLabel, { marginLeft: 0 }]}>{label}</Text>
      <View style={styles.minutesBox}>
        <TextInput
          style={styles.minutesInput}
          value={value}
          onChangeText={onChange}
          keyboardType="number-pad"
          maxLength={3}
        />
        <Text style={styles.minutesUnit}>분</Text>
      </View>
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
  title: { fontSize: scaleFont(26), fontWeight: '800', color: TEXT_MAIN, maxWidth: HEADER_TEXT_MAX_W },
  subtitle: { fontSize: scaleFont(14), color: TEXT_SUB, marginTop: 4, maxWidth: HEADER_TEXT_MAX_W },
  character: { position: 'absolute', right: 4, top: -4, width: CHAR_SIZE, height: CHAR_SIZE },

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
  },
  cardLabel: { fontSize: 14, fontWeight: '700', color: PURPLE, marginBottom: 12 },

  appliedHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  clearAllText: { fontSize: 13, color: TEXT_SUB, fontWeight: '600' },
  appliedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 8 },
  appliedItem: { width: 64, alignItems: 'center' },
  appliedIconImg: { width: 52, height: 52, borderRadius: 16 },
  appliedIconFallback: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: PURPLE,
    alignItems: 'center', justifyContent: 'center',
  },
  appliedIconFallbackText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  appliedRemoveBadge: {
    position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#FF5A5F', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  appliedRemoveBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  appliedItemLabel: { fontSize: 11, color: TEXT_MAIN, fontWeight: '600', marginTop: 6, textAlign: 'center' },
  appliedAddIcon: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: PURPLE_LIGHT,
    alignItems: 'center', justifyContent: 'center',
  },
  appliedAddIconText: { color: PURPLE, fontSize: 22, fontWeight: '700' },

  appSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E7E4F5',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  appIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: PURPLE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  appIconGrid: { width: 14, height: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  appIconDot: { width: 6, height: 6, borderRadius: 2, backgroundColor: PURPLE },
  appSelectText: { flex: 1, fontSize: 15, fontWeight: '600', color: TEXT_MAIN },
  chevron: { fontSize: 16, color: TEXT_SUB },

  segmentRow: { flexDirection: 'row', gap: 10 },
  segmentBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  segmentBtnOutline: { borderWidth: 1, borderColor: '#E7E4F5' },
  segmentBtnActive: { backgroundColor: PURPLE, borderWidth: 0 },
  segmentText: { fontSize: 13, fontWeight: '700', color: TEXT_SUB },
  segmentTextActive: { color: '#FFFFFF' },

  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1EFFA',
  },
  dayBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dayBadgeText: { fontSize: 13, fontWeight: '700' },
  dayLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: TEXT_MAIN, marginLeft: 0 },
  minutesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E7E4F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
    minWidth: 84,
    justifyContent: 'center',
  },
  minutesInput: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_MAIN,
    minWidth: 28,
    textAlign: 'right',
    padding: 0,
  },
  minutesUnit: { fontSize: 14, color: TEXT_SUB, marginLeft: 4 },

  saveWrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
  },
  saveBtn: {
    backgroundColor: PURPLE,
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: PURPLE,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  // ── 앱 선택 모달 ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(20,16,40,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    maxHeight: '82%',
  },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalHeaderSpacer: { width: 24 },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: PURPLE, textAlign: 'center' },
  modalCloseBtn: { width: 24, alignItems: 'flex-end' },
  modalClose: { fontSize: 18, color: TEXT_SUB },
  modalSubtitle: { fontSize: 13, color: TEXT_SUB, textAlign: 'center', marginTop: 6 },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F1FB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 16,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: TEXT_MAIN, padding: 0 },

  modalList: { marginTop: 8, maxHeight: 380 },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  modalRowSelected: { backgroundColor: PURPLE_LIGHT },
  modalRowText: { fontSize: 15, fontWeight: '700', color: TEXT_MAIN, marginLeft: 12 },
  modalAppIconImg: { width: 34, height: 34, borderRadius: 10 },
  modalAppIconFallback: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAppIconFallbackText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  checkCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: '#fff', fontWeight: '900', fontSize: 16 },

  modalFooterRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: PURPLE,
    borderRadius: 30,
    paddingVertical: 15,
    alignItems: 'center',
  },
  modalCancelText: { color: PURPLE, fontWeight: '800', fontSize: 15 },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: PURPLE,
    borderRadius: 30,
    paddingVertical: 15,
    alignItems: 'center',
  },
  modalConfirmText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // ── 앱 정보 모달 ──
  infoSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    marginHorizontal: 24,
    marginBottom: 40,
    alignSelf: 'stretch',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    position: 'relative',
  },
  infoCloseBtn: { position: 'absolute', top: 16, right: 16, padding: 4 },
  infoAppIcon: { width: 56, height: 56, borderRadius: 16 },
  infoAppIconFallback: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: PURPLE,
    alignItems: 'center', justifyContent: 'center',
  },
  infoAppIconFallbackText: { color: '#fff', fontWeight: '800', fontSize: 20 },
  infoAppName: { fontSize: 18, fontWeight: '800', color: TEXT_MAIN, marginTop: 10 },
  infoSubtitle: { fontSize: 13, color: TEXT_SUB, marginTop: 6, textAlign: 'center' },
  infoCard: {
    width: '100%',
    backgroundColor: '#F8F7FD',
    borderRadius: 18,
    padding: 16,
    marginTop: 18,
  },
  infoApplyModeRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14,
  },
  infoApplyModeLabel: { fontSize: 13, color: TEXT_SUB, fontWeight: '600' },
  infoApplyModeValue: { fontSize: 13, color: PURPLE, fontWeight: '800' },
  infoDaysLabel: { fontSize: 13, fontWeight: '700', color: PURPLE, marginBottom: 8 },
  infoDayRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  infoDayLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: TEXT_MAIN },
  infoDayMinutes: { fontSize: 14, fontWeight: '700', color: TEXT_MAIN },
  infoConfirmBtn: {
    width: '100%', backgroundColor: PURPLE, borderRadius: 30, paddingVertical: 15,
    alignItems: 'center', marginTop: 20,
  },
  infoConfirmText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
