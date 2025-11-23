import { useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';

export interface Profile {
    email: string;
    phone: string;
}

const PROFILE_KEY = 'user_profile';

export function useProfile() {
    const saveProfile = useCallback(async (profile: Profile) => {
        try {
            await SecureStore.setItemAsync(PROFILE_KEY, JSON.stringify(profile));
        } catch (e) {
            // handle error as needed
            throw e;
        }
    }, []);

    const getProfile = useCallback(async (): Promise<Profile | null> => {
        try {
            const data = await SecureStore.getItemAsync(PROFILE_KEY);
            if (data) {
                return JSON.parse(data);
            }
            return null;
        } catch (e) {
            // handle error as needed
            throw e;
        }
        }, []);
        
    return { saveProfile, getProfile };
}