import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Pressable, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, router } from 'expo-router';

const NAV_ITEMS = [
  { name: 'hogar',     label: 'Hogar',     activeIcon: 'home-outline',        inactiveIcon: 'home-outline' },
  { name: 'productos', label: 'Productos', activeIcon: 'grid',                inactiveIcon: 'grid-outline' },
  { name: 'promocion', label: 'Promoción', activeIcon: 'pricetag',            inactiveIcon: 'pricetag-outline' },
  { name: 'ordenes',   label: 'Órdenes',   activeIcon: 'receipt',             inactiveIcon: 'receipt-outline' },
  { name: 'cuenta',    label: 'Mi Cuenta', activeIcon: 'person',              inactiveIcon: 'person-outline' },
] as const;

interface Props {
  open: boolean;
  isMobile: boolean;
  onClose: () => void;
}

export default function DesktopSidebar({ open, isMobile, onClose }: Props) {
  const pathname = usePathname();

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
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>S</Text>
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
            <View style={styles.avatarSmall}>
              <Ionicons name="person" size={16} color="#6366F1" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>Admin</Text>
              <Text style={styles.userEmail}>admin@saku.com</Text>
            </View>
            <TouchableOpacity>
              <Ionicons name="log-out-outline" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </View>
      )}
      {collapsed && (
        <View style={styles.bottomCollapsed}>
          <View style={styles.divider} />
          <View style={styles.avatarSmall}>
            <Ionicons name="person" size={16} color="#6366F1" />
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
    width: 260,
    backgroundColor: '#0F172A',
    paddingTop: Platform.OS === 'web' ? 32 : 50,
    paddingHorizontal: 16,
    paddingBottom: 24,
    flexDirection: 'column',
    height: '100%',
    transition: 'width 0.25s ease',
  } as any,
  sidebarCollapsed: {
    width: 68,
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
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  logoSectionCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logoText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  brandName: { color: '#F8FAFC', fontSize: 16, fontWeight: '700' },
  brandSub: { color: '#64748B', fontSize: 11 },
  divider: { height: 1, backgroundColor: '#1E293B', marginVertical: 12 },
  nav: { flex: 1, marginTop: 4 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 4,
  },
  navItemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
    gap: 0,
  },
  navItemActive: { backgroundColor: '#6366F1' },
  navLabel: { flex: 1, color: '#94A3B8', fontSize: 15, fontWeight: '500' },
  navLabelActive: { color: '#fff', fontWeight: '600' },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#A5B4FC' },
  bottomSection: {},
  bottomCollapsed: { alignItems: 'center' },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: { color: '#F8FAFC', fontSize: 13, fontWeight: '600' },
  userEmail: { color: '#64748B', fontSize: 11 },
});
