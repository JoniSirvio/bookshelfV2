import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { firestore } from '../firebase/Config';

interface ABSCredentials {
    url: string | null;
    token: string | null;
    loading: boolean;
}

export const useABSCredentials = (): ABSCredentials => {
    const { user } = useAuth();
    const [credentials, setCredentials] = useState<{ url: string | null; token: string | null }>({
        url: null,
        token: null,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        // Assuming credentials are stored in 'users/{uid}' or 'users/{uid}/settings'
        // Let's assume root of user doc for now based on prompt implication, 
        // or a 'settings' subcollection. I'll target the user document root for simplicity
        // and efficiency.
        const userDocRef = doc(firestore, 'users', user.uid);

        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log("Firestore User Data:", data); // Debug log
                // Check for absUrl and absToken fields
                setCredentials({
                    url: data.absUrl || null,
                    token: data.absToken || null,
                });
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
