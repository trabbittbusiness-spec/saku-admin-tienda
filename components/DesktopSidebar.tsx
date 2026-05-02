import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable, Platform, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, router } from 'expo-router';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const NAV_ITEMS = [
  { name: 'hogar',     label: 'Dashboard', activeIcon: 'home',                inactiveIcon: 'home-outline' },
  { name: 'productos', label: 'Productos', activeIcon: 'grid',                inactiveIcon: 'grid-outline' },
  { name: 'promocion', label: 'Promoción', activeIcon: 'pricetag',            inactiveIcon: 'pricetag-outline' },
  { name: 'servicios', label: 'Servicios', activeIcon: 'briefcase',           inactiveIcon: 'briefcase-outline' },
  { name: 'agenda',    label: 'Agenda',    activeIcon: 'calendar',            inactiveIcon: 'calendar-outline' },
  { name: 'ordenes',   label: 'Órdenes',   activeIcon: 'receipt',             inactiveIcon: 'receipt-outline' },

  { name: 'publicidad',label: 'Publicidad',activeIcon: 'megaphone',           inactiveIcon: 'megaphone-outline' },
  { name: 'cuenta',    label: 'Mi Cuenta', activeIcon: 'person',              inactiveIcon: 'person-outline' },
] as const;

interface Props {
  open: boolean;
  isMobile: boolean;
  onClose: () => void;
}

export default function DesktopSidebar({ open, isMobile, onClose }: Props) {
  const pathname = usePathname();

  const [userData, setUserData] = useState<any>(null);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          } else {
            setUserData({
              display_name: user.displayName || 'Admin',
              email: user.email,
            });
          }
        } catch (error) {
          console.error("Error sidebar user data:", error);
        }
      } else {
        setUserData(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Escuchar órdenes pendientes
    const q = query(
      collection(db, 'Orden'), 
      where('estado', 'in', ['pendiente', 'Pendiente', 'procesando', 'en proceso', 'En proceso', 'en camino'])
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingOrdersCount(snapshot.size);
    }, (error) => {
      console.error("Error listening to pending orders:", error);
    });

    return () => unsubscribe();
  }, []);

  // On mobile, if not open, it's completely hidden
  if (isMobile && !open) return null;

  // On desktop, if not open, it's "collapsed"
  const collapsed = !isMobile && !open;


  const content = (
    <View style={[
      styles.sidebar, 
      isMobile && styles.sidebarMobile,
      collapsed && styles.sidebarCollapsed
    ]}>
      {/* Logo */}
      <View style={[styles.logoSection, collapsed && styles.logoSectionCollapsed]}>
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/images/logo_saku_cl.png')} 
            style={styles.mainLogo}
            resizeMode="contain"
          />
        </View>
        {!collapsed && (
          <View>
            <Text style={styles.brandName}>Saku Admin</Text>
            <Text style={styles.brandSub}>Panel de Control</Text>
          </View>
        )}
      </View>

      <View style={styles.divider} />

      {/* Nav Items */}
      <ScrollView style={styles.nav} showsVerticalScrollIndicator={false}>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.includes(item.name);
          const iconName = isActive ? item.activeIcon : item.inactiveIcon;
          return (
            <TouchableOpacity
              key={item.name}
              style={[
                styles.navItem,
                isActive && styles.navItemActive,
                collapsed && styles.navItemCollapsed
              ]}
              onPress={() => {
                router.push(`/${item.name}` as any);
                if (isMobile) onClose();
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={iconName as any}
                size={20}
                color={isActive ? '#fff' : '#94A3B8'}
              />
              {!collapsed && (
                <>
                  <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                    {item.label}
                  </Text>
                  {item.name === 'ordenes' && pendingOrdersCount > 0 && (
                    <View style={styles.badgeContainer}>
                      <Text style={styles.badgeText}>{pendingOrdersCount}</Text>
                    </View>
                  )}
                  {isActive && <View style={styles.activeDot} />}
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Bottom User Card */}
      {!collapsed && (
        <View style={styles.bottomSection}>
          <View style={styles.divider} />
          <View style={styles.userCard}>
            <View style={styles.avatarLarge}>
              <Ionicons name="person" size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, marginLeft: 4 }}>
              <Text style={styles.userName} numberOfLines={1}>
                {userData?.display_name || 'Cargando...'}
              </Text>
              <Text style={styles.userEmail} numberOfLines={1}>
                {userData?.email || 'admin@saku.com'}
              </Text>
            </View>

            <TouchableOpacity 
              onPress={() => auth.signOut()}
              style={styles.logoutBtn}
            >
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      )}
      {collapsed && (
        <View style={styles.bottomCollapsed}>
          <View style={styles.divider} />
          <View style={styles.avatarLarge}>
            <Ionicons name="person" size={20} color="#FFFFFF" />
          </View>
        </View>
      )}
    </View>
  );

  // If mobile, wrap in a backdrop overlay
  if (isMobile) {
    return (
      <View style={styles.mobileOverlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        {content}
      </View>
    );
  }

  // If desktop, just return the sidebar next to content
  return content;
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    backgroundColor: '#000000',
    paddingTop: Platform.OS === 'web' ? 32 : 50,
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexDirection: 'column',
    height: '100%',
    boxShadow: '4px 0 24px rgba(0,0,0,0.05)',
  } as any,
  sidebarCollapsed: {
    width: 72,
    paddingHorizontal: 10,
  },
  sidebarMobile: {
    // Uses 260 width but sits in an absolute overlay
  },
  mobileOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
    paddingHorizontal: 4,
  },
  logoSectionCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  logoContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  mainLogo: {
    width: '100%',
    height: '100%',
  },
  brandName: { color: '#F8FAFC', fontSize: 16, fontWeight: '900', letterSpacing: -0.5 },
  brandSub: { color: '#64748B', fontSize: 11, fontWeight: '700', marginTop: 1 },
  divider: { height: 1, backgroundColor: '#1E293B', marginVertical: 12 },
  nav: { flex: 1, marginTop: 4 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 6,
    cursor: Platform.OS === 'web' ? 'pointer' : 'default',
  } as any,
  navItemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
    gap: 0,
  },
  navItemActive: { backgroundColor: '#63348C' },
  navLabel: { flex: 1, color: '#94A3B8', fontSize: 15, fontWeight: '600' },
  navLabelActive: { color: '#fff', fontWeight: '700' },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#A5B4FC', marginLeft: 8 },
  badgeContainer: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  bottomSection: {},
  bottomCollapsed: { alignItems: 'center' },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  avatarLarge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#63348C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: { color: '#F8FAFC', fontSize: 14, fontWeight: '700' },
  userEmail: { color: '#64748B', fontSize: 12, marginTop: 1 },
  logoutBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
});
