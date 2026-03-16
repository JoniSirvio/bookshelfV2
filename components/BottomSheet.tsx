import React, { ReactNode, useEffect } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  Animated,
  Platform,
  AccessibilityRole,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '../theme';
import { useReduceMotion } from '../hooks/useReduceMotion';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  accessibilityLabel?: string;
  showHandle?: boolean;
  accessibilityRole?: AccessibilityRole;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  title,
  children,
  accessibilityLabel,
  showHandle = true,
  accessibilityRole = 'dialog',
}) => {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const translateY = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const toValue = visible ? 0 : 1;
    const duration = reduceMotion ? 0 : 220;
    Animated.timing(translateY, {
      toValue,
      duration,
      useNativeDriver: true,
    }).start();
  }, [visible, translateY, reduceMotion]);

  const sheetTranslate = translateY.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 40],
  });

  if (!visible && Platform.OS === 'web') {
    // Web Modal keeps children mounted; rely on visible flag for early exit where possible.
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessible
      accessibilityLabel={accessibilityLabel || title}
      accessibilityRole={accessibilityRole}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>
      <Animated.View
        style={[
          styles.sheetContainer,
          {
            paddingBottom: Math.max(insets.bottom, 16),
            transform: [{ translateY: sheetTranslate }],
          },
        ]}
      >
        <View style={styles.sheet}>
          {showHandle && (
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>
          )}
          {title ? <View style={styles.header}><Animated.Text style={styles.title}>{title}</Animated.Text></View> : null}
          <View>{children}</View>
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlayDark,
  },
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 8,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
  },
  header: {
    paddingBottom: 8,
  },
  title: {
    fontFamily: typography.fontFamilyDisplay,
    fontSize: 16,
    color: colors.textPrimary,
  },
});

export default BottomSheet;

