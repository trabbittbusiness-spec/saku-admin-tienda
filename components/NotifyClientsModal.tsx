import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Modal, Animated, Pressable, ActivityIndicator, Platform,
  KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, getDocs, doc, serverTimestamp, query, where } from 'firebase/firestore';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function NotifyClientsModal({ visible, onClose }: Props) {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const scaleAnim = React.useRef(new Animated.Value(0.85)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      setSent(false);
      setSending(false);
      setTitle('');
      setDescription('');
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 200 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 0.85, useNativeDriver: true, damping: 18, stiffness: 200 }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleSend = async () => {
    if (!title.trim()) return;
    setSending(true);
    try {
      // 1. Fetch only non-admin users
      const usersSnap = await getDocs(query(collection(db, 'users'), where('IsAdmin', '==', false)));
      const userRefsArr = usersSnap.docs.map(d => `users/${d.id}`);
      const userRefsString = userRefsArr.join(',');

      // 2. Create the notification document following the FF pattern
      await addDoc(collection(db, 'ff_user_push_notifications'), {
        initial_page_name: 'index', // Default page for customers
        notification_text: description || 'Revisa las novedades en la app',
        notification_title: title,
        num_sent: usersSnap.size,
        parameter_data: '{}',
        sender: doc(db, 'users', auth.currentUser?.uid || ''),
        status: 'pending', // Trigger for the cloud function
        app_target: 'tienda',
        timestamp: serverTimestamp(),
        user_refs: userRefsString
      });

      setSent(true);
      setTimeout(onClose, 2000);
    } catch (error) {
      console.error('Error sending push notification:', error);
      alert('Error al enviar la notificación. Inténtalo de nuevo.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.backdropContainer}>
        {/* Backdrop is absolutely positioned so the card floats above it */}
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <Animated.View
            style={[styles.card, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}
          >
            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.accentBar} />
              <View style={styles.cardHeader}>
                <View style={styles.iconContainer}>
                  <Ionicons name="megaphone" size={22} color="#fff" />
                </View>
                <View style={styles.cardHeaderText}>
                  <Text style={styles.cardTitle}>Notificar Clientes</Text>
                  <Text style={styles.cardSubtitle}>Envía una notificación a todos tus clientes</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {sent ? (
                <View style={styles.successState}>
                  <View style={styles.successIcon}>
                    <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                  </View>
                  <Text style={styles.successTitle}>¡Notificación enviada!</Text>
                  <Text style={styles.successDesc}>Todos los clientes recibirán tu mensaje.</Text>
                </View>
              ) : (
                <>
                  {/* Fields */}
                  <View style={styles.fields}>
                    <View style={styles.fieldGroup}>
                      <Text style={styles.label}>Título</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Ej: ¡Oferta especial de esta semana! 🎉"
                        placeholderTextColor="#CBD5E1"
                        value={title}
                        onChangeText={setTitle}
                        maxLength={80}
                      />
                      <Text style={styles.charCount}>{title.length}/80</Text>
                    </View>

                    <View style={styles.fieldGroup}>
                      <Text style={styles.label}>Descripción</Text>
                      <TextInput
                        style={[styles.input, styles.textarea]}
                        placeholder="Escribe el mensaje que verán tus clientes en la notificación…"
                        placeholderTextColor="#CBD5E1"
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={4}
                        maxLength={200}
                        textAlignVertical="top"
                      />
                      <Text style={styles.charCount}>{description.length}/200</Text>
                    </View>

                    {/* Audience Badge */}
                    <View style={styles.audienceBadge}>
                      <Ionicons name="people" size={16} color="#63348C" />
                      <Text style={styles.audienceText}>Se enviará a <Text style={styles.audienceBold}>todos los clientes</Text> registrados</Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
                      <Text style={styles.cancelText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.sendBtn, !title.trim() && styles.sendBtnDisabled]}
                      onPress={handleSend}
                      activeOpacity={0.75}
                      disabled={!title.trim() || sending}
                    >
                      {sending ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <Ionicons name="send" size={16} color="#fff" />
                          <Text style={styles.sendText}>Enviar</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropContainer: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  keyboardView: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#fff',
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.2,
    shadowRadius: 48,
    elevation: 20,
  },
  accentBar: {
    height: 4,
    backgroundColor: '#63348C',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#63348C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: { flex: 1 },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fields: {
    padding: 24,
    gap: 20,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0F172A',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } as any : {}),
  },
  textarea: {
    minHeight: 100,
    paddingTop: 14,
  },
  charCount: {
    fontSize: 11,
    color: '#CBD5E1',
    textAlign: 'right',
  },
  audienceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  audienceText: {
    fontSize: 13,
    color: '#63348C',
  },
  audienceBold: {
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    paddingTop: 0,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  sendBtn: {
    flex: 2,
    flexDirection: 'row',
    borderRadius: 14,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  sendBtnDisabled: {
    backgroundColor: '#6EE7B7',
    shadowOpacity: 0,
  },
  sendText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },
  // Success state
  successState: {
    padding: 48,
    alignItems: 'center',
    gap: 12,
  },
  successIcon: {
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  successDesc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
});
