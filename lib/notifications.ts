import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { db } from './firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { getMessaging, getToken } from 'firebase/messaging';

export async function registerForPushNotificationsAsync(userId: string) {
  let token;

  try {
    if (Platform.OS === 'web') {
      const messaging = getMessaging();
      // For web, you might need a VAPID key. Using a placeholder or common Saku config if available.
      // If it fails without VAPID, it might need to be passed here.
      token = await getToken(messaging, {
        vapidKey: 'BIsS8-t_ZJ8r49_z5hH9z_GZ5H9z_GZ5H9z_GZ5H9z_GZ5H9z_GZ5H9z_GZ5H9z_GZ5H9z_GZ5H9z_GZ5H9' // Replace with actual VAPID key if needed
      });
    } else {
      if (Device.isDevice) {
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
        // In Expo, getDevicePushTokenAsync gives the native FCM/APNs token
        // Use getExpoPushTokenAsync if you want the Expo token, but user showed FCM tokens.
        const tokenData = await Notifications.getDevicePushTokenAsync();
        token = tokenData.data;
      } else {
        console.log('Must use physical device for Push Notifications');
      }
    }

    if (token) {
      console.log('FCM Token obtained:', token);
      await saveTokenToFirestore(userId, token);
    }
  } catch (error) {
    console.error('Error in registerForPushNotificationsAsync:', error);
  }

  return token;
}

async function saveTokenToFirestore(userId: string, token: string) {
  try {
    const tokensRef = collection(db, 'users', userId, 'fcm_tokens');
    const q = query(tokensRef, where('fcm_token', '==', token));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log('Saving new FCM token to Firestore...');
      await addDoc(tokensRef, {
        fcm_token: token,
        device_type: Platform.OS === 'web' ? 'Web' : (Platform.OS === 'ios' ? 'iOS' : 'Android'),
        app: 'admin',
        created_at: serverTimestamp(),
        device_name: Device.modelName || 'Unknown Device'
      });
    } else {
      console.log('FCM token already exists in Firestore');
    }
  } catch (error) {
    console.error('Error saving token to Firestore:', error);
  }
}
