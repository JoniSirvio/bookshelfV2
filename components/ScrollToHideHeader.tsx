import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, useAnimatedReaction, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { headerStyle } from '../theme';
import { colors } from '../theme';
import { useScrollToHideHeader } from '../context/ScrollHeaderContext';
import { AIChatsHeaderButton, NotificationBell } from './BottomNavi';
import { useReduceMotion } from '../hooks/useReduceMotion';

const HEADER_BAR_HEIGHT = 56;

interface ScrollToHideHeaderProps {
  onOpenAIChats: () => void;
}

export function ScrollToHideHeader({ onOpenAIChats }: ScrollToHideHeaderProps) {
  const insets = useSafeAreaInsets();
  const { shouldHideHeader } = useScrollToHideHeader();
  const totalHeight = HEADER_BAR_HEIGHT + insets.top;
  const translateY = useSharedValue(0);
  const reduceMotion = useReduceMotion();
  const reduceMotionRef = useSharedValue(false);

  useEffect(() => {
    reduceMotionRef.value = reduceMotion;
  }, [reduceMotion, reduceMotionRef]);

  useAnimatedReaction(
    () => ({ hidden: shouldHideHeader.value, reduce: reduceMotionRef.value }),
    (state) => {
      const duration = state.reduce ? 0 : 220;
      translateY.value = withTiming(state.hidden === 1 ? -totalHeight : 0, { duration });
    },
    [totalHeight]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={[styles.container, { height: totalHeight, overflow: 'hidden' }]}>
      <Animated.View
        style={[
          styles.headerBar,
          { paddingTop: insets.top, height: totalHeight },
          animatedStyle,
        ]}
      >
        <View style={styles.row}>
          <AIChatsHeaderButton onPress={onOpenAIChats} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            <Text style={styles.titleItalic}>Book</Text>
            <Text style={styles.titleBold}>Shelf</Text>
          </Text>
          <NotificationBell />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  headerBar: {
    ...headerStyle,
    justifyContent: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: HEADER_BAR_HEIGHT,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 20,
  },
  titleItalic: {
    fontStyle: 'italic',
  },
  titleBold: {
    fontWeight: 'bold',
  },
});
