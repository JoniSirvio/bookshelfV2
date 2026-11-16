import * as RN from 'react-native';
const { StyleSheet } = RN;

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

/**
 * Polyfill InteractionManager.
 *
 * React Native 0.88 removed InteractionManager from core.
 * Libraries such as react-native-draggable-flatlist still rely on
 * InteractionManager.runAfterInteractions.
 */
const InteractionManagerPolyfill = {
  runAfterInteractions(task?: () => any) {
    let cancelled = false;
    const handle =
      typeof requestIdleCallback !== 'undefined'
        ? requestIdleCallback(() => {
            if (!cancelled && task) task();
          })
        : setTimeout(() => {
            if (!cancelled && task) task();
          }, 0);

    return {
      then(onFulfilled?: any, onRejected?: any) {
        return Promise.resolve()
          .then(() => {
            if (!cancelled && task) return task();
          })
          .then(onFulfilled, onRejected);
      },
      done(..._args: any[]) {},
      cancel() {
        cancelled = true;
        if (typeof cancelIdleCallback !== 'undefined') {
          cancelIdleCallback(handle as any);
        } else {
          clearTimeout(handle as any);
        }
      },
    };
  },
  createInteractionHandle() {
    return 1;
  },
  clearInteractionHandle(_handle: number) {},
  setDeadline(_deadline: number) {},
};

try {
  Object.defineProperty(RN, 'InteractionManager', {
    configurable: true,
    enumerable: true,
    writable: true,
    value: InteractionManagerPolyfill,
  });
} catch {
  (RN as any).InteractionManager = InteractionManagerPolyfill;
}

