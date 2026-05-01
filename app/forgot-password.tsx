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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { LinearGradient } from 'expo-linear-gradient';

export default function ForgotPasswordScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1024;

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleReset = async () => {
    if (!email) {
      setError('Por favor ingresa tu correo electrónico');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found') {
        setError('No existe una cuenta con este correo');
      } else {
        setError('Ocurrió un error. Intenta nuevamente');
      }
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
            
            <TouchableOpacity 
              style={styles.backBtn} 
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#0F172A" />
            </TouchableOpacity>

            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Image 
                  source={require('../assets/images/logo_saku_cl.png')} 
                  style={styles.logoImage} 
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.title}>RECUPERAR</Text>
              <Text style={styles.subtitle}>
                {success 
                  ? 'Instrucciones Enviadas' 
                  : 'Restablece el acceso a tu cuenta'}
              </Text>
            </View>

            {!success ? (
              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>CORREO ELECTRÓNICO</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={18} color="#64748B" />
                    <TextInput
                      style={styles.input}
                      placeholder="tu@email.com"
                      placeholderTextColor="#94A3B8"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <TouchableOpacity
                  onPress={handleReset}
                  disabled={loading}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={['#63348C', '#63348C']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionBtn}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Text style={styles.actionBtnText}>ENVIAR INSTRUCCIONES</Text>
                        <Ionicons name="send-outline" size={18} color="#fff" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.successContainer}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark-circle" size={64} color="#63348C" />
                </View>
                <Text style={styles.successText}>
                  Revisa tu bandeja de entrada en <Text style={styles.emailHighlight}>{email}</Text>
                </Text>
                <TouchableOpacity
                  onPress={() => router.replace('/login')}
                  style={[styles.actionBtn, { backgroundColor: '#0F172A' }]}
                >
                  <Text style={styles.actionBtnText}>VOLVER AL LOGIN</Text>
                </TouchableOpacity>
              </View>
            )}

          </View>
        </View>
      </KeyboardAvoidingView>
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
  backBtn: {
    position: 'absolute',
    top: 24,
    left: 24,
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
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
    fontSize: 22,
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
    textAlign: 'center',
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
  actionBtn: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  successContainer: {
    alignItems: 'center',
    gap: 16,
  },
  successIcon: {
    marginBottom: 8,
  },
  successText: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 24,
  },
  emailHighlight: {
    fontWeight: '800',
    color: '#0F172A',
  },
});
