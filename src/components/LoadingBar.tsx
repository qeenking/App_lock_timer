import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';

const PURPLE = '#7C6FEF';
const TRACK = '#E6E3F9';
const BAR_WIDTH = 160;
const FILL_WIDTH = 70;

export default function LoadingBar() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-FILL_WIDTH, BAR_WIDTH],
  });

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.fill, { transform: [{ translateX }] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: BAR_WIDTH, height: 10, borderRadius: 5, backgroundColor: TRACK, overflow: 'hidden', marginTop: 14 },
  fill: { width: FILL_WIDTH, height: 10, borderRadius: 5, backgroundColor: PURPLE },
});
