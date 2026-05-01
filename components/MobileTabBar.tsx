import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useState, useEffect } from 'react';

const TABS = [
  { name: 'hogar', label: 'Hogar', icon: 'home' as const },
  { name: 'productos', label: 'Productos', icon: 'grid' as const },
  { name: 'promocion', label: 'Promoción', icon: 'pricetag' as const },
  { name: 'servicios', label: 'Servicios', icon: 'briefcase' as const },
  { name: 'ordenes', label: 'Órdenes', icon: 'receipt' as const },
  { name: 'cuenta', label: 'Cuenta', icon: 'person' as const },
];

export default function MobileTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeIndex = state.index;
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);

  useEffect(() => {
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

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 4 }]}>
      {TABS.map((tab) => {
        const currentRouteName = state.routes[state.index].name;
        const isActive = currentRouteName === tab.name;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabItem}
            onPress={() => navigation.navigate(tab.name)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrapper, isActive && styles.iconWrapperActive]}>
              <Ionicons
                name={isActive ? tab.icon : (`${tab.icon}-outline` as any)}
                size={22}
                color={isActive ? '#fff' : '#94A3B8'}
              />
              {tab.name === 'ordenes' && pendingOrdersCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingOrdersCount}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    paddingTop: 10,
    paddingHorizontal: 8,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  iconWrapper: {
    width: 44,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapperActive: {
    backgroundColor: '#63348C',
  },
  label: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
  labelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#0F172A',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
});
