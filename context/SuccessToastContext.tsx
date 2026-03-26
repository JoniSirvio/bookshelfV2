import React, { createContext, useCallback, useContext, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, typography } from '../theme';

const TOAST_DURATION_MS = 2500;

type SuccessToastContextType = {
  showSuccess: (message: string) => void;
};

const SuccessToastContext = createContext<SuccessToastContextType | null>(null);

export const SuccessToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [message, setMessage] = useState<string | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const insets = useSafeAreaInsets();

  const showSuccess = useCallback((msg: string) => {
    setMessage(msg);
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(TOAST_DURATION_MS),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setMessage(null));
  }, [opacity]);

  return (
    <SuccessToastContext.Provider value={{ showSuccess }}>
      {children}
      {message !== null && (
        <Animated.View
          style={[
            styles.toast,
            { bottom: Math.max(insets.bottom, 16) + 80 },
            { opacity },
          ]}
          pointerEvents="none"
        >
          <MaterialCommunityIcons name="check-circle" size={22} color={colors.white} style={styles.toastIcon} />
          <Text style={styles.toastText}>{message}</Text>
        </Animated.View>
      )}
    </SuccessToastContext.Provider>
  );
};

export const useSuccessToast = (): SuccessToastContextType => {
  const ctx = useContext(SuccessToastContext);
  if (!ctx) throw new Error('useSuccessToast must be used within SuccessToastProvider');
  return ctx;
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  toastIcon: {
    marginRight: 10,
  },
  toastText: {
    flex: 1,
    fontSize: 15,
    fontFamily: typography.fontFamilyDisplay,
    color: colors.white,
  },
});
