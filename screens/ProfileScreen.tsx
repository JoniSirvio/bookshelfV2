import { View, Text, StyleSheet } from "react-native";
import { TextInput, Button } from "react-native-paper";
import React, { useEffect, useState } from "react";
import { useProfile } from "../hooks/useProfile";

const ProfileScreen: React.FC = () => {
    const [profile, setProfile] = useState({ email: '', phone: '' });
    const { getProfile, saveProfile } = useProfile();

    useEffect(() => {
        (async () => {
            const stored = await getProfile();
            if (stored) setProfile(stored);
        })();
    }, [getProfile]);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Profile</Text>
            <TextInput label="Email"
                style={styles.input}
                mode="outlined"
                value={profile.email}
                onChangeText={text => setProfile({ ...profile, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
            />
            <TextInput
                label="Phone"
                style={styles.input}
                mode="outlined"
                value={profile.phone}
                onChangeText={text => setProfile ({ ...profile, phone: text })}
                keyboardType="phone-pad"
            />

            <Button mode="contained"
            onPress={async () => {
                await saveProfile(profile);
             }}
             style={styles.button}>
                Save
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
    input: {
        width: "90%",
        marginBottom: 16,
    },
    button: {
        marginTop: 16,
        width: "90%",
        alignSelf: "center",
    },
});

export default ProfileScreen;