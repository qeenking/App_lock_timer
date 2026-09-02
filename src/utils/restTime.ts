import AsyncStorage from '@react-native-async-storage/async-storage';
import { DayKey, todayKey } from './daySchedule';

export type RestApplyMode = 'block';

export type RestTimeConfig = {
  /** 대상 앱 패키지명 목록 (항상 1개 이상). */
  packages: string[];
  enabled: boolean;
  /** 적용 요일. */
  days: DayKey[];
  /** 'HH:MM' 24시간 형식. */
  startTime: string;
  endTime: string;
  applyMode: RestApplyMode;
  updatedAt: number;
};

const STORAGE_KEY = 'AppLockTimer:restTime';

export async function loadRestTime(): Promise<RestTimeConfig | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as RestTimeConfig;
  } catch (e) {
    console.warn('휴식 시간 설정 불러오기 실패', e);
    return null;
  }
}

export async function saveRestTime(config: RestTimeConfig): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export async function clearRestTime(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

/** 이 앱이 휴식 시간 설정에 등록돼 있는지 확인합니다 (지금 활성 상태인지와는 무관). */
export function isPackageRestScheduled(config: RestTimeConfig | null, pkg: string): boolean {
  return !!config && config.packages.includes(pkg);
}

/** 특정 앱을 휴식 시간 설정에서 제거합니다. 남는 앱이 없으면 설정 자체를 삭제합니다. */
export async function removeAppFromRestTime(pkg: string): Promise<void> {
  const config = await loadRestTime();
  if (!config || !config.packages.includes(pkg)) return;
  const remaining = config.packages.filter((p) => p !== pkg);
  if (remaining.length === 0) {
    await clearRestTime();
  } else {
    await saveRestTime({ ...config, packages: remaining, updatedAt: Date.now() });
  }
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  return h * 60 + m;
}

/** 지금 이 순간이 설정된 휴식 시간대에 해당하는지 확인합니다 (자정을 넘기는 구간도 처리). */
export function isRestActiveNow(config: RestTimeConfig): boolean {
  if (!config.enabled) return false;
  if (!config.days.includes(todayKey())) return false;

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(config.startTime);
  const end = toMinutes(config.endTime);

  if (start === end) return false;
  if (start < end) {
    return nowMin >= start && nowMin < end;
  }
  // 자정을 넘기는 경우 (예: 22:00 ~ 07:00)
  return nowMin >= start || nowMin < end;
}

export function formatDuration(startTime: string, endTime: string): string {
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);
  let diff = end - start;
  if (diff <= 0) diff += 24 * 60;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}
