import { View, Text, StyleSheet } from "react-native";
import { TextInput, Button } from "react-native-paper";
import React, { useEffect, useState } from "react";
import { useProfile } from "../hooks/useProfile";
import { useAuth } from "../context/AuthContext";

const ProfileScreen: React.FC = () => {
    const [profile, setProfile] = useState({ email: '', phone: '' });
    const { getProfile, saveProfile } = useProfile();
    const { user, signOut } = useAuth();

    useEffect(() => {
        (async () => {
            const stored = await getProfile();
            if (stored) setProfile(stored);
        })();
    }, [getProfile]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Profiili</Text>

            {user && (
                <Text style={styles.userInfo}>Kirjautunut: {user.email}</Text>
            )}

            <TextInput label="Sähköposti (Profiili)"
                style={styles.input}
                mode="outlined"
                value={profile.email}
                onChangeText={text => setProfile({ ...profile, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
                activeOutlineColor="#636B2F"
            />
            <TextInput
                label="Puhelinnumero"
                style={styles.input}
                mode="outlined"
                value={profile.phone}
                onChangeText={text => setProfile({ ...profile, phone: text })}
                keyboardType="phone-pad"
                activeOutlineColor="#636B2F"
            />

            <Button mode="contained"
                onPress={async () => {
                    await saveProfile(profile);
                }}
                style={styles.button}
                buttonColor="#636B2F">
                Tallenna tiedot
            </Button>

            <Button
                mode="outlined"
                onPress={signOut}
                style={[styles.button, styles.signOutButton]}
                textColor="#d9534f"
            >
                Kirjaudu ulos
            </Button>
        </View>
    );
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#e0f7fa",
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 24,
        color: "#00796b",
    },
    userInfo: {
        fontSize: 16,
        marginBottom: 20,
        color: '#333',
    },
    input: {
        width: "90%",
        marginBottom: 16,
    },
    button: {
        marginTop: 16,
        width: "90%",
        alignSelf: "center",
    },
    signOutButton: {
        borderColor: '#d9534f',
        marginTop: 30,
    },
});

export default ProfileScreen;