import { NativeModules } from 'react-native';

export const { UsageStatsModule, OverlayModule } = NativeModules;

export interface InstalledApp {
  packageName: string;
  appName: string;
  icon: string;
}

export interface LimitedApp {
  packageName: string;
  limitMinutes: number;
}

export const checkUsagePermission = async (): Promise<boolean> => {
  return await UsageStatsModule.hasUsagePermission();
};

export const requestUsagePermission = () => {
  UsageStatsModule.openUsageAccessSettings();
};

export const checkOverlayPermission = async (): Promise<boolean> => {
  return await OverlayModule.hasOverlayPermission();
};

export const requestOverlayPermission = () => {
  OverlayModule.requestOverlayPermission();
};

export const getInstalledApps = async (): Promise<InstalledApp[]> => {
  return await UsageStatsModule.getInstalledApps();
};

export const startMonitoring = (packageName: string, limitMinutes: number) => {
  UsageStatsModule.startMonitoring(packageName, limitMinutes);
};

export const removeLimit = (packageName: string) => {
  UsageStatsModule.removeLimit(packageName);
};

export const getLimitedApps = async (): Promise<LimitedApp[]> => {
  return await UsageStatsModule.getLimitedApps();
};

export interface UsageStat {
  packageName: string;
  appName: string;
  icon: string;
  usedMinutes: number;
}

export const getTodayUsageStats = async (): Promise<UsageStat[]> => {
  return await UsageStatsModule.getTodayUsageStats();
};

export const { PasswordModule } = NativeModules;

export const hasPassword = async (): Promise<boolean> => {
  return await PasswordModule.hasPassword();
};

export const setPassword = async (pw: string): Promise<boolean> => {
  return await PasswordModule.setPassword(pw);
};

export const verifyPassword = async (pw: string): Promise<boolean> => {
  return await PasswordModule.verifyPassword(pw);
};
