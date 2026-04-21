import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Notification {
  id: string;
  title: string;
  desc: string;
  time: string;
  type: 'order' | 'user' | 'promo' | 'system';
  read: boolean;
}

const NOTIFICATIONS: Notification[] = [
  { id: '1', title: 'Nuevo Pedido #1234', desc: 'El cliente Juan Perez ha realizado una compra de $150.', time: 'hace 5 min', type: 'order', read: false },
  { id: '2', title: 'Nuevo Usuario', desc: 'Maria Garcia se ha registrado en la plataforma.', time: 'hace 10 min', type: 'user', read: false },
  { id: '3', title: 'Promoción Agotada', desc: 'La promoción "Descuento de Verano" ha llegado a su fin.', time: 'hace 1 hora', type: 'promo', read: true },
  { id: '4', title: 'Actualización de Sistema', desc: 'El panel ha sido actualizado a la versión 3.8.18.', time: 'hace 2 horas', type: 'system', read: true },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function NotificationDrawer({ open, onClose }: Props) {
  const slideAnim = React.useRef(new Animated.Value(400)).current;
  const [visible, setVisible] = React.useState(open);

  React.useEffect(() => {
    if (open) {
      setVisible(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 400,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }
  }, [open]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Notificaciones</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#475569" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {NOTIFICATIONS.map((notif) => (
            <TouchableOpacity key={notif.id} style={[styles.card, !notif.read && styles.unreadCard]} activeOpacity={0.7}>
              <View style={[styles.iconWrapper, styles[`icon_${notif.type}`]]}>
                <Ionicons 
                  name={
                    notif.type === 'order' ? 'receipt' : 
                    notif.type === 'user' ? 'person' : 
                    notif.type === 'promo' ? 'pricetag' : 'settings'
                  } 
                  size={18} 
                  color="#fff" 
                />
              </View>
              <View style={styles.content}>
                <View style={styles.topRow}>
                  <Text style={styles.notifTitle}>{notif.title}</Text>
                  {!notif.read && <View style={styles.unreadDot} />}
                </View>
                <Text style={styles.notifDesc} numberOfLines={2}>{notif.desc}</Text>
                <Text style={styles.notifTime}>{notif.time}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.footer} activeOpacity={0.7}>
          <Text style={styles.footerText}>Ver todas las notificaciones</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Overlay: full-screen container, no flex direction so nothing gets layout-allocated
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  // Backdrop covers 100% of the screen — no gap
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  // Drawer is absolutely anchored to the right edge
  drawer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 380,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
    gap: 12,
  },
  unreadCard: {
    backgroundColor: '#F8FAFC',
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon_order: { backgroundColor: '#6366F1' },
  icon_user: { backgroundColor: '#10B981' },
  icon_promo: { backgroundColor: '#F59E0B' },
  icon_system: { backgroundColor: '#64748B' },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366F1',
  },
  notifDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 6,
  },
  notifTime: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6366F1',
  },
});
