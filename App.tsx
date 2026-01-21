import 'react-native-gesture-handler';
import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { BooksProvider } from './context/BooksContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import BottomNavi from './components/BottomNavi';
import LoginModal from './components/LoginModal';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, clientPersister } from './utils/queryClient';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const theme = {
  ...DefaultTheme,
  // version 2 is the default, version 3 is the new MD3 theme
  version: 3 as const,
};

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#636B2F" />
      </View>
    );
  }

  return (
    <>
      <BooksProvider>
        <NavigationContainer>
          <BottomNavi />
        </NavigationContainer>
      </BooksProvider>
      <LoginModal visible={!user} />
    </>
  );
};

export default function App() {
  const [fontsLoaded] = useFonts({
    ...MaterialCommunityIcons.font,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <PaperProvider
        theme={theme}
        settings={{
          icon: (props) => <MaterialCommunityIcons {...props} />,
        }}
      >
        <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: clientPersister }}>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </PersistQueryClientProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}