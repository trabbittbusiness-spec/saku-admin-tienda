import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import NotifyClientsModal from './NotifyClientsModal';
import ShopScheduleModal from './ShopScheduleModal';

const PAGE_TITLES: Record<string, string> = {
  hogar: 'Dashboard',
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
  const [scheduleModalOpen, setScheduleModalOpen] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [pendingOrdersCount, setPendingOrdersCount] = React.useState(0);

  React.useEffect(() => {
    const { db } = require('../lib/firebase');
    const { collection, query, where, onSnapshot } = require('firebase/firestore');
    
    const q = query(collection(db, 'Notifications'), where('read', '==', false));
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      setUnreadCount(snapshot.size);
    });

    const qOrders = query(
      collection(db, 'Orden'), 
      where('estado', 'in', ['pendiente', 'Pendiente', 'procesando', 'en proceso', 'En proceso', 'en camino'])
    );
    const unsubscribeOrders = onSnapshot(qOrders, (snapshot: any) => {
      setPendingOrdersCount(snapshot.size);
    });

    return () => {
      unsubscribe();
      unsubscribeOrders();
    };
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.title}>{title}</Text>
              {currentPage === 'ordenes' && pendingOrdersCount > 0 && (
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeText}>{pendingOrdersCount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.subtitle}>Panel de gestión administrativa</Text>
          </View>
        </View>

        <View style={styles.right}>
          {/* Notification Action */}
          <TouchableOpacity style={styles.notifyActionBtn} activeOpacity={0.7} onPress={() => setNotifyModalOpen(true)}>
            <Ionicons name="megaphone-outline" size={18} color="#63348C" />
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
      <ShopScheduleModal visible={scheduleModalOpen} onClose={() => setScheduleModalOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    height: 68,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  subtitle: { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginTop: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  notifyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E9E7FF',
  },
  notifyActionText: {
    color: '#63348C',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
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
  headerBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
});
