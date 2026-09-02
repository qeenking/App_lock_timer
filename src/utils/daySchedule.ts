import AsyncStorage from '@react-native-async-storage/async-storage';

export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export const DAY_KEYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export type DayScheduleConfig = {
  /** packages를 정렬해 join한 문자열. 저장 시 같은 id는 덮어씁니다. */
  id: string;
  /** 이 설정이 적용되는 앱 패키지명 목록 (항상 1개 이상). */
  packages: string[];
  applyMode: 'perDay' | 'weekdayWeekend';
  days: Record<DayKey, { minutes: number; enabled: boolean }>;
  updatedAt: number;
};

const STORAGE_KEY = 'AppLockTimer:daySchedules';

export function makeScheduleId(packages: string[]): string {
  return [...packages].sort().join(',');
}

export async function loadDaySchedules(): Promise<DayScheduleConfig[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('요일별 설정 불러오기 실패', e);
    return [];
  }
}

async function writeDaySchedules(list: DayScheduleConfig[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export async function saveDaySchedule(config: DayScheduleConfig): Promise<void> {
  const list = await loadDaySchedules();
  const next = list.filter((c) => c.id !== config.id);
  next.push(config);
  await writeDaySchedules(next);
}

/** 저장된 요일별 설정을 모두 삭제합니다. */
export async function clearAllDaySchedules(): Promise<void> {
  await writeDaySchedules([]);
}

/** 특정 앱을 요일별 설정에서 완전히 제외합니다 (포함된 설정에서 제거, 남는 앱이 없으면 설정 자체를 삭제). */
export async function removeAppFromDaySchedules(pkg: string): Promise<void> {
  const list = await loadDaySchedules();
  const next = list
    .map((c) => {
      if (!c.packages.includes(pkg)) return c;
      const remaining = c.packages.filter((p) => p !== pkg);
      if (remaining.length === 0) return null; // 이 설정에 남는 앱이 없으면 삭제
      return { ...c, packages: remaining, id: makeScheduleId(remaining) };
    })
    .filter((c): c is DayScheduleConfig => c !== null);

  await writeDaySchedules(next);
}

/** 요일별 설정에 등장하는 모든 패키지명을 중복 없이 반환합니다. */
export function getAppliedPackages(configs: DayScheduleConfig[]): string[] {
  const set = new Set<string>();
  configs.forEach((c) => c.packages.forEach((p) => set.add(p)));
  return Array.from(set);
}

/** 특정 앱에 적용되는 설정을 찾습니다. */
export function findConfigForPackage(
  configs: DayScheduleConfig[],
  pkg: string
): DayScheduleConfig | undefined {
  return configs.find((c) => c.packages.includes(pkg));
}

/** 이 앱이 요일별 설정의 영향을 받고 있는지 확인합니다. */
export function isPackageDayScheduled(configs: DayScheduleConfig[], pkg: string): boolean {
  return configs.some((c) => c.packages.includes(pkg));
}

/** 오늘의 요일 키를 반환합니다 (0=일요일 기준 JS Date.getDay()를 변환). */
export function todayKey(): DayKey {
  const idx = new Date().getDay(); // 0=Sun, 1=Mon, ... 6=Sat
  const map: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return map[idx];
}

/**
 * 오늘 요일 기준으로 각 패키지에 적용해야 할 제한 분(分)을 계산합니다.
 * (allPackageNames 파라미터는 과거 '모든 앱' 설정 지원용으로 남겨둔 것으로, 현재는 사용하지 않습니다.)
 */
export function computeTodayMinutesMap(
  configs: DayScheduleConfig[],
  _allPackageNames: string[]
): Record<string, number> {
  const key = todayKey();
  const result: Record<string, number> = {};

  configs.forEach((c) => {
    const day = c.days[key];
    c.packages.forEach((pkg) => {
      if (day?.enabled && day.minutes > 0) {
        result[pkg] = day.minutes;
      } else {
        delete result[pkg];
      }
    });
  });

  return result;
}
