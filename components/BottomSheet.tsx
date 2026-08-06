import React, { ReactNode, useEffect, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  Animated,
  Platform,
  AccessibilityRole,
  Keyboard,
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

/**
 * Bottom sheet modal. Absolute bottom positioning is preserved so children
 * that use flex:1 (BookOptionsModal, FilterSortModal) still layout correctly.
 * When the keyboard opens, the sheet is lifted by the keyboard height so
 * TextInputs (e.g. TagEditorSheet) stay visible on iOS.
 */
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
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const toValue = visible ? 0 : 1;
    const duration = reduceMotion ? 0 : 220;
    Animated.timing(translateY, {
      toValue,
      duration,
      useNativeDriver: true,
    }).start();
  }, [visible, translateY, reduceMotion]);

  // Lift the sheet above the keyboard (KAV + absolute bottom layout is unreliable on iOS)
  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      return;
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const onHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, [visible]);

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
            // Safe area when keyboard is closed; keyboard height when open
            // (keyboard frame already includes home-indicator inset on iOS)
            paddingBottom: keyboardHeight > 0
              ? Math.max(keyboardHeight, 16)
              : Math.max(insets.bottom, 16),
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
