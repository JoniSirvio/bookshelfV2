import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { colors, typography } from '../theme';

interface ConfirmDeleteModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  bookTitle: string;
  message?: string;
  confirmButtonLabel?: string;
  cancelButtonLabel?: string;
  accessibilityLabel?: string;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isVisible,
  onClose,
  onConfirm,
  bookTitle,
  message,
  confirmButtonLabel = 'Vahvista poisto',
  cancelButtonLabel = 'Peruuta',
  accessibilityLabel,
}) => {
  const modalMessage = message ?? `Haluatko varmasti poistaa kirjan "${bookTitle}" hyllystäsi?`;
  const modalAccessibilityLabel = accessibilityLabel ?? `Poista kirja: ${bookTitle}`;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
      accessibilityLabel={modalAccessibilityLabel}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView} accessibilityViewIsModal>
          <Text style={styles.modalText}>{modalMessage}</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={onConfirm}
              accessibilityLabel={confirmButtonLabel}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>{confirmButtonLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              accessibilityLabel={cancelButtonLabel}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>{cancelButtonLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.overlayDark,
  },
  modalView: {
    margin: 20,
    backgroundColor: colors.surface,
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: `0px 2px 4px ${colors.overlay}`,
      },
      default: {
        shadowColor: colors.shadow,
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
      },
    }),
    width: '90%',
    maxWidth: 400,
  },
  modalText: {
    marginBottom: 25,
    textAlign: 'center',
    fontSize: 18,
    fontFamily: typography.fontFamilyBody,
    lineHeight: 24,
    color: colors.textPrimary,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    elevation: 2,
    width: '48%',
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: colors.delete,
  },
  cancelButton: {
    backgroundColor: colors.cancel,
  },
  buttonText: {
    color: colors.white,
    fontFamily: typography.fontFamilyDisplay,
    textAlign: 'center',
    fontSize: 16,
  },
});

export default ConfirmDeleteModal;
