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
  const FileSystem = require('expo-file-system');

  const user = auth.currentUser;
  if (!user) throw new Error('User must be authenticated to upload');
  const token = await user.getIdToken();

  const encodedPath = encodeURIComponent(storagePath);
  const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o?uploadType=media&name=${encodedPath}`;

  const response = await FileSystem.uploadAsync(uploadUrl, localUri, {
    headers: {
      'Authorization': `Firebase ${token}`,
      'Content-Type': contentType,
    },
    httpMethod: 'POST',
    uploadType: 0, // BINARY_CONTENT
  });

  if (response.status < 200 || response.status >= 300) {
    console.error('Firebase upload failed:', response.status, response.body);
    throw new Error(`Upload failed: ${response.status}`);
  }

  const responseData = JSON.parse(response.body);
  return `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodeURIComponent(responseData.name)}?alt=media&token=${responseData.downloadTokens}`;
}
