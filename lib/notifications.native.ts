import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { collection, serverTimestamp, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// Configure how notifications should be handled when the app is foregrounded
if (Constants.appOwnership !== 'expo') {
  const Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

function showToast(msg: string) {
  try {
    const { Alert } = require('react-native');
    Alert.alert('Notificaciones', msg);
  } catch (e) {
    console.log('Toast fallback:', msg);
  }
}

export async function registerForPushNotificationsAsync(userId: string) {
  if (!userId) return 'ERROR: No userId provided';
  if (Platform.OS === 'android' && Constants.appOwnership === 'expo') return 'ERROR: Expo Go no soportado';

  try {
    const Notifications = require('expo-notifications');
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Alertas Saku',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 1000, 500, 1000],
        lightColor: '#63348C',
        sound: 'admin_push',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
      const longVibe = [];
      for (let i = 0; i < 150; i++) longVibe.push(0, 1000, 500, 1000);

      await Notifications.setNotificationChannelAsync('admin_alerts_v6', {
        name: 'ALARMA SAKU V6',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: longVibe,
        lightColor: '#FF0000',
        sound: 'admin_push_android.mp3',
        showBadge: true,
        enableVibrate: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        audioAttributes: {
          usage: Notifications.AndroidAudioUsage.ALARM,
          contentType: Notifications.AndroidAudioContentType.SONIFICATION,
          flags: {
            enforceAudibility: true,
          },
        },
      });
    }

    if (!Device.isDevice) return 'ERROR: Se requiere dispositivo físico';

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
        },
      });
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') return 'ERROR: Permisos denegados (' + finalStatus + ')';

    const projectId = Constants.expoConfig?.extra?.eas?.projectId || "f265ac07-beb1-47d5-9f6d-d37926115187";
    
    let deviceToken: string | null = null;
    let expoToken: string | null = null;
    
    try {
      deviceToken = (await Notifications.getDevicePushTokenAsync()).data;
    } catch (e: any) {
      console.warn('Failed to get device token:', e);
    }
    
    try {
      expoToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch (e: any) {
      console.warn('Failed to get Expo token:', e);
    }
    
    // Prioritizamos Expo Token, que es manejado mejor en EAS iOS
    token = expoToken || deviceToken;

    if (!token) return 'ERROR: Token undefined/vacío';
      
    // Firestore
    try {
      const tokenData = {
        fcm_token: deviceToken || null,
        expo_token: expoToken || null,
        fcmToken: deviceToken || null,
        pushToken: expoToken || null,
        notificationToken: token,
        device_type: Platform.OS === 'ios' ? 'iOS' : 'Android',
        created_at: serverTimestamp(),
        app: 'admin',
      };

      const tokenId = token.replace(/[^a-zA-Z0-9]/g, '_');
      const subRef = collection(db, 'users', userId, 'fcm_tokens');
      const tokenDocRef = doc(subRef, tokenId);
      await setDoc(tokenDocRef, tokenData, { merge: true });

      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        fcm_token: deviceToken || null,
        expo_token: expoToken || null,
        fcmToken: deviceToken || null,
        pushToken: expoToken || null,
        notificationToken: token,
        last_token_update: serverTimestamp(),
        device_platform: Platform.OS,
        last_app_use: 'admin'
      }, { merge: true });
      console.log('¡Token FCM sincronizado silenciamente!');

    } catch (err: any) {
      return 'ERROR Firestore: ' + err.message;
    }

    return token;
  } catch (error: any) {
    return 'ERROR general: ' + error.message;
  }
}
