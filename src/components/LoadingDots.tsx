import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

const PURPLE = '#7C6FEF';

export default function LoadingDots() {
  const anims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const loops = anims.map((val, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(val, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration: 350, useNativeDriver: true }),
          Animated.delay((2 - i) * 150),
        ])
      )
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [anims]);

  return (
    <View style={styles.row}>
      {anims.map((val, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: PURPLE,
              opacity: val.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
              transform: [
                { scale: val.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.15] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginTop: 14 },
  dot: { width: 10, height: 10, borderRadius: 5, marginHorizontal: 4 },
});
