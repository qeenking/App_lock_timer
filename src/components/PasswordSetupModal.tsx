import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Image, Alert } from 'react-native';
import { setPassword } from '../native/NativeModules';

const PURPLE = '#7C6FEF';

export default function PasswordSetupModal({
  visible,
  onDone,
  onClose,
}: {
  visible: boolean;
  onDone: () => void;
  onClose?: () => void;
}) {
  const [digits, setDigits] = useState<string[]>([]);

  const pressNumber = (n: string) => {
    if (digits.length >= 4) return;
    const next = [...digits, n];
    setDigits(next);
  };

  const backspace = () => setDigits(digits.slice(0, -1));

  const confirm = async () => {
    if (digits.length !== 4) {
      Alert.alert('4자리를 입력해주세요');
      return;
    }
    await setPassword(digits.join(''));
    setDigits([]);
    onDone();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          {onClose && (
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          )}
          <Image source={require('../assets/lock_character.png')} style={styles.character} resizeMode="contain" />
          <Text style={styles.title}>비밀번호를 설정해주세요</Text>
          <Text style={styles.subtitle}>앱 사용시간 제한을 적용하려면{'\n'}비밀번호 설정이 필요해요.</Text>

          <View style={styles.dotsRow}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.dotBox}>
                <View style={[styles.dot, digits.length > i && styles.dotFilled]} />
              </View>
            ))}
          </View>

          <View style={styles.keypad}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '←', '0', 'ok'].map((key) => (
              <TouchableOpacity
                key={key}
                style={styles.key}
                onPress={() => {
                  if (key === '←') backspace();
                  else if (key === 'ok') confirm();
                  else pressNumber(key);
                }}
              >
                <Text style={styles.keyText}>{key === 'ok' ? '확인' : key}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 28, padding: 24, width: 320, alignItems: 'center' },
  closeBtn: { position: 'absolute', top: 14, right: 14, zIndex: 10 },
  closeBtnText: { fontSize: 18, color: '#9C99B4' },
  character: { width: 120, height: 100, marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '800', color: '#2C2A3D', marginTop: 4 },
  subtitle: { fontSize: 13, color: '#8B87A8', textAlign: 'center', marginTop: 8, lineHeight: 19 },
  dotsRow: { flexDirection: 'row', marginTop: 20, marginBottom: 8 },
  dotBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F6F5FF', alignItems: 'center', justifyContent: 'center', marginHorizontal: 5 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D8D4F5' },
  dotFilled: { backgroundColor: PURPLE },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: 264, marginTop: 12 },
  key: { width: 88, height: 52, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontSize: 18, fontWeight: '700', color: '#2C2A3D' },
});
