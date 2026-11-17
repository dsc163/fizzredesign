import Ionicons from '@expo/vector-icons/Ionicons';
import { BottomTabNavigationOptions, Tabs } from 'expo-router/js-tabs';
import { ComponentProps, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { api } from '@/api/client';
import { Colors, Typography } from '@/constants/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function tabIcon(
  active: IconName,
  inactive: IconName
): BottomTabNavigationOptions['tabBarIcon'] {
  return ({ focused, size }) => (
    <Ionicons
      name={focused ? active : inactive}
      size={size}
      color={focused ? Colors.primary : Colors.textMuted}
    />
  );
}

// Total unread messages, refreshed every 10 seconds for the tab badge.
function useUnreadCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let active = true;
    const load = () =>
      api
        .threads()
        .then((r) => active && setCount(r.threads.reduce((n, t) => n + t.unread, 0)))
        .catch(() => undefined);
    load();
    const timer = setInterval(load, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  return count;
}

export default function TabLayout() {
  const unread = useUnreadCount();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.background,
          borderTopColor: Colors.border,
          // Web has no bottom safe-area inset, so give the labels room.
          ...(Platform.OS === 'web' && { height: 58, paddingBottom: 6 }),
        },
        headerStyle: { backgroundColor: Colors.background },
        headerTitleStyle: { ...Typography.heading, color: Colors.text },
        sceneStyle: { backgroundColor: Colors.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Browse',
          headerTitle: 'Marketplace',
          tabBarIcon: tabIcon('storefront', 'storefront-outline'),
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: 'Post',
          headerTitle: 'New Post',
          tabBarIcon: tabIcon('add-circle', 'add-circle-outline'),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarIcon: tabIcon('chatbubbles', 'chatbubbles-outline'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerTitle: 'Profile',
          tabBarIcon: tabIcon('person-circle', 'person-circle-outline'),
        }}
      />
    </Tabs>
  );
}
