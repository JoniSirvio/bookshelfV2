import React, { useEffect } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useReduceMotion } from '../hooks/useReduceMotion';

const ENTRANCE_DURATION = 360;
/** Ease-out quart: natural deceleration (no bounce). */
const EASE_OUT = Easing.bezier(0.25, 1, 0.5, 1);

interface AnimatedFadeInViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Optional delay before animation starts (ms). */
  delay?: number;
}

/**
 * Wraps content in an animated entrance: fade-in + slight slide up.
 * Respects system "Reduce motion" – when enabled, appears instantly (duration 0).
 */
export function AnimatedFadeInView({ children, style, delay = 0 }: AnimatedFadeInViewProps) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  useEffect(() => {
    const duration = reduceMotion ? 0 : ENTRANCE_DURATION;
    const run = () => {
      opacity.value = withTiming(1, {
        duration,
        easing: EASE_OUT,
      });
      translateY.value = withTiming(0, {
        duration,
        easing: EASE_OUT,
      });
    };
    if (delay > 0) {
      const t = setTimeout(run, delay);
      return () => clearTimeout(t);
    }
    run();
  }, [reduceMotion, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
