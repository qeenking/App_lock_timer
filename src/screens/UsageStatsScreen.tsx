import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  Image,
  ImageBackground,
  StatusBar,
  Platform,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  UsageStat,
  getTodayUsageStats,
  checkUsagePermission,
  requestUsagePermission,
} from '../native/NativeModules';

const PURPLE = '#7C6FEF';
const PURPLE_DARK = '#5B4FCF';
const CARD_BG = '#FFFFFF';

export default function UsageStatsScreen() {
  const insets = useSafeAreaInsets();
  // 일부 기기(엣지투엣지 적용된 Android 15+)에서 insets.top이 0으로 잡히는 경우를 대비한 안전장치
  const topPad = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0, 28);
  const [stats, setStats] = useState<UsageStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [noPermission, setNoPermission] = useState(false);

  const load = useCallback(async () => {
    setErrorMsg(null);
    setNoPermission(false);
    try {
      const hasPermission = await checkUsagePermission();
      if (!hasPermission) {
        setNoPermission(true);
        return;
      }
      const data = await getTodayUsageStats();
      data.sort((a, b) => b.usedMinutes - a.usedMinutes);
      setStats(data);
    } catch (e: any) {
      setErrorMsg(String(e?.message ?? e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}분`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
  };

  const maxMinutes = stats.length > 0 ? stats[0].usedMinutes : 1;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#6E62E5" />
      <ImageBackground
        source={require('../assets/main_background.png')}
        style={styles.bg}
        resizeMode="cover"
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 90 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <View style={[styles.header, { paddingTop: topPad + 16 }]}>
            <Text style={styles.headerTitle}>오늘 사용 통계</Text>
          </View>

          <View style={styles.body}>
            <View style={styles.listCard}>
              {loading ? (
                <Text style={styles.emptyText}>불러오는 중...</Text>
              ) : noPermission ? (
                <View style={{ alignItems: 'center', marginTop: 40 }}>
                  <Text style={styles.emptyText}>사용 데이터 접근 권한이 필요해요</Text>
                  <TouchableOpacity style={styles.permBtn} onPress={requestUsagePermission}>
                    <Text style={styles.permBtnText}>설정으로 이동</Text>
                  </TouchableOpacity>
                </View>
              ) : errorMsg ? (
                <Text style={styles.emptyText}>오류: {errorMsg}</Text>
              ) : stats.length === 0 ? (
                <Text style={styles.emptyText}>오늘 사용 기록이 아직 없어요</Text>
              ) : (
                <FlatList
                  data={stats}
                  keyExtractor={(item) => item.packageName}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <View style={styles.row}>
                      {item.icon ? (
                        <Image source={{ uri: `data:image/png;base64,${item.icon}` }} style={styles.icon} />
                      ) : (
                        <View style={styles.iconFallback}><Text style={styles.iconFallbackText}>{item.appName.charAt(0)}</Text></View>
                      )}
                      <View style={{ flex: 1 }}>
                        <View style={styles.rowTop}>
                          <Text style={styles.appName} numberOfLines={1}>{item.appName}</Text>
                          <Text style={styles.timeText}>{formatTime(item.usedMinutes)}</Text>
                        </View>
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              { width: `${Math.max(4, (item.usedMinutes / maxMinutes) * 100)}%` },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                  )}
                />
              )}
            </View>
          </View>
        </ScrollView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#8B7FF0' },
  bg: { flex: 1 },
  scroll: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '800' },
  body: { paddingHorizontal: 16, paddingTop: 8 },
  listCard: { backgroundColor: CARD_BG, borderRadius: 20, padding: 16, marginBottom: 12 },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#8B87A8', fontSize: 14, paddingHorizontal: 20 },
  permBtn: { backgroundColor: PURPLE, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24, marginTop: 16 },
  permBtnText: { color: '#fff', fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F1FC' },
  icon: { width: 40, height: 40, borderRadius: 10, marginRight: 12 },
  iconFallback: { width: 40, height: 40, borderRadius: 12, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  iconFallbackText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  appName: { flex: 1, fontSize: 14, fontWeight: '700', color: '#2C2A3D', marginRight: 8 },
  timeText: { fontSize: 13, fontWeight: '800', color: PURPLE_DARK },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: '#EEEBFB', overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: PURPLE },
});
