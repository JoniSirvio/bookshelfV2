import { StyleSheet } from 'react-native';

/**
 * Polyfill StyleSheet.absoluteFillObject.
 *
 * React Native 0.86 removed StyleSheet.absoluteFillObject in favor of
 * StyleSheet.absoluteFill, breaking libraries like react-native-swipeable-item
 * and react-native-paper that rely on StyleSheet.absoluteFillObject to size
 * underlays and layers.
 */
if (!(StyleSheet as any).absoluteFillObject) {
  const absoluteFillStyle = {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  };
  Object.defineProperty(StyleSheet, 'absoluteFillObject', {
    configurable: true,
    enumerable: true,
    writable: true,
    value: absoluteFillStyle,
  });
}
