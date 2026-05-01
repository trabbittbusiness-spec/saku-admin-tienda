import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  useWindowDimensions,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  ImageBackground,
  Modal,
} from 'react-native';


import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

import { registerForPushNotificationsAsync } from '../lib/notifications';
import { LinearGradient } from 'expo-linear-gradient';

import { BlurView } from 'expo-blur';

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1024;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMsg, setModalMsg] = useState('');
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  const showError = (msg: string) => {
    // Limpiar timer previo si existe
    if (timer) clearTimeout(timer);
    
    setModalMsg(msg);
    setError(msg);
    setModalVisible(true);

    // Auto-ocultar después de 2.5 segundos
    const newTimer = setTimeout(() => {
      setModalVisible(false);
    }, 2500);
    setTimer(newTimer);
  };




  const handleLogin = async () => {
    console.log('Attempting login with:', email);
    if (!email || !password) {
      showError('Ingresa tus credenciales');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      console.log('User authenticated:', user.uid);

      // 1. Verificar si es Admin en Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        console.log('User data found, IsAdmin:', userData.IsAdmin);
        
        if (userData.IsAdmin !== true) {
          console.log('Access denied: User is not an admin');
          setLoading(false);
          const msg = 'Acceso denegado: No tienes permisos de administrador.';
          
          // 1. Usar el aviso GLOBAL del RootLayout
          if (typeof window !== 'undefined' && (window as any).showSakuToast) {
            (window as any).showSakuToast(msg);
          } else {
            showError(msg); // Fallback
          }
          
          // 2. Cerrar sesión después de un breve delay
          setTimeout(async () => {
             await signOut(auth);
          }, 500);
          
          return;
        }





        // 2. Si es admin, registrar/verificar FCM Token
        try {
          await registerForPushNotificationsAsync(user.uid);
        } catch (fcmErr) {
          console.log('Error registering FCM:', fcmErr);
        }

        router.replace('/(tabs)/hogar');
      } else {
        console.log('User document not found in Firestore. Creating basic profile...');
        // Si no existe, lo creamos pero con IsAdmin: false por seguridad (puedes cambiarlo a true si quieres que el primer login cree admins)
        try {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            display_name: user.displayName || 'Nuevo Usuario',
            IsAdmin: false, 
            created_time: serverTimestamp(),
          });
          
          await signOut(auth);
          showError('Cuenta creada. Solicita permisos de administrador para acceder.');
        } catch (createErr) {
          console.error('Error creating user doc:', createErr);
          await signOut(auth);
          showError('Error al inicializar tu perfil.');
        }
      }


    } catch (err: any) {
      console.error('Login error code:', err.code);
      console.error('Login error message:', err.message);
      
      let errorMsg = 'Credenciales inválidas. Por favor intenta de nuevo.';
      
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        errorMsg = 'El correo o la contraseña son incorrectos.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMsg = 'Demasiados intentos fallidos. Intenta más tarde.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMsg = 'Error de red. Verifica tu conexión.';
      }

      showError(errorMsg);
      setLoading(false); // Asegurar que el loading se quite si hay error
    } finally {
      setLoading(false);
    }
  };


  return (
    <ImageBackground
      source={require('../assets/images/login_bg_cool.png')}
      style={styles.container}
    >
      <LinearGradient
        colors={['rgba(15, 23, 42, 0.4)', 'rgba(15, 23, 42, 0.9)']}
        style={StyleSheet.absoluteFill}
      />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={[styles.cardWrapper, isDesktop && styles.cardWrapperDesktop]}>
          <View style={styles.solidCard}>
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Image 
                  source={require('../assets/images/logo_saku_cl.png')} 
                  style={styles.logoImage} 
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.title}>SAKU ADMIN</Text>
              <Text style={styles.subtitle}>Gestión Veterinaria de Élite</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>USUARIO / EMAIL</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={18} color="#64748B" />
                  <TextInput
                    style={styles.input}
                    placeholder="admin@saku.cl"
                    placeholderTextColor="#94A3B8"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>CONTRASEÑA</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={18} color="#64748B" />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="#94A3B8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color="#64748B"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity 
                onPress={() => router.push('/forgot-password')}
                style={styles.forgotBtn}
              >
                <Text style={styles.forgotText}>¿Problemas para acceder?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#63348C', '#63348C']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.loginBtn}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.loginBtnText}>ACCEDER AL PANEL</Text>
                      <Ionicons name="chevron-forward" size={18} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Notificación de Error (Toast) */}
      {modalVisible && (
        <View style={styles.toastContainer}>
          <BlurView intensity={90} tint="dark" style={styles.toastContent}>
            <Ionicons name="alert-circle" size={24} color="#F87171" />
            <Text style={styles.toastText}>{modalMsg}</Text>
          </BlurView>
        </View>
      )}



    </ImageBackground>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#0F172A',
  },

  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cardWrapper: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardWrapperDesktop: {
    maxWidth: 450,
  },
  solidCard: {
    padding: 40,
    width: '100%',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
  },

  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#63348C',
    padding: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#63348C',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  logoImage: {
    width: '85%',
    height: '85%',
  },

  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    fontWeight: '600',
    letterSpacing: 1,
  },

  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.03)',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '600',
    outlineStyle: 'none',
  } as any,

  errorText: {
    color: '#F87171',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  forgotBtn: {
    alignSelf: 'center',
  },
  forgotText: {
    color: '#63348C',
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  loginBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '800',
    letterSpacing: 3,
  },
  toastContainer: {
    position: 'absolute',
    top: 30,
    left: 20,
    right: 20,
    zIndex: 99999,
    alignItems: 'center',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 18,
    borderRadius: 24,
    gap: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(248, 113, 113, 0.4)',
    overflow: 'hidden',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  toastText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

});


