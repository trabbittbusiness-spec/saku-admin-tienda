/**
 * uploadMedia.ts
 * 
 * Professional, cross-platform media upload utility for Firebase Storage.
 * 
 * On WEB: uses standard fetch() → Blob → uploadBytes (works perfectly).
 * On MOBILE (Android/iOS): uses expo-file-system's native HTTP client to
 * upload the file directly to the Firebase Storage REST API, completely
 * bypassing JavaScript's broken Blob/ArrayBuffer layer in React Native.
 */

import { Platform } from 'react-native';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, auth } from './firebase';

// Lazy-loaded on mobile only
let FileSystem: typeof import('expo-file-system') | null = null;
if (Platform.OS !== 'web') {
  FileSystem = require('expo-file-system');
}

const STORAGE_BUCKET = 'sakuchile.appspot.com';

/**
 * Upload a local file URI to Firebase Storage.
 * Returns the public download URL.
 * 
 * @param localUri  - The local file:// or content:// URI from ImagePicker
 * @param storagePath - The desired path inside Firebase Storage (e.g. "publicidad/123.jpg")
 * @param contentType - MIME type (default: 'image/jpeg')
 */
export async function uploadMedia(
  localUri: string,
  storagePath: string,
  contentType: string = 'image/jpeg'
): Promise<string> {
  // If it's already a remote URL, return as-is
  if (localUri.startsWith('http') && !localUri.includes('localhost') && !localUri.includes('blob:')) {
    return localUri;
  }

  if (Platform.OS === 'web') {
    return uploadWeb(localUri, storagePath, contentType);
  } else {
    return uploadMobile(localUri, storagePath, contentType);
  }
}

/**
 * WEB: Standard fetch → blob → Firebase uploadBytes.
 * This works perfectly on browsers.
 */
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
 * MOBILE: Uses expo-file-system's native uploadAsync to POST the file
 * directly to the Firebase Storage REST API. This completely bypasses
 * JavaScript's Blob/ArrayBuffer/XHR layer which is broken in React Native.
 */
async function uploadMobile(
  localUri: string,
  storagePath: string,
  contentType: string
): Promise<string> {
  if (!FileSystem) {
    throw new Error('expo-file-system is required for mobile uploads');
  }

  // Get Firebase Auth token for authenticated uploads
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User must be authenticated to upload files');
  }
  const token = await user.getIdToken();

  // Firebase Storage REST API endpoint
  const encodedPath = encodeURIComponent(storagePath);
  const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o?uploadType=media&name=${encodedPath}`;

  const uploadResult = await FileSystem.uploadAsync(uploadUrl, localUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      'Authorization': `Firebase ${token}`,
      'Content-Type': contentType,
    },
  });

  if (uploadResult.status < 200 || uploadResult.status >= 300) {
    console.error('Upload failed:', uploadResult.status, uploadResult.body);
    throw new Error(`Upload failed with status ${uploadResult.status}`);
  }

  // Parse response to get the download token
  const responseData = JSON.parse(uploadResult.body);
  const downloadToken = responseData.downloadTokens;
  const name = responseData.name;

  // Construct the authenticated download URL
  const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodeURIComponent(name)}?alt=media&token=${downloadToken}`;
  return downloadUrl;
}
