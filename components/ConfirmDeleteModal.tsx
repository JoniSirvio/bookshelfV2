import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { colors } from '../theme';

interface ConfirmDeleteModalProps {
  isVisible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  bookTitle: string;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isVisible,
  onClose,
  onConfirm,
  bookTitle,
}) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
      accessibilityLabel={`Poista kirja: ${bookTitle}`}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView} accessibilityViewIsModal>
          <Text style={styles.modalText}>
            Haluatko varmasti poistaa kirjan "{bookTitle}" hyllystäsi?
          </Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={onConfirm}
              accessibilityLabel="Vahvista poisto"
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>Vahvista poisto</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              accessibilityLabel="Peruuta"
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>Peruuta</Text>
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
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
});

export default ConfirmDeleteModal;
