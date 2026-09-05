import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  NativeModules,
} from 'react-native';
import { getInstalledApps, InstalledApp } from '../native/NativeModules';
import { DayKey } from '../utils/daySchedule';
import { CHAR_SIZE, HEADER_TEXT_MAX_W, MAX_FONT_SCALE, scaleFont, scaleSize } from '../constants/responsive';
import {
  RestTimeConfig,
  RestApplyMode,
  loadRestTime,
  saveRestTime,
  clearRestTime,
  removeAppFromRestTime,
  formatDuration,
} from '../utils/restTime';

const PURPLE = '#6E62E5';
const PURPLE_LIGHT = '#EDEBFC';
const TEXT_MAIN = '#2B2740';
const TEXT_SUB = '#8B87A6';

const DAYS: { key: DayKey; short: string }[] = [
  { key: 'mon', short: '월' },
  { key: 'tue', short: '화' },
  { key: 'wed', short: '수' },
  { key: 'thu', short: '목' },
  { key: 'fri', short: '금' },
  { key: 'sat', short: '토' },
  { key: 'sun', short: '일' },
];
const ALL_DAY_KEYS: DayKey[] = DAYS.map((d) => d.key);

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

interface Props {
  navigation?: { goBack: () => void };
  onBack?: () => void;
}

type AppListItem = { packageName: string; appName: string; icon?: string };

