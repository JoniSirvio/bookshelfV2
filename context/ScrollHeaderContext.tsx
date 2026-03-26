import React, { createContext, useCallback, useContext } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import {
  useAnimatedScrollHandler,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

const SCROLL_THRESHOLD_HIDE = 80;
const SCROLL_THRESHOLD_SHOW = 20;

interface ScrollHeaderContextValue {
  scrollY: SharedValue<number>;
  shouldHideHeader: SharedValue<number>;
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
  /** Use this for FlashList/custom scroll views when the animated handler does not receive events */
  onScrollNative: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Use this for DraggableFlatList which exposes onScrollOffsetChange(offset) instead of onScroll */
  onScrollOffsetChange: (offsetY: number) => void;
  resetScrollHeader: () => void;
}

const ScrollHeaderContext = createContext<ScrollHeaderContextValue | null>(null);

export function ScrollHeaderProvider({ children }: { children: React.ReactNode }) {
  const scrollY = useSharedValue(0);
  const shouldHideHeader = useSharedValue(0);
  const lastY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const y = event.contentOffset.y;
      const prev = lastY.value;
      lastY.value = y;
      scrollY.value = y;
      const direction = y > prev ? 1 : y < prev ? -1 : 0;
      if (y > SCROLL_THRESHOLD_HIDE && direction === 1) {
        shouldHideHeader.value = 1;
      } else if (y <= SCROLL_THRESHOLD_SHOW || direction === -1) {
        shouldHideHeader.value = 0;
      }
    },
  });

  const onScrollNative = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const prev = lastY.value;
    lastY.value = y;
    scrollY.value = y;
    const direction = y > prev ? 1 : y < prev ? -1 : 0;
    if (y > SCROLL_THRESHOLD_HIDE && direction === 1) {
      shouldHideHeader.value = 1;
    } else if (y <= SCROLL_THRESHOLD_SHOW || direction === -1) {
      shouldHideHeader.value = 0;
    }
  }, [scrollY, shouldHideHeader, lastY]);

  const onScrollOffsetChange = useCallback((y: number) => {
    const prev = lastY.value;
    lastY.value = y;
    scrollY.value = y;
    const direction = y > prev ? 1 : y < prev ? -1 : 0;
    if (y > SCROLL_THRESHOLD_HIDE && direction === 1) {
      shouldHideHeader.value = 1;
    } else if (y <= SCROLL_THRESHOLD_SHOW || direction === -1) {
      shouldHideHeader.value = 0;
    }
  }, [scrollY, shouldHideHeader, lastY]);

  const resetScrollHeader = useCallback(() => {
    scrollY.value = 0;
    shouldHideHeader.value = 0;
    lastY.value = 0;
  }, [scrollY, shouldHideHeader, lastY]);

  const value: ScrollHeaderContextValue = {
    scrollY,
    shouldHideHeader,
    scrollHandler,
    onScrollNative,
    onScrollOffsetChange,
    resetScrollHeader,
  };

  return (
    <ScrollHeaderContext.Provider value={value}>
      {children}
    </ScrollHeaderContext.Provider>
  );
}

export function useScrollToHideHeader(): ScrollHeaderContextValue {
  const ctx = useContext(ScrollHeaderContext);
  if (!ctx) {
    throw new Error('useScrollToHideHeader must be used within ScrollHeaderProvider');
  }
  return ctx;
}

export { SCROLL_THRESHOLD_HIDE, SCROLL_THRESHOLD_SHOW };
