import { useState, useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Returns whether the user has "Reduce motion" enabled in system accessibility settings.
 * Use to skip or shorten animations (e.g. header hide/show) for users who prefer reduced motion.
 */
export function useReduceMotion(): boolean {
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotionEnabled);

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotionEnabled
    );

    return () => subscription.remove();
  }, []);

  return reduceMotionEnabled;
}