export default function RestTimeScreen({ navigation, onBack }: Props) {
  const handleBack = onBack ?? (() => navigation?.goBack());

  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [appModalVisible, setAppModalVisible] = useState(false);
  const [tempSelected, setTempSelected] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [enabled, setEnabled] = useState(true);
  const [days, setDays] = useState<DayKey[]>(ALL_DAY_KEYS);
  const [startTime, setStartTime] = useState('22:00');
  const [endTime, setEndTime] = useState('07:00');
  const [applyMode, setApplyMode] = useState<RestApplyMode>('block');

  const [timePickerTarget, setTimePickerTarget] = useState<'start' | 'end' | null>(null);
  const [pickerHour, setPickerHour] = useState(22);
  const [pickerMinute, setPickerMinute] = useState(0);

  // ── 이미 적용(저장)된 휴식 시간 설정 ──
  const [appliedConfig, setAppliedConfig] = useState<RestTimeConfig | null>(null);
  const [infoModalPkg, setInfoModalPkg] = useState<string | null>(null);

  const refreshAppliedConfig = useCallback(() => {
    loadRestTime().then(setAppliedConfig).catch(() => {});
  }, []);

  useEffect(() => {
    getInstalledApps()
      .then((list) => setInstalledApps(list.sort((a, b) => a.appName.localeCompare(b.appName))))
      .catch(() => {});
    loadRestTime().then((config) => {
      if (!config) return;
      setSelectedPackages(config.packages);
      setEnabled(config.enabled);
      setDays(config.days);
      setStartTime(config.startTime);
      setEndTime(config.endTime);
      setApplyMode(config.applyMode);
    });
    refreshAppliedConfig();
  }, [refreshAppliedConfig]);

  const appMap = useMemo(() => {
    const map = new Map<string, InstalledApp>();
    installedApps.forEach((a) => map.set(a.packageName, a));
    return map;
  }, [installedApps]);

  const appliedApps: AppListItem[] = useMemo(() => {
    if (!appliedConfig) return [];
    return appliedConfig.packages.map((pkg) => {
      const app = appMap.get(pkg);
      return { packageName: pkg, appName: app?.appName ?? pkg, icon: app?.icon };
    });
  }, [appliedConfig, appMap]);

  const handleRemoveAppliedApp = (pkg: string) => {
    const app = appMap.get(pkg);
    Alert.alert(
      '휴식 시간 설정 해제',
      `${app?.appName ?? pkg}의 휴식 시간 설정을 해제할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '해제',
          style: 'destructive',
          onPress: async () => {
            await removeAppFromRestTime(pkg);
            const next = await loadRestTime();
            setAppliedConfig(next);
            if (next) {
              NativeModules.OverlayModule?.setRestTimeConfig?.(JSON.stringify(next));
            } else {
              NativeModules.OverlayModule?.clearRestTimeConfig?.();
            }
          },
        },
      ]
    );
  };

  const appliedDaysLabel = useMemo(() => {
    if (!appliedConfig) return '';
    if (appliedConfig.days.length === 7) return '매일';
    return DAYS.filter((d) => appliedConfig.days.includes(d.key)).map((d) => d.short).join(', ');
  }, [appliedConfig]);

  const handleClearAllApplied = () => {
    if (appliedApps.length === 0) return;
    Alert.alert(
      '전체 삭제',
      '적용된 휴식 시간 설정을 모두 삭제할까요?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '전체 삭제',
          style: 'destructive',
          onPress: async () => {
            await clearRestTime();
            setAppliedConfig(null);
            NativeModules.OverlayModule?.clearRestTimeConfig?.();
          },
        },
      ]
    );
  };

  const selectedAppLabel = useMemo(() => {
    if (selectedPackages.length === 0) return '없음';
    if (selectedPackages.length === 1) {
      return appMap.get(selectedPackages[0])?.appName ?? '앱 1개';
    }
    return `앱 ${selectedPackages.length}개`;
  }, [selectedPackages, appMap]);

  const openAppSelect = () => {
    setTempSelected(selectedPackages);
    setSearchQuery('');
    setAppModalVisible(true);
  };
  const closeAppSelect = () => setAppModalVisible(false);
  const confirmAppSelect = () => {
    setSelectedPackages(tempSelected);
    setAppModalVisible(false);
  };
  const toggleTempApp = (pkg: string) => {
    setTempSelected((prev) => (prev.includes(pkg) ? prev.filter((p) => p !== pkg) : [...prev, pkg]));
  };
  const filteredApps: AppListItem[] = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return q ? installedApps.filter((a) => a.appName.toLowerCase().includes(q)) : installedApps;
  }, [installedApps, searchQuery]);

  const toggleDay = (key: DayKey) => {
    setDays((prev) => (prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key]));
  };
  const selectAllDays = () => setDays(ALL_DAY_KEYS);

  const openTimePicker = (target: 'start' | 'end') => {
    const value = target === 'start' ? startTime : endTime;
    const [h, m] = value.split(':').map((n) => parseInt(n, 10));
    setPickerHour(h);
    setPickerMinute(MINUTES.includes(m) ? m : 0);
    setTimePickerTarget(target);
  };
  const confirmTimePicker = () => {
    const formatted = `${String(pickerHour).padStart(2, '0')}:${String(pickerMinute).padStart(2, '0')}`;
    if (timePickerTarget === 'start') setStartTime(formatted);
    if (timePickerTarget === 'end') setEndTime(formatted);
    setTimePickerTarget(null);
  };

  const durationText = useMemo(() => formatDuration(startTime, endTime), [startTime, endTime]);

  const handleSave = async () => {
    if (selectedPackages.length === 0) {
      Alert.alert('앱을 선택해주세요', '휴식 시간을 적용할 앱을 하나 이상 선택해야 저장할 수 있어요.');
      return;
    }
    if (days.length === 0) {
      Alert.alert('적용 요일을 선택해주세요', '휴식 시간을 적용할 요일을 하나 이상 선택해야 저장할 수 있어요.');
      return;
    }

    const config: RestTimeConfig = {
      packages: selectedPackages,
      enabled,
      days,
      startTime,
      endTime,
      applyMode,
      updatedAt: Date.now(),
    };

    try {
      await saveRestTime(config);
      NativeModules.OverlayModule?.setRestTimeConfig?.(JSON.stringify(config));
      setAppliedConfig(config);
      Alert.alert('저장 완료', '휴식 시간 설정이 적용됐어요.');
    } catch (e) {
      console.warn('휴식 시간 설정 저장 실패', e);
    }
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
            <Text style={styles.title} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={2}>휴식 시간 설정</Text>
            <Text style={styles.subtitle} maxFontSizeMultiplier={MAX_FONT_SCALE} numberOfLines={2}>앱 사용을 잠시 쉬는 시간을 설정해요</Text>
            <Image source={require('../assets/character_rest.png')} style={styles.character} resizeMode="contain" />
          </View>

          {/* ── 적용된 앱 리스트 ── */}
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

          {/* ── 앱 선택 ── */}
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

          {/* ── 휴식 시간 사용 ── */}
          <View style={styles.card}>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>휴식 시간 사용</Text>
                <Text style={styles.toggleDesc}>설정한 시간에는 선택한 앱 사용이 제한돼요</Text>
              </View>
              <Switch
                value={enabled}
                onValueChange={setEnabled}
                trackColor={{ false: '#E3E1F0', true: PURPLE }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.infoBox}>
              <Image source={require('../assets/icon_rest_clock.png')} style={styles.infoIcon} resizeMode="contain" />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoTitle}>휴식 시간이란?</Text>
                <Text style={styles.infoDesc}>
                  공부, 집중, 수면 등 휴식이 필요할 때{'\n'}잠시 앱 사용을 멈추고 쉬는 시간을 도와줘요.
                </Text>
              </View>
            </View>
          </View>

          {/* ── 적용 요일 ── */}
          <View style={styles.card}>
            <View style={styles.appliedHeaderRow}>
              <Text style={styles.cardLabel}>적용 요일</Text>
              <TouchableOpacity onPress={selectAllDays} style={styles.everydayBtn}>
                <Text style={styles.everydayText}>매일</Text>
                <Text style={styles.everydayChevron}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.daysRow}>
              {DAYS.map((day) => {
                const active = days.includes(day.key);
                return (
                  <TouchableOpacity
                    key={day.key}
                    style={[styles.dayCircle, active && styles.dayCircleActive]}
                    onPress={() => toggleDay(day.key)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dayCircleText, active && styles.dayCircleTextActive]}>{day.short}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── 휴식 시간 설정 (시작/종료 시간) ── */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>휴식 시간 설정</Text>

            <TouchableOpacity style={styles.timeRow} onPress={() => openTimePicker('start')} activeOpacity={0.7}>
              <View style={styles.timeIconWrap}>
                <Image source={require('../assets/icon_rest_moon.png')} style={styles.timeIconImg} resizeMode="contain" />
              </View>
              <Text style={styles.timeLabel}>시작 시간</Text>
              <View style={styles.timeValueBox}>
                <Text style={styles.timeValueText}>{startTime}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.timeRow} onPress={() => openTimePicker('end')} activeOpacity={0.7}>
              <View style={styles.timeIconWrap}>
                <Image source={require('../assets/icon_rest_sunrise.png')} style={styles.timeIconImg} resizeMode="contain" />
              </View>
              <Text style={styles.timeLabel}>종료 시간</Text>
              <View style={styles.timeValueBox}>
                <Text style={styles.timeValueText}>{endTime}</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.durationBox}>
              <Text style={styles.durationText}>
                총 휴식 시간: <Text style={styles.durationHighlight}>{durationText}</Text>
              </Text>
            </View>
          </View>

          {/* ── 적용 방식 ── */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>적용 방식</Text>

            <View style={styles.modeRowStatic}>
              <Image source={require('../assets/icon_rest_lock.png')} style={styles.modeIconImg} resizeMode="contain" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.modeTitle}>앱 사용 차단</Text>
                <Text style={styles.modeDesc}>휴식 시간 동안 선택한 앱 사용을 완전히 차단해요.</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={styles.saveWrap}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
            <Text style={styles.saveBtnText}>저장하기</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>

      {/* ── 앱 선택 모달 ── */}
      <Modal visible={appModalVisible} transparent animationType="slide" onRequestClose={closeAppSelect}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderSpacer} />
              <Text style={styles.modalTitle}>앱 선택</Text>
              <TouchableOpacity onPress={closeAppSelect} style={styles.modalCloseBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>휴식 시간을 적용할 앱을 선택해주세요</Text>

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
              <TouchableOpacity style={styles.modalCancelBtn} onPress={closeAppSelect} activeOpacity={0.8}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={confirmAppSelect} activeOpacity={0.85}>
                <Text style={styles.modalConfirmText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── 시간 선택 모달 ── */}
      <Modal visible={timePickerTarget !== null} transparent animationType="fade" onRequestClose={() => setTimePickerTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.timeSheet}>
            <Text style={styles.modalTitle}>{timePickerTarget === 'start' ? '시작 시간' : '종료 시간'}</Text>
            <View style={styles.timePickerRow}>
              <FlatList
                data={HOURS}
                keyExtractor={(h) => `h${h}`}
                style={styles.timePickerColumn}
                showsVerticalScrollIndicator={false}
                renderItem={({ item: h }) => (
                  <TouchableOpacity
                    style={[styles.timePickerItem, h === pickerHour && styles.timePickerItemActive]}
                    onPress={() => setPickerHour(h)}
                  >
                    <Text style={[styles.timePickerItemText, h === pickerHour && styles.timePickerItemTextActive]}>
                      {String(h).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                )}
              />
              <Text style={styles.timePickerColon}>:</Text>
              <FlatList
                data={MINUTES}
                keyExtractor={(m) => `m${m}`}
                style={styles.timePickerColumn}
                showsVerticalScrollIndicator={false}
                renderItem={({ item: m }) => (
                  <TouchableOpacity
                    style={[styles.timePickerItem, m === pickerMinute && styles.timePickerItemActive]}
                    onPress={() => setPickerMinute(m)}
                  >
                    <Text style={[styles.timePickerItemText, m === pickerMinute && styles.timePickerItemTextActive]}>
                      {String(m).padStart(2, '0')}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
            <View style={styles.modalFooterRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setTimePickerTarget(null)} activeOpacity={0.8}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={confirmTimePicker} activeOpacity={0.85}>
                <Text style={styles.modalConfirmText}>확인</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── 앱 정보(적용된 휴식 시간 내역) 모달 ── */}
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

            {(() => {
              const infoApp = infoModalPkg ? appMap.get(infoModalPkg) : undefined;
              return infoApp?.icon ? (
                <Image source={{ uri: `data:image/png;base64,${infoApp.icon}` }} style={styles.infoAppIcon} />
              ) : (
                <View style={styles.infoAppIconFallback}>
                  <Text style={styles.infoAppIconFallbackText}>{(infoApp?.appName ?? infoModalPkg ?? '?').charAt(0)}</Text>
                </View>
              );
            })()}
            <Text style={styles.infoAppName}>{infoModalPkg ? (appMap.get(infoModalPkg)?.appName ?? infoModalPkg) : ''}</Text>
            <Text style={styles.infoSubtitle}>다음과 같이 휴식 시간이 적용됩니다.</Text>

            {appliedConfig && (
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoRowLabel}>적용 요일</Text>
                  <Text style={styles.infoRowValue}>{appliedDaysLabel}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoRowLabel}>휴식 시간</Text>
                  <Text style={styles.infoRowValue}>{appliedConfig.startTime} ~ {appliedConfig.endTime}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoRowLabel}>적용 방식</Text>
                  <Text style={styles.infoRowValue}>
                    앱 사용 차단
                  </Text>
                </View>
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

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F3F1FB' },
  bg: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12 },

  header: { paddingTop: 8, paddingBottom: 8, position: 'relative' },
  backArrow: { fontSize: 24, color: TEXT_MAIN, marginBottom: 12 },
  title: { fontSize: scaleFont(26), fontWeight: '800', color: TEXT_MAIN, maxWidth: HEADER_TEXT_MAX_W },
  subtitle: { fontSize: scaleFont(14), color: TEXT_SUB, marginTop: 4, maxWidth: HEADER_TEXT_MAX_W },
  character: { position: 'absolute', right: 4, top: 8, width: CHAR_SIZE, height: CHAR_SIZE, zIndex: 10, elevation: 10 },

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
    width: scaleSize(40), height: scaleSize(40), borderRadius: 12, backgroundColor: PURPLE_LIGHT,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  appIconGrid: { width: 14, height: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  appIconDot: { width: 6, height: 6, borderRadius: 2, backgroundColor: PURPLE },
  appSelectText: { flex: 1, fontSize: 15, fontWeight: '600', color: TEXT_MAIN },

  toggleRow: { flexDirection: 'row', alignItems: 'center' },
  toggleTitle: { fontSize: 15, fontWeight: '700', color: TEXT_MAIN },
  toggleDesc: { fontSize: 12, color: TEXT_SUB, marginTop: 3 },

  infoBox: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: PURPLE_LIGHT,
    borderRadius: 14, padding: 14, marginTop: 16,
  },
  infoIcon: { width: 28, height: 28, marginRight: 10, marginTop: 1 },
  infoTitle: { fontSize: 13, fontWeight: '800', color: TEXT_MAIN },
  infoDesc: { fontSize: 12, color: TEXT_SUB, marginTop: 4, lineHeight: 18 },

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

  infoSheet: {
    backgroundColor: '#FFFFFF', borderRadius: 28, marginHorizontal: 24, marginBottom: 40,
    alignSelf: 'stretch', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20,
    alignItems: 'center', position: 'relative',
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
  infoCard: { width: '100%', backgroundColor: '#F8F7FD', borderRadius: 18, padding: 16, marginTop: 18 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10,
  },
  infoRowLabel: { fontSize: 13, color: TEXT_SUB, fontWeight: '600' },
  infoRowValue: { fontSize: 13, color: PURPLE, fontWeight: '800' },
  infoConfirmBtn: {
    width: '100%', backgroundColor: PURPLE, borderRadius: 30, paddingVertical: 15,
    alignItems: 'center', marginTop: 8,
  },
  infoConfirmText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  everydayBtn: { flexDirection: 'row', alignItems: 'center' },
  everydayText: { fontSize: 13, color: TEXT_SUB, fontWeight: '600' },
  everydayChevron: { fontSize: 14, color: TEXT_SUB, marginLeft: 2 },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  dayCircle: {
    width: scaleSize(40), height: scaleSize(40), borderRadius: scaleSize(20), borderWidth: 1.5, borderColor: '#E7E4F5',
    alignItems: 'center', justifyContent: 'center',
  },
  dayCircleActive: { borderColor: PURPLE, backgroundColor: PURPLE_LIGHT },
  dayCircleText: { fontSize: scaleFont(14), fontWeight: '700', color: TEXT_SUB },
  dayCircleTextActive: { color: PURPLE },

  timeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  timeIconWrap: {
    width: scaleSize(40), height: scaleSize(40), borderRadius: 12, backgroundColor: PURPLE_LIGHT,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  timeIconImg: { width: scaleSize(30), height: scaleSize(30) },
  timeLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: TEXT_MAIN },
  timeValueBox: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E7E4F5',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8,
  },
  timeValueText: { fontSize: 15, fontWeight: '700', color: TEXT_MAIN, marginRight: 6 },
  timeChevron: { fontSize: 14, color: TEXT_SUB },
  durationBox: { backgroundColor: PURPLE_LIGHT, borderRadius: 12, padding: 12, marginTop: 8, alignItems: 'center' },
  durationText: { fontSize: 13, color: TEXT_MAIN, fontWeight: '600' },
  durationHighlight: { color: PURPLE, fontWeight: '800' },

  modeRowStatic: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  modeTitle: { fontSize: 14, fontWeight: '700', color: TEXT_MAIN },
  modeDesc: { fontSize: 11, color: TEXT_SUB, marginTop: 2 },
  modeIconImg: { width: 36, height: 36 },

  saveWrap: { position: 'absolute', left: 20, right: 20, bottom: 20 },
  saveBtn: {
    backgroundColor: PURPLE, borderRadius: 30, paddingVertical: 18, alignItems: 'center',
    shadowColor: PURPLE, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  // ── 앱 선택 모달 ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(20,16,40,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20, maxHeight: '82%',
  },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalHeaderSpacer: { width: 24 },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: PURPLE, textAlign: 'center' },
  modalCloseBtn: { width: 24, alignItems: 'flex-end' },
  modalClose: { fontSize: 18, color: TEXT_SUB },
  modalSubtitle: { fontSize: 13, color: TEXT_SUB, textAlign: 'center', marginTop: 6 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F1FB', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10, marginTop: 16,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: TEXT_MAIN, padding: 0 },

  modalList: { marginTop: 8, maxHeight: 380 },
  modalRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 14 },
  modalRowSelected: { backgroundColor: PURPLE_LIGHT },
  modalRowText: { fontSize: 15, fontWeight: '700', color: TEXT_MAIN, marginLeft: 12 },
  modalAppIconImg: { width: 34, height: 34, borderRadius: 10 },
  modalAppIconFallback: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: PURPLE,
    alignItems: 'center', justifyContent: 'center',
  },
  modalAppIconFallbackText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  checkCircle: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: PURPLE,
    alignItems: 'center', justifyContent: 'center',
  },
  checkMark: { color: '#fff', fontWeight: '900', fontSize: 16 },

  modalFooterRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalCancelBtn: { flex: 1, borderWidth: 1.5, borderColor: PURPLE, borderRadius: 30, paddingVertical: 15, alignItems: 'center' },
  modalCancelText: { color: PURPLE, fontWeight: '800', fontSize: 15 },
  modalConfirmBtn: { flex: 1, backgroundColor: PURPLE, borderRadius: 30, paddingVertical: 15, alignItems: 'center' },
  modalConfirmText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // ── 시간 선택 모달 ──
  timeSheet: { backgroundColor: '#FFFFFF', borderRadius: 24, marginHorizontal: 32, padding: 20 },
  timePickerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16, height: 220 },
  timePickerColumn: { width: 70 },
  timePickerColon: { fontSize: 20, fontWeight: '800', color: TEXT_MAIN, marginHorizontal: 8 },
  timePickerItem: { paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  timePickerItemActive: { backgroundColor: PURPLE_LIGHT },
  timePickerItemText: { fontSize: 17, color: TEXT_SUB, fontWeight: '600' },
  timePickerItemTextActive: { color: PURPLE, fontWeight: '800' },
});
