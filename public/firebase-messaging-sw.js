// Scripts for firebase and firebase messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId.
firebase.initializeApp({
    apiKey: "AIzaSyAplKriWNbFnxLXhj7HFnpzCLMh0xetb3I",
    authDomain: "sakuchile.firebaseapp.com",
    projectId: "sakuchile",
    storageBucket: "sakuchile.appspot.com",
    messagingSenderId: "936867850434",
    appId: "1:936867850434:web:672ea30a8ce4196bee735b",
    measurementId: "G-E18Y924S9N"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification?.title || 'Saku Admin';
  const notificationOptions = {
    body: payload.notification?.body || 'Nueva notificación recibida',
    icon: '/icon.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
