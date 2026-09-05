import { Dimensions } from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');

export const IS_SMALL = SCREEN_W < 360;

// 캐릭터 크기: 화면 폭의 32%, 100~130 클램프
export const CHAR_SIZE = Math.round(
  Math.min(130, Math.max(100, SCREEN_W * 0.32))
);

// 헤더 텍스트 최대 폭 (캐릭터 영역 회피)
export const HEADER_TEXT_MAX_W = Math.round(SCREEN_W - CHAR_SIZE - 40);

// 시스템 글자 확대 상한
export const MAX_FONT_SCALE = 1.3;

// 작은 폰에서 폰트 축소
export const scaleFont = (size: number) => (IS_SMALL ? size - 2 : size);

// 아이콘 스케일: 작은 폰에서 축소, 큰 폰에서 상한
export const scaleSize = (size: number) =>
  Math.round(Math.min(size * 1.1, Math.max(size * 0.85, (SCREEN_W / 390) * size)));
