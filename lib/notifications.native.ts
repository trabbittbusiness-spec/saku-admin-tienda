import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { doc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export async function registerForPushNotificationsAsync(userId: string) {
  // En Android Expo Go, ni siquiera intentamos cargar el módulo
  if (Platform.OS === 'android' && Constants.appOwnership === 'expo') {
    console.warn('Push Notifications not supported in Expo Go Android.');
    return null;
  }

  try {
    const Notifications = require('expo-notifications');
    
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token!');
        return null;
      }
      
      token = (await Notifications.getDevicePushTokenAsync()).data;
    }

    if (token && userId) {
      const tokensRef = collection(db, 'users', userId, 'fcm_tokens');
      const q = query(tokensRef, where('fcm_token', '==', token));
      const snap = await getDocs(q);

      if (snap.empty) {
        await addDoc(tokensRef, {
          fcm_token: token,
          device_type: Platform.OS.toUpperCase(),
          created_at: serverTimestamp(),
        });
      }
    }

    return token;
  } catch (error) {
    console.warn('Notification registration error:', error);
    return null;
  }
}
