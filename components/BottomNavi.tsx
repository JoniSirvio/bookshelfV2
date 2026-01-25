import * as React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import PastReadScreen from '../screens/PastReadScreen';
import ABSLibraryScreen from '../screens/ABSLibraryScreen';

const Tab = createBottomTabNavigator();

import { TouchableOpacity, View, StyleSheet, Modal, TouchableWithoutFeedback } from 'react-native';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { getLastSeenNewBooksTime } from '../utils/notificationsStore';
import { useABSCredentials } from '../hooks/useABSCredentials';
import { fetchABSLibraries, fetchABSLibraryItems } from '../api/abs';
import { MiniPlayer } from './MiniPlayer';

const NotificationBell = () => {
  const navigation = useNavigation<any>();
  const { url, token } = useABSCredentials();
  const [popoverVisible, setPopoverVisible] = useState(false);

  // Fetch new books count
  const { data: newBooksData } = useQuery({
    queryKey: ['hasNewBooks', url],
    queryFn: async () => {
      if (!url || !token) return { hasNew: false, count: 0 };
      try {
        const lastSeen = await getLastSeenNewBooksTime();
        const libs = await fetchABSLibraries(url, token);
        let count = 0;

        for (const lib of libs) {
          const items = await fetchABSLibraryItems(url, token, lib.id);
          for (const item of items) {
            if (item.addedAt && item.addedAt > lastSeen) {
              count++;
            }
          }
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
          borderRadius: 20,
          width: 40,
          height: 40,
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <MaterialCommunityIcons name="bell-outline" size={24} />
        {newBooksData.hasNew && (
          <View style={{
            position: 'absolute',
            top: 2,
            right: 2,
            backgroundColor: '#D32F2F',
            width: 10,
            height: 10,
            borderRadius: 5,
            borderWidth: 1.5,
            borderColor: '#fff',
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
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.1)' }}>
              <View style={{
                position: 'absolute',
                top: 105, // Adjusted for header height
                right: 11,
                backgroundColor: '#fff',
                borderRadius: 8,
                padding: 15,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5,
                width: 220,
              }}>
                {newBooksData.hasNew ? (
                  <>
                    <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 5 }}>
                      Uusia kirjoja!
                    </Text>
                    <Text style={{ fontSize: 14, color: '#666', marginBottom: 10 }}>
                      Kirjastoon on lisätty {newBooksData.count} {newBooksData.count === 1 ? 'uusi kirja' : 'uutta kirjaa'}.
                    </Text>
                    <TouchableOpacity
                      onPress={handleOpenNewBooks}
                      style={{
                        backgroundColor: '#636B2F',
                        paddingVertical: 8,
                        borderRadius: 5,
                        alignItems: 'center'
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>Katso uutuudet</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 5 }}>
                      Ei uusia ilmoituksia
                    </Text>
                    <Text style={{ fontSize: 14, color: '#666', marginBottom: 5 }}>
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
                  borderBottomColor: '#fff',
                }} />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </View>
  );
};

export default function MyTabs() {
  return (
    <>
      <Tab.Navigator
        screenOptions={{
          headerShown: true,
          tabBarStyle: { height: 80 },
          tabBarLabelStyle: { fontSize: 12 },
          tabBarLabelPosition: 'below-icon',
          headerTitle: () => (
            <Text style={{ fontSize: 20 }}>
              <Text style={{ fontStyle: 'italic' }}>Book</Text>
              <Text style={{ fontWeight: 'bold' }}>Shelf</Text>
            </Text>
          ),
          headerStyle: { backgroundColor: '#636B2F' },
          tabBarActiveTintColor: '#636B2F',
          headerRight: () => <NotificationBell />,
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarLabel: 'Luettavat',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="book-open-variant-outline" color={color} size={size} />
            ),
          }}
        />
        <Tab.Screen
          name="Kirjasto"
          component={ABSLibraryScreen}
          options={{
            tabBarLabel: 'Kirjat',
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
