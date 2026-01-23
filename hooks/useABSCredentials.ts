import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { firestore } from '../firebase/Config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

interface ABSCredentials {
    url: string | null;
    token: string | null;
    loading: boolean;
}

const STORAGE_KEY_URL = 'abs_url_cache';
const STORAGE_KEY_TOKEN = 'abs_token_cache';

export const useABSCredentials = (): ABSCredentials => {
    const { user } = useAuth();
    const [credentials, setCredentials] = useState<{ url: string | null; token: string | null }>({
        url: null,
        token: null,
    });
    const [loading, setLoading] = useState(true);

    // 1. Initial Load from AsyncStorage (Instant)
    useEffect(() => {
        const loadCached = async () => {
            try {
                const [cachedUrl, cachedToken] = await Promise.all([
                    AsyncStorage.getItem(STORAGE_KEY_URL),
                    SecureStore.getItemAsync(STORAGE_KEY_TOKEN)
                ]);
                if (cachedUrl && cachedToken) {
                    setCredentials({ url: cachedUrl, token: cachedToken });
                    setLoading(false); // We have something to show!
                }
            } catch (e) {
                console.warn("Failed to load cached ABS credentials", e);
            }
        };
        loadCached();
    }, []);

    // 2. Subscribe to Firestore (Source of Truth)
    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const userDocRef = doc(firestore, 'users', user.uid);

        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const newUrl = data.absUrl || null;
                const newToken = data.absToken || null;

                setCredentials({
                    url: newUrl,
                    token: newToken,
                });

                // Update Cache
                if (newUrl) AsyncStorage.setItem(STORAGE_KEY_URL, newUrl);
                else AsyncStorage.removeItem(STORAGE_KEY_URL);

                if (newToken) SecureStore.setItemAsync(STORAGE_KEY_TOKEN, newToken);
                else SecureStore.deleteItemAsync(STORAGE_KEY_TOKEN);

            } else {
                console.log("User document does not exist");
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching ABS credentials:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    return { ...credentials, loading };
};
