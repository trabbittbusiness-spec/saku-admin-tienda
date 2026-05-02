import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { collection, serverTimestamp, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// Configure how notifications should be handled when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

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
    let deviceToken;
    let expoToken;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#63348C',
      });
    }

    if (!Device.isDevice) return 'ERROR: Se requiere dispositivo físico';

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') return 'ERROR: Permisos denegados (' + finalStatus + ')';

    const projectId = Constants.expoConfig?.extra?.eas?.projectId || "f265ac07-beb1-47d5-9f6d-d37926115187";
    
    try {
      deviceToken = (await Notifications.getDevicePushTokenAsync()).data;
    } catch (e: any) {
      console.warn('Failed to get device token:', e.message);
    }

    try {
      expoToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch (e: any) {
      console.warn('Failed to get Expo token:', e.message);
    }

    const primaryToken = deviceToken || expoToken;
    if (!primaryToken) return 'ERROR: No se pudo obtener ningún token (FCM ni Expo)';
      
    // Firestore
    try {
      const tokenData = {
        fcm_token: deviceToken || null,
        expo_token: expoToken || null,
        fcmToken: deviceToken || null,
        pushToken: expoToken || null,
        device_type: Platform.OS === 'ios' ? 'iOS' : 'Android',
        updated_at: serverTimestamp(),
        app: 'admin',
      };

      const tokenId = deviceToken || (expoToken ? expoToken.replace(/[^a-zA-Z0-9]/g, '_') : 'unknown');
      const subRef = collection(db, 'users', userId, 'fcm_tokens');
      const tokenDocRef = doc(subRef, tokenId);
      await setDoc(tokenDocRef, tokenData, { merge: true });

      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        fcm_token: deviceToken || null,
        expo_token: expoToken || null,
        fcmToken: deviceToken || null,
        pushToken: expoToken || null,
        last_token_update: serverTimestamp(),
        device_platform: Platform.OS,
        last_app_use: 'admin'
      }, { merge: true });
      
      showToast('¡Tokens sincronizados (FCM/Expo)!');

    } catch (err: any) {
      return 'ERROR Firestore: ' + err.message;
    }

    return primaryToken;
  } catch (error: any) {
    return 'ERROR general: ' + error.message;
  }
}
