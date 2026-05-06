import { router, Stack, usePathname } from 'expo-router';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { View, Text, StyleSheet, Platform, ActivityIndicator, AppState, Vibration } from 'react-native';
import { BlurView } from 'expo-blur';
import { registerForPushNotificationsAsync } from '../lib/notifications';
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
  const [isAlarmActive, setIsAlarmActive] = useState(false);
  const currentPath = usePathname();

  useEffect(() => {
    console.log("RootLayout: Initializing auth state listener...");
    // Override the global trigger to use this component's state
    if (typeof window !== 'undefined') {
      (window as any).showSakuToast = (msg: string) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 4000);
      };
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("RootLayout: Auth state changed, user:", user?.uid || "null", "Path:", currentPath);
      
      const path = currentPath;

      if (!user) {
        setLoading(false);
        if (path !== '/login' && path !== '/forgot-password') {
          console.log("RootLayout: No user, redirecting to login");
          router.replace('/login');
        }
        return;
      } else {
        try {
          console.log("RootLayout: User logged in, checking admin status...");
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists() && userDocSnap.data().IsAdmin === true) {
            console.log("RootLayout: Admin confirmed");
            
            // Register for push notifications on every load for admins
            try {
              registerForPushNotificationsAsync(user.uid);
            } catch (nErr) {
              console.log("Notification registration error:", nErr);
            }

            if (path === '/login' || path === '/' || path === '/index') {
              router.replace('/(tabs)/hogar');
            }
          } else {
            console.log("RootLayout: User is not admin, signing out");
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

    // Safety timeout: if loading takes more than 5s, force show something
    const timer = setTimeout(() => {
      setLoading(prev => {
        if (prev) {
          console.log("RootLayout: Loading timeout reached, forcing render");
          return false;
        }
        return false;
      });
    }, 5000);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [currentPath]);

  // Persistent Alarm Logic
  useEffect(() => {
    let soundObject: any = null;
    let vibrationInterval: NodeJS.Timeout | null = null;
    
    // Safely get native modules
    const getAudio = () => {
      try { return require('expo-audio'); } catch (e) { return null; }
    };
    const getNotifications = () => {
      try { return require('expo-notifications'); } catch (e) { return null; }
    };

    // Configure Audio for background playback
    const setupAudio = async () => {
      const AudioModule = getAudio();
      if (AudioModule) {
        try {
          await AudioModule.setAudioModeAsync({
            allowsRecordingIOS: false,
            staysActiveInBackground: true,
            interruptionModeIOS: (AudioModule as any).INTERRUPTION_MODE_IOS_DO_NOT_MIX,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            interruptionModeAndroid: (AudioModule as any).INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
            playThroughEarpieceAndroid: false,
          });
        } catch (e) {
          console.log("Audio mode setup error:", e);
        }
      }
    };
    setupAudio();

    const startAlarm = async () => {
      if (isAlarmActive) return; // Already active
      console.log("ALARM: Starting persistent alert...");
      setIsAlarmActive(true);
      const AudioModule = getAudio();
      if (!AudioModule) {
        console.log("ALARM: Audio module not available");
        return;
      }

      try {
        // 1. Start Sound Loop
        if (!soundObject) {
          const { sound } = await AudioModule.Sound.createAsync(
            require('../assets/audio/admin_push.mp3'),
            { 
              shouldPlay: true, 
              isLooping: true, 
              volume: 1.0,
              androidImplementation: 'MediaPlayer' // Often more stable for looping
            },
            (status) => {
               if (status.isLoaded && !status.isPlaying && status.didJustFinish && !status.isLooping) {
                 console.log("ALARM: Sound finished but loop failed, restarting manual...");
                 sound.replayAsync();
               }
            }
          );
          soundObject = sound;
        }
        
        await soundObject.setStatusAsync({
          shouldPlay: true,
          isLooping: true,
          volume: 1.0,
        });
        
        console.log("ALARM: Sound started and loop configured");

        // 2. Start Persistent Vibration
        Vibration.cancel();
        Vibration.vibrate([1000, 500, 1000, 500], true);
        (vibrationInterval as any) = "active"; 

      } catch (err) {
        console.error("Error starting alarm:", err);
      }
    };

    const stopAlarm = async () => {
      console.log("ALARM: Stopping persistent alert...");
      setIsAlarmActive(false);
      try {
        if (soundObject) {
          await soundObject.stopAsync();
          await soundObject.unloadAsync();
          soundObject = null;
        }
        if (vibrationInterval) {
          Vibration.cancel();
          vibrationInterval = null;
        }
      } catch (err) {
        console.error("Error stopping alarm:", err);
      }
    };

    // Listeners
    let notificationListener: any;
    let responseListener: any;
    const NotificationsModule = getNotifications();

    if (NotificationsModule && Constants.appOwnership !== 'expo') {
      notificationListener = NotificationsModule.addNotificationReceivedListener(notification => {
        console.log("ALARM: Notification received, triggering alarm");
        startAlarm();
      });

      responseListener = NotificationsModule.addNotificationResponseReceivedListener(response => {
        console.log("ALARM: User interacted with notification, stopping alarm");
        stopAlarm();
      });
    }

    // Stop alarm when app state changes to active
    const appStateListener = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        console.log("ALARM: App foregrounded, stopping alarm and clearing badge");
        stopAlarm();
        const NotificationsModule = getNotifications();
        if (NotificationsModule && Platform.OS === 'ios') {
          NotificationsModule.setBadgeCountAsync(0).catch(() => {});
        }
      }
    });

    // Stop alarm and clear badge when app is opened/foregrounded manually too
    stopAlarm(); 
    if (NotificationsModule && Platform.OS === 'ios') {
      NotificationsModule.setBadgeCountAsync(0).catch(() => {});
    }

    return () => {
      if (notificationListener) notificationListener.remove();
      if (responseListener) responseListener.remove();
      appStateListener.remove();
      stopAlarm();
    };
  }, []);


  if (!fontsLoaded) {
    console.log("RootLayout: Fonts not loaded yet");
    return null;
  }
  
  if (loading) {
    console.log("RootLayout: Still loading auth...");
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' }}>
        <ActivityIndicator size="large" color="#63348C" />
        <Text style={{ marginTop: 20, color: '#fff', fontWeight: '700' }}>Iniciando Saku Admin...</Text>
      </View>
    );
  }

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

      {isAlarmActive && (
        <View style={styles.alarmBanner}>
          <Text style={styles.alarmText}>🚨 ALARMA ACTIVA - TOCA PARA DETENER 🚨</Text>
        </View>
      )}

      <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
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
  alarmBanner: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#EF4444',
    padding: 20,
    borderRadius: 12,
    zIndex: 999999,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  alarmText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
  },
});

