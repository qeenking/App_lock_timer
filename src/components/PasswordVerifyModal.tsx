import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Image, Alert } from 'react-native';
import { verifyPassword } from '../native/NativeModules';

const PURPLE = '#7C6FEF';

export default function PasswordVerifyModal({
  visible,
  onSuccess,
  onCancel,
}: {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [digits, setDigits] = useState<string[]>([]);

  const reset = () => setDigits([]);

  const pressNumber = async (n: string) => {
    if (digits.length >= 4) return;
    const next = [...digits, n];
    setDigits(next);
    if (next.length === 4) {
      const ok = await verifyPassword(next.join(''));
      if (ok) {
        setDigits([]);
        onSuccess();
      } else {
        Alert.alert('비밀번호가 일치하지 않아요');
        setDigits([]);
      }
    }
  };

  const backspace = () => setDigits(digits.slice(0, -1));

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Image source={require('../assets/lock_character.png')} style={styles.character} resizeMode="contain" />
          <Text style={styles.title}>비밀번호를 입력해주세요</Text>
          <Text style={styles.subtitle}>제한을 해제하려면 비밀번호가 필요해요.</Text>

          <View style={styles.dotsRow}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={styles.dotBox}>
                <View style={[styles.dot, digits.length > i && styles.dotFilled]} />
              </View>
            ))}
          </View>

          <View style={styles.keypad}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '←', '0', '취소'].map((key) => (
              <TouchableOpacity
                key={key}
                style={styles.key}
                onPress={() => {
                  if (key === '←') backspace();
                  else if (key === '취소') { reset(); onCancel(); }
                  else pressNumber(key);
                }}
              >
                <Text style={styles.keyText}>{key}</Text>
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
