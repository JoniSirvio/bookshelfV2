import * as React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import PastReadScreen from '../screens/PastReadScreen';
import ABSLibraryScreen from '../screens/ABSLibraryScreen';

const Tab = createBottomTabNavigator();

import { TouchableOpacity, View, StyleSheet, Modal, TouchableWithoutFeedback, InteractionManager } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getLastSeenNewBooksTime } from '../utils/notificationsStore';
import { useABSCredentials } from '../hooks/useABSCredentials';
import { fetchABSLibraries, fetchABSLibraryItemsAddedSince } from '../api/abs';
import { fetchNewBooksWithSideEffects } from '../utils/absNewBooksQuery';
import { prefetchABSLibraries } from '../utils/absLibraryPrefetch';
import {
  absLibrariesKey,
  absNewBooksKey,
  hasNewBooksKey,
} from '../utils/absQueryKeys';
import { getCachedLastLibraryId, loadLastLibraryId } from '../utils/absLastLibraryId';
import { MiniPlayer } from './MiniPlayer';
import { colors, headerStyle, touchTargetMin, typography } from '../theme';

export const AIChatsHeaderButton: React.FC<{ onPress?: () => void }> = ({ onPress }) => {
  const navigation = useNavigation<any>();
  const parent = navigation.getParent();
  return (
    <TouchableOpacity
      onPress={() => (onPress ? onPress() : parent?.navigate('AIChats'))}
      style={{ marginLeft: 12, padding: 8, borderRadius: 22, minWidth: touchTargetMin, minHeight: touchTargetMin, justifyContent: 'center', alignItems: 'center' }}
      accessibilityLabel="Avaa AI-keskustelut"
      accessibilityRole="button"
    >
      <MaterialCommunityIcons name="message-text-outline" size={24} />
    </TouchableOpacity>
  );
};

