import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { doc, updateDoc, setDoc, collection, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function registerForPushNotificationsAsync(userId: string) {
  // Las notificaciones push no están disponibles en Web
  if (Platform.OS === 'web') {
    console.log('Push notifications not supported on web.');
    return;
  }

  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice || Platform.OS === 'web') {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    
    // Learn more about projectId here: https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-projectid
    try {
      token = (await Notifications.getDevicePushTokenAsync()).data;
    } catch (e) {
      console.log('Could not get device token:', e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  if (token && userId) {
    try {
      const { collection: col, query, where, getDocs, addDoc, serverTimestamp } = await import('firebase/firestore');
      const tokensRef = col(db, 'users', userId, 'fcm_tokens');
      const q = query(tokensRef, where('fcm_token', '==', token));
      const snap = await getDocs(q);

      if (snap.empty) {
        await addDoc(tokensRef, {
          fcm_token: token,
          device_type: Platform.OS.toUpperCase(),
          created_at: serverTimestamp(),
        });
        console.log('FCM token registrado correctamente');
      } else {
        console.log('FCM token ya registrado, no se duplica');
      }
    } catch (error) {
      console.error('Error guardando FCM token:', error);
    }
  }

  return token;
}
