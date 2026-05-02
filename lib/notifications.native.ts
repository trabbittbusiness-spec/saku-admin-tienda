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
    let token;

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
      token = (await Notifications.getDevicePushTokenAsync()).data;
    } catch (e: any) {
      try {
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      } catch (e2: any) {
        return 'ERROR: Ambas llamadas fallaron. FCM: ' + e.message + ' | Expo: ' + e2.message;
      }
    }

    if (!token) return 'ERROR: Token undefined/vacío';
      
    // Firestore
    try {
      const tokenData = {
        fcm_token: token,
        fcmToken: token,
        pushToken: token,
        device_type: Platform.OS === 'ios' ? 'iOS' : 'Android',
        created_at: serverTimestamp(),
        app: 'admin',
      };

      const subRef = collection(db, 'users', userId, 'fcm_tokens');
      const tokenDocRef = doc(subRef, token);
      await setDoc(tokenDocRef, tokenData);

      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        fcm_token: token,
        fcmToken: token,
        pushToken: token,
        last_token_update: serverTimestamp(),
        device_platform: Platform.OS,
        last_app_use: 'admin'
      }, { merge: true });
      
      showToast('¡Token FCM sincronizado!');

    } catch (err: any) {
      return 'ERROR Firestore: ' + err.message;
    }

    return token;
  } catch (error: any) {
    return 'ERROR general: ' + error.message;
  }
}
