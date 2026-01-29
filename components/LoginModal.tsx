import React, { useState } from 'react';
import { View, StyleSheet, Modal, Text } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme';

interface LoginModalProps {
    visible: boolean;
}

export default function LoginModal({ visible }: LoginModalProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn } = useAuth();

    const handleAuth = async () => {
        setError('');
        setLoading(true);
        try {
            await signIn(email, password);
        } catch (err: any) {
            console.log('Login failed. Please try again.');
            if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
                setError('Sähköpostia tai salasanaa ei löytynyt.');
            } else if (err.code === 'auth/wrong-password') {
                setError('Virheellinen salasana.');
            } else if (err.code === 'auth/invalid-email') {
                setError('Virheellinen sähköpostiosoite.');
            } else if (err.code === 'auth/too-many-requests') {
                setError('Liian monta yritystä. Yritä myöhemmin uudelleen.');
            } else {
                setError('Kirjautuminen epäonnistui. Yritä uudelleen.');
                console.log(err.code, err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.container}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <MaterialCommunityIcons name="book-open-page-variant" size={40} color={colors.primary} />
                        <Text style={styles.titleContainer}>
                            <Text style={styles.titleBook}>Book</Text>
                            <Text style={styles.titleShelf}>Shelf</Text>
                        </Text>
                    </View>

                    <Text style={styles.subtitle}>Kirjaudu sisään</Text>

                    <TextInput
                        label="Sähköposti"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        style={styles.input}
                        mode="outlined"
                        activeOutlineColor={colors.primary}
                    />
                    <TextInput
                        label="Salasana"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        style={styles.input}
                        mode="outlined"
                        activeOutlineColor={colors.primary}
                    />

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <Button
                        mode="contained"
                        onPress={handleAuth}
                        loading={loading}
                        disabled={loading}
                        style={styles.button}
                        buttonColor={colors.primary}
                    >
                        {'Kirjaudu'}
                    </Button>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 20,
    },
    content: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        elevation: 5,
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    titleContainer: {
        fontSize: 24,
        marginTop: 10,
        color: 'black',
    },
    titleBook: {
        fontStyle: 'italic',
    },
    titleShelf: {
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 15,
        textAlign: 'center',
        color: colors.textPrimary,
    },
    input: {
        marginBottom: 10,
        backgroundColor: 'white',
    },
    button: {
        marginTop: 10,
        paddingVertical: 5,
    },
    errorText: {
        color: colors.delete,
        marginBottom: 10,
        textAlign: 'center',
    },
});
