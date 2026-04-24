import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import NotifyClientsModal from './NotifyClientsModal';

const PAGE_TITLES: Record<string, string> = {
  hogar: 'Hogar',
  productos: 'Productos',
  promocion: 'Promociones',
  ordenes: 'Órdenes',
  cuenta: 'Mi Cuenta',
  'perro-gato': 'Nuevo Producto',
  exotico: 'Nuevo Producto',
  categorias: 'Categorías',
  'configuracion-envio': 'Configuración de Envío',
  'cupones': 'Cupones',
  'usuarios': 'Usuarios',
};

interface Props {
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onToggleNotifications?: () => void;
}

export default function DesktopHeader({ 
  sidebarOpen = true, 
  onToggleSidebar,
  onToggleNotifications 
}: Props) {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const currentPage = segments[segments.length - 1] ?? 'hogar';
  const title = PAGE_TITLES[currentPage] ?? 'Panel';
  const [notifyModalOpen, setNotifyModalOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);

  React.useEffect(() => {
    const { db } = require('../lib/firebase');
    const { collection, query, where, onSnapshot } = require('firebase/firestore');
    
    const q = query(collection(db, 'Notifications'), where('read', '==', false));
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      setUnreadCount(snapshot.size);
    });

    return () => unsubscribe();
  }, []);

  return (
    <>
      <View style={styles.header}>
        <View style={styles.left}>
          {/* Hamburger toggle */}
          <TouchableOpacity style={styles.menuBtn} onPress={onToggleSidebar} activeOpacity={0.7}>
            <Ionicons
              name="menu-outline"
              size={24}
              color="#475569"
            />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>Panel de administración</Text>
          </View>
        </View>

        <View style={styles.right}>
          {/* Notification Action */}
          <TouchableOpacity style={styles.notifyActionBtn} activeOpacity={0.7} onPress={() => setNotifyModalOpen(true)}>
            <Ionicons name="megaphone-outline" size={18} color="#6366F1" />
            <Text style={styles.notifyActionText}>Notificar clientes</Text>
          </TouchableOpacity>

          {/* Notification Bell */}
          <TouchableOpacity style={styles.iconBtn} onPress={onToggleNotifications} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={30} color="#475569" />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <NotifyClientsModal visible={notifyModalOpen} onClose={() => setNotifyModalOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notifyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  notifyActionText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '700',
  },
  iconBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    position: 'absolute',
    top: 6,
    right: 6,
    borderWidth: 2,
    borderColor: '#fff',
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
});
