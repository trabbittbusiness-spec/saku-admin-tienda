/**
 * uploadMedia.ts
 * 
 * Bulletproof cross-platform media upload for Firebase Storage.
 * 
 * WEB: fetch() → Blob → uploadBytes.
 * MOBILE: expo-file-system read base64 → decode → fetch() POST to REST API.
 */

import { Platform } from 'react-native';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, auth } from './firebase';

const STORAGE_BUCKET = 'sakuchile.appspot.com';

export async function uploadMedia(
  localUri: string,
  storagePath: string,
  contentType: string = 'image/jpeg'
): Promise<string> {
  if (localUri.startsWith('http') && !localUri.includes('localhost') && !localUri.includes('blob:')) {
    return localUri;
  }

  if (Platform.OS === 'web') {
    const response = await fetch(localUri);
    const blob = await response.blob();
    const storageRef = ref(storage, storagePath);
    await uploadBytes(storageRef, blob, { contentType });
    return getDownloadURL(storageRef);
  }

  // ===== MOBILE =====
  const FileSystem = require('expo-file-system/legacy');

  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated to upload');
  const token = await user.getIdToken();

  // Read file as base64 — using raw string 'base64', NOT the enum
  const base64Data: string = await FileSystem.readAsStringAsync(localUri, {
    encoding: 'base64',
  });

  // Decode base64 to raw bytes
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // POST to Firebase Storage REST API
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
  return `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodeURIComponent(responseData.name)}?alt=media&token=${responseData.downloadTokens}`;
}
