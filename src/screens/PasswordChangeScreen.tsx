import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ImageBackground,
  SafeAreaView,
  Alert,
} from 'react-native';
import { verifyPassword, setPassword } from '../native/NativeModules';

const PURPLE = '#6E62E5';
const PURPLE_LIGHT = '#EDEBFC';
const TEXT_MAIN = '#2B2740';
const TEXT_SUB = '#8B87A6';
const LINE_COLOR = '#D8D5EC';

interface Props {
  navigation?: { goBack: () => void };
  onBack?: () => void;
  /** 실제 검증/저장 로직이 연결되면 이 콜백으로 (현재비번, 새비번)을 넘겨줍니다. */
  onSubmit?: (currentPw: string, newPw: string) => Promise<boolean> | boolean;
}

const isFourDigits = (v: string) => /^\d{4}$/.test(v);

export default function PasswordChangeScreen({ navigation, onBack, onSubmit }: Props) {
  const handleBack = onBack ?? (() => navigation?.goBack());

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const newPwValid = isFourDigits(newPw);
  const confirmTouched = confirmPw.length > 0;
  const confirmMatches = confirmTouched && confirmPw === newPw;
  const confirmMismatch = confirmTouched && confirmPw !== newPw;

  const canSubmit = isFourDigits(currentPw) && newPwValid && confirmMatches;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const result = onSubmit
        ? await onSubmit(currentPw, newPw)
        : await (async () => {
            const ok = await verifyPassword(currentPw);
            if (!ok) return false;
            await setPassword(newPw);
            return true;
          })();
      if (result) {
        Alert.alert('변경 완료', '비밀번호가 변경됐어요.', [
          { text: '확인', onPress: handleBack },
        ]);
      } else {
        Alert.alert('현재 비밀번호가 올바르지 않아요', '다시 확인해주세요.');
      }
    } catch (e) {
      console.warn('비밀번호 변경 실패', e);
      Alert.alert('오류가 발생했어요', '잠시 후 다시 시도해주세요.');
    } finally {
      setSubmitting(false);
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
            <Text style={styles.title}>앱 제한 비밀번호 변경</Text>
            <Text style={styles.subtitle}>현재 비밀번호를 확인하고, 새로운 비밀번호를{'\n'}설정해주세요.</Text>
            <Image source={require('../assets/lock_character.png')} style={styles.character} resizeMode="contain" />
          </View>

          {/* ── 단계 카드 ── */}
          <View style={styles.card}>
            {/* 1. 현재 비밀번호 */}
            <View style={styles.stepRow}>
              <View style={styles.badgeCol}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>1</Text>
                </View>
                <View style={styles.connector} />
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>현재 비밀번호 입력</Text>
                <Text style={styles.stepDesc}>기존에 설정한 앱 제한 비밀번호를 입력해주세요.</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    value={currentPw}
                    onChangeText={(v) => setCurrentPw(v.replace(/[^0-9]/g, '').slice(0, 4))}
                    placeholder="현재 비밀번호 입력"
                    placeholderTextColor="#B0ACC7"
                    keyboardType="number-pad"
                    secureTextEntry={!showCurrent}
                    maxLength={4}
                  />
                  <TouchableOpacity onPress={() => setShowCurrent((v) => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Image
                      source={showCurrent ? require('../assets/icon_eye.png') : require('../assets/icon_eye_off.png')}
                      style={styles.eyeIcon}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* 2. 새로운 비밀번호 */}
            <View style={styles.stepRow}>
              <View style={styles.badgeCol}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>2</Text>
                </View>
                <View style={styles.connector} />
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>새로운 비밀번호 입력</Text>
                <Text style={styles.stepDesc}>새로운 앱 제한 비밀번호를 입력해주세요.</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    value={newPw}
                    onChangeText={(v) => setNewPw(v.replace(/[^0-9]/g, '').slice(0, 4))}
                    placeholder="새 비밀번호 입력"
                    placeholderTextColor="#B0ACC7"
                    keyboardType="number-pad"
                    secureTextEntry={!showNew}
                    maxLength={4}
                  />
                  <TouchableOpacity onPress={() => setShowNew((v) => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Image
                      source={showNew ? require('../assets/icon_eye.png') : require('../assets/icon_eye_off.png')}
                      style={styles.eyeIcon}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.conditionBox}>
                  <Image source={require('../assets/icon_shield.png')} style={styles.conditionIcon} resizeMode="contain" />
                  <View>
                    <Text style={styles.conditionTitle}>비밀번호 조건</Text>
                    <Text style={styles.conditionDesc}>4자리 숫자</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 3. 새로운 비밀번호 확인 */}
            <View style={[styles.stepRow, styles.stepRowLast]}>
              <View style={styles.badgeCol}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>3</Text>
                </View>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>새로운 비밀번호 확인</Text>
                <Text style={styles.stepDesc}>비밀번호를 다시 한번 입력해주세요.</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    value={confirmPw}
                    onChangeText={(v) => setConfirmPw(v.replace(/[^0-9]/g, '').slice(0, 4))}
                    placeholder="새 비밀번호 다시 입력"
                    placeholderTextColor="#B0ACC7"
                    keyboardType="number-pad"
                    secureTextEntry={!showConfirm}
                    maxLength={4}
                  />
                  <TouchableOpacity onPress={() => setShowConfirm((v) => !v)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Image
                      source={showConfirm ? require('../assets/icon_eye.png') : require('../assets/icon_eye_off.png')}
                      style={styles.eyeIcon}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                </View>

                {(confirmMatches || confirmMismatch) && (
                  <View style={[styles.matchBox, confirmMismatch && styles.matchBoxWarning]}>
                    <Text style={[styles.matchText, confirmMismatch && styles.matchTextWarning]}>
                      {confirmMatches ? '비밀번호가 일치합니다.' : '비밀번호가 일치하지 않아요.'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={styles.saveWrap}>
          <TouchableOpacity
            style={[styles.saveBtn, !canSubmit && styles.saveBtnDisabled]}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={!canSubmit || submitting}
          >
            <Text style={styles.saveBtnText}>비밀번호 변경</Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
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
  title: { fontSize: 22, fontWeight: '800', color: TEXT_MAIN, maxWidth: '75%' },
  subtitle: { fontSize: 13, color: TEXT_SUB, marginTop: 6, maxWidth: '65%', lineHeight: 18 },
  character: { position: 'absolute', right: 4, top: 8, width: 130, height: 130, zIndex: 10, elevation: 10 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginTop: 20,
    shadowColor: '#6E62E5',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  stepRow: { flexDirection: 'row' },
  stepRowLast: {},
  badgeCol: { width: 28, alignItems: 'center', marginRight: 12 },
  badge: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: PURPLE,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  connector: {
    flex: 1,
    width: 0,
    minHeight: 40,
    borderLeftWidth: 2,
    borderColor: LINE_COLOR,
    borderStyle: 'dashed',
    marginTop: 6,
    marginBottom: 6,
  },
  stepContent: { flex: 1, paddingBottom: 24 },
  stepTitle: { fontSize: 16, fontWeight: '800', color: TEXT_MAIN },
  stepDesc: { fontSize: 12, color: TEXT_SUB, marginTop: 4, marginBottom: 12 },

  inputRow: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E7E4F5',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
  },
  input: { flex: 1, fontSize: 15, color: TEXT_MAIN, padding: 0, letterSpacing: 2 },
  eyeIcon: { width: 20, height: 20, marginLeft: 8 },

  conditionBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: PURPLE_LIGHT,
    borderRadius: 14, padding: 14, marginTop: 14,
  },
  conditionIcon: { width: 20, height: 20, marginRight: 10 },
  conditionTitle: { fontSize: 13, fontWeight: '800', color: PURPLE },
  conditionDesc: { fontSize: 13, color: TEXT_MAIN, marginTop: 2 },

  matchBox: { backgroundColor: PURPLE_LIGHT, borderRadius: 12, padding: 12, marginTop: 12 },
  matchBoxWarning: { backgroundColor: '#FFF1F1' },
  matchText: { fontSize: 12, color: PURPLE, fontWeight: '700' },
  matchTextWarning: { color: '#E2568C' },

  saveWrap: { position: 'absolute', left: 20, right: 20, bottom: 20 },
  saveBtn: {
    backgroundColor: PURPLE, borderRadius: 30, paddingVertical: 18, alignItems: 'center',
    shadowColor: PURPLE, shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  saveBtnDisabled: { backgroundColor: '#C9C4E8', shadowOpacity: 0 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
