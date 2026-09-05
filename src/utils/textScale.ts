import { Text, TextInput } from 'react-native';
import { MAX_FONT_SCALE } from '../constants/responsive';

/**
 * 앱 전역 Text/TextInput 의 시스템 글꼴 확대 상한을 지정한다.
 * App.tsx 최상단에서 1회 호출.
 */
export function applyGlobalTextScale() {
  const TextAny = Text as any;
  const TextInputAny = TextInput as any;

  TextAny.defaultProps = TextAny.defaultProps || {};
  TextAny.defaultProps.maxFontSizeMultiplier = MAX_FONT_SCALE;

  TextInputAny.defaultProps = TextInputAny.defaultProps || {};
  TextInputAny.defaultProps.maxFontSizeMultiplier = MAX_FONT_SCALE;
}
