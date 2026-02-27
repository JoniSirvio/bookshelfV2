import 'react-native-gesture-handler';
import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { BooksProvider } from './context/BooksContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AIChatProvider, AIChatModalHost } from './context/AIChatContext';
import { AudioProvider } from './context/AudioContext'; // Import AudioProvider
import BottomNavi from './components/BottomNavi';
import LoginModal from './components/LoginModal';
import { PlayerModal } from './components/PlayerModal'; // Import PlayerModal
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { useCallback, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient, clientPersister } from './utils/queryClient';
import { headerStyle, headerTintColor, loaderColor } from './theme';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

const theme = {
  ...DefaultTheme,
  // version 2 is the default, version 3 is the new MD3 theme
  version: 3 as const,
};

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import NewBooksScreen from './screens/NewBooksScreen';
import AIChatListScreen from './screens/AIChatListScreen';

const Stack = createNativeStackNavigator();

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={loaderColor} />
      </View>
    );
  }

  return (
    <>
      <AudioProvider>
        <BooksProvider>
          <AIChatProvider>
            <NavigationContainer>
              <Stack.Navigator>
                <Stack.Screen
                  name="Main"
                  component={BottomNavi}
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="NewBooks"
                  component={NewBooksScreen}
                  options={{
                    headerTitle: 'Uudet lisäykset',
                    headerStyle,
                    headerTintColor,
                    headerBackTitle: 'Takaisin'
                  }}
                />
                <Stack.Screen
                  name="AIChats"
                  component={AIChatListScreen}
                  options={{
                    headerTitle: 'AI-keskustelut',
                    headerStyle,
                    headerTintColor,
                    headerBackTitle: 'Takaisin'
                  }}
                />
              </Stack.Navigator>
            </NavigationContainer>
            <AIChatModalHost />
          </AIChatProvider>
        </BooksProvider>
        <PlayerModal />
      </AudioProvider>
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