/**
 * uploadMedia.ts
 * 
 * Bulletproof cross-platform media upload for Firebase Storage.
 * 
 * WEB: fetch() → Blob → uploadBytes (standard, works perfectly).
 * MOBILE: expo-file-system readAsStringAsync → base64 → fetch() to Firebase REST API.
 *         This completely bypasses React Native's broken Blob/ArrayBuffer/XHR layer.
 */

import { Platform } from 'react-native';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, auth } from './firebase';

const STORAGE_BUCKET = 'sakuchile.appspot.com';

/**
 * Upload a local file URI to Firebase Storage.
 * Returns the public download URL.
 */
export async function uploadMedia(
  localUri: string,
  storagePath: string,
  contentType: string = 'image/jpeg'
): Promise<string> {
  // Already a remote URL — return as-is
  if (localUri.startsWith('http') && !localUri.includes('localhost') && !localUri.includes('blob:')) {
    return localUri;
  }

  if (Platform.OS === 'web') {
    return uploadWeb(localUri, storagePath, contentType);
  } else {
    return uploadMobile(localUri, storagePath, contentType);
  }
}

/** WEB: Standard fetch → blob → Firebase uploadBytes. Works perfectly in browsers. */
async function uploadWeb(
  localUri: string,
  storagePath: string,
  contentType: string
): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, blob, { contentType });
  return getDownloadURL(storageRef);
}

/**
 * MOBILE: Read local file as base64 with expo-file-system, then POST
 * the raw bytes to Firebase Storage REST API using fetch().
 * 
 * fetch() works fine for REMOTE URLs in React Native — it only fails
 * for local file:// URIs. So we read the file natively, decode base64
 * to a byte array, and fetch() to the Firebase endpoint.
 */
async function uploadMobile(
  localUri: string,
  storagePath: string,
  contentType: string
): Promise<string> {
  const FileSystem = require('expo-file-system');

  // Get Firebase Auth token
  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated to upload');
  const token = await user.getIdToken();

  // 1. Read file as base64 using native file system
  const base64Data: string = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // 2. Decode base64 → raw binary bytes
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // 3. POST raw bytes to Firebase Storage REST API
  const encodedPath = encodeURIComponent(storagePath);
  const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o?uploadType=media&name=${encodedPath}`;

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Firebase ${token}`,
      'Content-Type': contentType,
    },
    body: bytes.buffer,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Firebase upload failed:', response.status, errorText);
    throw new Error(`Upload failed: ${response.status}`);
  }

  const responseData = await response.json();
  const downloadToken = responseData.downloadTokens;
  const name = responseData.name;

  return `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodeURIComponent(name)}?alt=media&token=${downloadToken}`;
}
