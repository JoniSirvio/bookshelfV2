import React from 'react';
import { Pressable, StyleProp, ViewStyle, AccessibilityRole } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useReduceMotion } from '../hooks/useReduceMotion';

const PRESS_DURATION = 100;
const PRESS_SCALE = 0.98;
const EASE_OUT = Easing.bezier(0.25, 1, 0.5, 1);

interface AnimatedScalePressableProps {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
}

/**
 * Pressable with subtle scale-down on press (0.98). Respects reduce motion (no scale when enabled).
 */
export function AnimatedScalePressable({
  children,
  onPress,
  disabled = false,
  style,
  accessibilityLabel,
  accessibilityRole = 'button',
}: AnimatedScalePressableProps) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (disabled) return;
    const duration = reduceMotion ? 0 : PRESS_DURATION;
    scale.value = withTiming(PRESS_SCALE, { duration, easing: EASE_OUT });
  };

  const handlePressOut = () => {
    const duration = reduceMotion ? 0 : PRESS_DURATION;
    scale.value = withTiming(1, { duration, easing: EASE_OUT });
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}
