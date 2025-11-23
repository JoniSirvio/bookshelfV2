import * as React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import PastReadScreen from '../screens/PastReadScreen';

const Tab = createBottomTabNavigator();

export default function MyTabs() {
  return (
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
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Books"
        component={SearchScreen}
        options={{
          tabBarLabel: 'Search Books',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="book-search" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Past Reads"
        component={PastReadScreen}
        options={{
          tabBarLabel: 'Past Reads',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="book-check-outline" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
