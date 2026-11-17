import Ionicons from '@expo/vector-icons/Ionicons';
import { BottomTabNavigationOptions, Tabs } from 'expo-router/js-tabs';
import { ComponentProps } from 'react';
import { Platform } from 'react-native';

import { HeaderBell } from '@/components/HeaderBell';
import { Colors, Party, Typography } from '@/constants/theme';
import { useBadges } from '@/lib/badges';

type IconName = ComponentProps<typeof Ionicons>['name'];

function tabIcon(active: IconName, inactive: IconName, activeColor: string = Colors.primary): BottomTabNavigationOptions['tabBarIcon'] {
  return ({ focused, size }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={focused ? activeColor : Colors.textMuted} />
  );
}

// Web has no bottom safe-area inset, so give the labels room.
const webTabBar = Platform.OS === 'web' ? { height: 58, paddingBottom: 6 } : {};

export default function TabLayout() {
  const { messages } = useBadges();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: { backgroundColor: Colors.background, borderTopColor: Colors.border, ...webTabBar },
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
          headerRight: () => <HeaderBell />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          headerTitle: 'Events',
          tabBarIcon: tabIcon('sparkles', 'sparkles-outline', Party.pink),
          tabBarActiveTintColor: Party.pink,
          tabBarStyle: { backgroundColor: Party.bg, borderTopColor: Party.cardBorder, ...webTabBar },
          headerStyle: { backgroundColor: Party.bg },
          headerTitleStyle: { ...Typography.heading, color: Party.text, fontWeight: '900' },
          sceneStyle: { backgroundColor: Party.bg },
          headerRight: () => <HeaderBell color={Party.text} />,
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
          tabBarIcon: tabIcon('chatbubbles', 'chatbubbles-outline'),
          tabBarBadge: messages > 0 ? messages : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerTitle: 'Profile',
          tabBarIcon: tabIcon('person-circle', 'person-circle-outline'),
          headerRight: () => <HeaderBell />,
        }}
      />
    </Tabs>
  );
}
