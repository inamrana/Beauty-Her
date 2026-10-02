import React from 'react';
import { View, StyleSheet, Platform, Pressable } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Colors, Fonts, Shadow } from '@/constants/theme';
import { usePaywallGuard } from '@/components';

const TAB_BAR_HEIGHT = 64;
const TAB_BAR_MARGIN_H = 16;
const TAB_BAR_RADIUS = 40;

// Glassmorphic background using BlurView
function GlassBackground() {
  return (
    <BlurView
      intensity={Platform.OS === 'android' ? 0 : 72}
      tint="light"
      style={StyleSheet.absoluteFill}
    >
      {/* Fallback for Android (BlurView has limited support) */}
      <View style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: Platform.OS === 'android'
            ? 'rgba(255, 252, 251, 0.97)'
            : 'rgba(255, 250, 249, 0.75)',
          borderRadius: TAB_BAR_RADIUS,
        },
      ]} />
    </BlurView>
  );
}

function ScanTabButton({ onPress }: { onPress?: () => void }) {
  const router = useRouter();
  const { gate, PaywallModal } = usePaywallGuard();
  return (
    <Pressable
      style={styles.scanWrapper}
      onPress={() => gate(() => { onPress?.(); })}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <LinearGradient
        colors={[Colors.primaryLight, Colors.primary]}
        start={[0, 0]}
        end={[1, 1]}
        style={styles.scanBtn}
      >
        <Ionicons name="camera" size={24} color={Colors.textInverse} />
      </LinearGradient>
      <PaywallModal />
    </Pressable>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, 8) + 10;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: bottomOffset,
          left: TAB_BAR_MARGIN_H,
          right: TAB_BAR_MARGIN_H,
          height: TAB_BAR_HEIGHT,
          borderRadius: TAB_BAR_RADIUS,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          // Glass border
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.55)',
          // Floating shadow
          shadowColor: Colors.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.18,
          shadowRadius: 24,
          elevation: 14,
          paddingTop: 0,
          paddingBottom: 0,
          paddingHorizontal: 8,
          overflow: 'hidden',
        },
        tabBarBackground: () => <GlassBackground />,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: Fonts.weights.semibold,
          marginTop: 1,
          marginBottom: 8,
        },
        tabBarItemStyle: {
          paddingTop: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'compass' : 'compass-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: '',
          tabBarIcon: () => null,
          tabBarLabel: () => null,
          tabBarButton: (props) => (
            <ScanTabButton onPress={props.onPress as () => void} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'bar-chart' : 'bar-chart-outline'} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scanWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -18,
  },
  scanBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.9)',
  },
});