export const NotificationBell = () => {
  const navigation = useNavigation<any>();
  const { url, token } = useABSCredentials();
  const [popoverVisible, setPopoverVisible] = useState(false);

  // Fetch new books count
  const { data: newBooksData } = useQuery({
    queryKey: hasNewBooksKey(url),
    queryFn: async () => {
      if (!url || !token) return { hasNew: false, count: 0 };
      try {
        const lastSeen = await getLastSeenNewBooksTime();
        const libs = await fetchABSLibraries(url, token);
        let count = 0;

        for (const lib of libs) {
          const items = await fetchABSLibraryItemsAddedSince(url, token, lib.id, lastSeen);
          count += items.length;
        }
        return { hasNew: count > 0, count };
      } catch (e) {
        return { hasNew: false, count: 0 };
      }
    },
    enabled: !!url && !!token,
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
    initialData: { hasNew: false, count: 0 }
  });

  const handlePress = () => {
    setPopoverVisible(!popoverVisible);
  };

  const handleOpenNewBooks = () => {
    setPopoverVisible(false);
    navigation.navigate('NewBooks');
  };

  return (
    <View style={{ marginRight: 15, zIndex: 9999 }}>
      <TouchableOpacity
        onPress={handlePress}
        style={{
          padding: 8,
          borderRadius: 22,
          minWidth: touchTargetMin,
          minHeight: touchTargetMin,
          justifyContent: 'center',
          alignItems: 'center'
        }}
        accessibilityLabel={newBooksData.hasNew ? `Uusia kirjoja, ${newBooksData.count} kpl. Avaa ilmoitukset.` : 'Ilmoitukset. Ei uusia kirjoja.'}
        accessibilityRole="button"
      >
        <MaterialCommunityIcons name="bell-outline" size={24} />
        {newBooksData.hasNew && (
          <View style={{
            position: 'absolute',
            top: 2,
            right: 2,
            backgroundColor: colors.badge,
            width: 10,
            height: 10,
            borderRadius: 5,
            borderWidth: 1.5,
            borderColor: colors.white,
          }} />
        )}
      </TouchableOpacity>

      {/* Popover */}
      {popoverVisible && (
        <Modal
          transparent={true}
          visible={popoverVisible}
          onRequestClose={() => setPopoverVisible(false)}
          animationType="fade"
        >
          <TouchableWithoutFeedback onPress={() => setPopoverVisible(false)}>
            <View style={{ flex: 1, backgroundColor: colors.overlay }}>
              <View style={{
                position: 'absolute',
                top: 105,
                right: 11,
                backgroundColor: colors.surface,
                borderRadius: 8,
                padding: 15,
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5,
                width: 220,
              }}>
                {newBooksData.hasNew ? (
                  <>
                    <Text style={{ fontFamily: typography.fontFamilyDisplay, fontSize: 16, marginBottom: 5 }}>
                      Uusia kirjoja!
                    </Text>
                    <Text style={{ fontFamily: typography.fontFamilyBody, fontSize: 14, color: colors.textSecondaryAlt, marginBottom: 10 }}>
                      Kirjastoon on lisätty {newBooksData.count} {newBooksData.count === 1 ? 'uusi kirja' : 'uutta kirjaa'}.
                    </Text>
                    <TouchableOpacity
                      onPress={handleOpenNewBooks}
                      style={{
                        backgroundColor: colors.primary,
                        paddingVertical: 8,
                        borderRadius: 5,
                        alignItems: 'center'
                      }}
                      accessibilityLabel="Katso uutuudet"
                      accessibilityRole="button"
                    >
                      <Text style={{ color: colors.white, fontFamily: typography.fontFamilyDisplay }}>Katso uutuudet</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={{ fontFamily: typography.fontFamilyDisplay, fontSize: 16, marginBottom: 5 }}>
                      Ei uusia ilmoituksia
                    </Text>
                    <Text style={{ fontFamily: typography.fontFamilyBody, fontSize: 14, color: colors.textSecondaryAlt, marginBottom: 5 }}>
                      Olet ajan tasalla kirjaston valikoimasta.
                    </Text>
                  </>
                )}

                {/* Arrow */}
                <View style={{
                  position: 'absolute',
                  top: -10,
                  right: 15,
                  borderLeftWidth: 10,
                  borderRightWidth: 10,
                  borderBottomWidth: 10,
                  borderStyle: 'solid',
                  borderLeftColor: 'transparent',
                  borderRightColor: 'transparent',
                  borderBottomColor: colors.surface,
                }} />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </View>
  );
};

/** Prefetches new books when app opens so the list is ready and the user sees new books immediately. */
function NewBooksPrefetcher() {
  const { url, token } = useABSCredentials();
  const queryClient = useQueryClient();
  const { data: libraries } = useQuery({
    queryKey: absLibrariesKey(url),
    queryFn: () => fetchABSLibraries(url!, token!),
    enabled: !!url && !!token,
    staleTime: 1000 * 60 * 60,
  });
  const libraryIdsKey = libraries?.map(l => l.id).sort().join(',') ?? '';

  useEffect(() => {
    if (!url || !token || !libraries?.length) return;
    queryClient.prefetchQuery({
      queryKey: absNewBooksKey(url, libraryIdsKey),
      queryFn: () => fetchNewBooksWithSideEffects(url, token, libraries, { updateLastSeen: false }),
      staleTime: 1000 * 60 * 10,
    });
  }, [url, token, libraries, libraryIdsKey, queryClient]);

  return null;
}

const LIBRARY_PREFETCH_DELAY_MS = 0;

/** Prefetches the preferred ABS library soon after credentials are available. */
function ABSLibraryPrefetcher() {
  const { url, token } = useABSCredentials();
  const queryClient = useQueryClient();
  const { data: libraries } = useQuery({
    queryKey: absLibrariesKey(url),
    queryFn: () => fetchABSLibraries(url!, token!),
    enabled: !!url && !!token,
    staleTime: 1000 * 60 * 60,
  });

  useEffect(() => {
    void loadLastLibraryId();
  }, []);

  useEffect(() => {
    if (!url || !token || !libraries?.length) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const interactionTask = InteractionManager.runAfterInteractions(() => {
      timeoutId = setTimeout(async () => {
        if (cancelled) return;
        const preferredLibraryId = getCachedLastLibraryId();
        await prefetchABSLibraries(queryClient, url, token, libraries, { preferredLibraryId });
      }, LIBRARY_PREFETCH_DELAY_MS);
    });

    return () => {
      cancelled = true;
      interactionTask.cancel();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [url, token, libraries, queryClient]);

  return null;
}

export default function MyTabs() {
  const { url, token } = useABSCredentials();
  const queryClient = useQueryClient();
  const { data: libraries } = useQuery({
    queryKey: absLibrariesKey(url),
    queryFn: () => fetchABSLibraries(url!, token!),
    enabled: !!url && !!token,
    staleTime: 1000 * 60 * 60,
  });

  const handleKirjatTabPress = useCallback(async () => {
    if (!url || !token || !libraries?.length) return;
    const preferredLibraryId = getCachedLastLibraryId() ?? libraries[0].id;
    void prefetchABSLibraries(queryClient, url, token, libraries, {
      preferredLibraryId,
      libraryIds: [preferredLibraryId],
    });
  }, [url, token, libraries, queryClient]);

  return (
    <>
      <NewBooksPrefetcher />
      <ABSLibraryPrefetcher />
      <Tab.Navigator
        screenOptions={{
          headerShown: true,
          tabBarStyle: { height: 80 },
          tabBarLabelStyle: { fontSize: 12, fontFamily: typography.fontFamilyBody },
          tabBarLabelPosition: 'below-icon',
          headerTitle: () => (
            <Text style={{ fontSize: 20, fontFamily: typography.fontFamilyBody }}>
              <Text style={{ fontFamily: typography.fontFamilyBodyItalic }}>Book</Text>
              <Text style={{ fontFamily: typography.fontFamilyDisplay }}>Shelf</Text>
            </Text>
          ),
          headerStyle,
          tabBarActiveTintColor: colors.primary,
          headerLeft: () => <AIChatsHeaderButton />,
          headerRight: () => <NotificationBell />,
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarLabel: 'Luettavat',
            tabBarAccessibilityLabel: 'Luettavat, hylly',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="book-open-variant-outline" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Kirjasto"
          component={ABSLibraryScreen}
          listeners={{
            tabPress: () => {
              void handleKirjatTabPress();
            },
          }}
          options={{
            tabBarLabel: 'Kirjat',
            tabBarAccessibilityLabel: 'Kirjat, äänikirjasto',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="bookshelf" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Past Reads"
          component={PastReadScreen}
          options={{
            tabBarLabel: 'Luetut',
            tabBarAccessibilityLabel: 'Luetut, lukuhistoria',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="book-check-outline" color={color} size={size} />
            ),
          }}
        />
      </Tab.Navigator>
      <MiniPlayer />
    </>
  );
}
