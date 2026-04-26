import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { View, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import '../global.css';

// Global toast trigger for the entire app
if (typeof window !== 'undefined') {
  (window as any).showSakuToast = (msg: string) => {
    // This will be overridden by the RootLayout
  };
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Ionicons': require('../assets/fonts/Ionicons.ttf'),
  });

  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    // Override the global trigger to use this component's state
    (window as any).showSakuToast = (msg: string) => {
      setToastMsg(msg);
      setTimeout(() => setToastMsg(null), 4000);
    };

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Get current path using standard browser API for reliability on web
      const path = typeof window !== 'undefined' ? window.location.pathname : '/';

      if (!user) {
        setLoading(false);
        if (path !== '/login' && path !== '/forgot-password') {
          router.replace('/login');
        }
        return;
      } else {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists() && userDocSnap.data().IsAdmin === true) {
            if (path === '/login' || path === '/' || path === '/index') {
              router.replace('/(tabs)/hogar');
            }
          } else {
            // Not an admin or no doc
            if (path !== '/login') {
              await signOut(auth);
              router.replace('/login');
            }
          }
        } catch (error) {
          console.error("Layout auth error:", error);
          if (path !== '/login') router.replace('/login');
        } finally {
          setLoading(false);
        }
      }
    });

    return unsubscribe;
  }, []);


  if (!fontsLoaded || loading) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      
      {/* Global Toast - High level, survives re-mounts of screens */}
      {toastMsg && (
        <View style={styles.toastContainer}>
          <BlurView intensity={90} tint="dark" style={styles.toastContent}>
            <Ionicons name="alert-circle" size={24} color="#F87171" />
            <Text style={styles.toastText}>{toastMsg}</Text>
          </BlurView>
        </View>
      )}

      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>

    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    zIndex: 999999, // Super high priority
    alignItems: 'center',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 18,
    borderRadius: 24,
    gap: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1.5,
    borderColor: 'rgba(248, 113, 113, 0.4)',
    overflow: 'hidden',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  toastText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

