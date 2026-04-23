import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

export default function CuentaScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 860;

  const Content = (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerArea}>
        <Text style={styles.pageTitle}>Mi Espacio</Text>
        <Text style={styles.pageSubtitle}>Administra tu cuenta y configura tu entorno de trabajo</Text>
      </View>

      <View style={[styles.bentoLayout, isDesktop && styles.bentoLayoutDesktop]}>
        
        {/* Left Col: Master Profile Card */}
        <View style={[styles.bentoCard, styles.profileCard, isDesktop && styles.profileCardDesktop]}>
          <View style={styles.avatarGlowContainer}>
            <View style={styles.avatarCircle}>
              <Ionicons name="storefront" size={44} color="#fff" />
            </View>
            <View style={styles.statusDot} />
          </View>

          <Text style={styles.profileName}>¡Hola, Administrador!</Text>
          <Text style={styles.profileEmail}>admin@saku.com</Text>

          <View style={styles.roleBadge}>
            <Ionicons name="star" size={14} color="#EAB308" />
            <Text style={styles.roleText}>Super Admin</Text>
          </View>

          <TouchableOpacity 
            style={styles.editBtn} 
            activeOpacity={0.75}
            onPress={() => router.push('/perfil-completo')}
          >
            <Text style={styles.editBtnText}>Editar Perfil Completo</Text>
          </TouchableOpacity>
        </View>

        {/* Right Col: Grid of Cards */}
        <View style={styles.gridContainer}>
          
          <View style={styles.rowWrapper}>
            {/* Envío */}
            <TouchableOpacity 
              style={[styles.bentoCard, styles.gridItem, isDesktop && styles.gridItemDesktop]} 
              activeOpacity={0.7}
              onPress={() => router.push('/configuracion-envio')}
            >
              <View style={[styles.iconWrapper, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="bicycle-outline" size={24} color="#4F46E5" />
              </View>
              <Text style={styles.itemTitle}>Configuración de Envío</Text>
              <Text style={styles.itemDesc}>Tarifa de Envío</Text>
            </TouchableOpacity>

            {/* Usuarios */}
            <TouchableOpacity 
              style={[styles.bentoCard, styles.gridItem, isDesktop && styles.gridItemDesktop]} 
              activeOpacity={0.7}
              onPress={() => router.push('/usuarios')}
            >
              <View style={[styles.iconWrapper, { backgroundColor: '#FFE4E6' }]}>
                <Ionicons name="people-outline" size={24} color="#E11D48" />
              </View>
              <Text style={styles.itemTitle}>Usuarios</Text>
              <Text style={styles.itemDesc}>Permisos de personal y clientes.</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.rowWrapper}>
            {/* Cupones */}
            <TouchableOpacity 
              style={[styles.bentoCard, styles.gridItem, isDesktop && styles.gridItemDesktop]} 
              activeOpacity={0.7}
              onPress={() => router.push('/cupones')}
            >
              <View style={[styles.iconWrapper, { backgroundColor: '#FEF9C3' }]}>
                <Ionicons name="pricetag-outline" size={24} color="#EAB308" />
              </View>
              <Text style={styles.itemTitle}>Cupones</Text>
              <Text style={styles.itemDesc}>Promociones y descuentos especiales.</Text>
            </TouchableOpacity>

            {/* Categorias */}
            <TouchableOpacity 
              style={[styles.bentoCard, styles.gridItem, isDesktop && styles.gridItemDesktop]} 
              activeOpacity={0.7}
              onPress={() => router.push('/categorias')}
            >
              <View style={[styles.iconWrapper, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="grid-outline" size={24} color="#16A34A" />
              </View>
              <Text style={styles.itemTitle}>Categorias y Marcas</Text>
              <Text style={styles.itemDesc}>Gestión de categorías y filtros.</Text>
            </TouchableOpacity>

            {!isDesktop && (
              <TouchableOpacity 
                style={[styles.bentoCard, styles.gridItem]} 
                activeOpacity={0.7}
                onPress={() => router.push('/publicidad')}
              >
                <View style={[styles.iconWrapper, { backgroundColor: '#F5F3FF' }]}>
                  <Ionicons name="megaphone-outline" size={24} color="#7C3AED" />
                </View>
                <Text style={styles.itemTitle}>Publicidad</Text>
                <Text style={styles.itemDesc}>Gestión de banners y anuncios.</Text>
              </TouchableOpacity>
            )}
          </View>


        </View>

      </View>
    </ScrollView>
  );

  if (!isDesktop) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {Content}
      </SafeAreaView>
    );
  }
  return <View style={{ flex: 1, backgroundColor: '#ffffff' }}>{Content}</View>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { flex: 1, backgroundColor: '#ffffff' },
  content: { paddingHorizontal: 24, paddingVertical: 24, paddingBottom: 100 },
  contentDesktop: { paddingHorizontal: 40, paddingTop: 32, paddingBottom: 60, width: '100%' },

  headerArea: {
    marginBottom: 40,
    alignItems: 'flex-start',
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -1,
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },

  bentoLayout: {
    flexDirection: 'column',
    gap: 24,
  },
  bentoLayoutDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 32,
  },

  bentoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#F1F5F9', // Ultra sublte border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 2,
    padding: 24,
  },

  /* Left Panel */
  profileCard: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  profileCardDesktop: {
    width: 300,
    position: 'sticky',
    top: 32,
  } as any,

  avatarGlowContainer: {
    position: 'relative',
    marginBottom: 28,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#22C55E',
    borderWidth: 3,
    borderColor: '#ffffff',
  },

  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  profileEmail: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 14,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF9C3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    marginBottom: 40,
  },
  roleText: {
    color: '#CA8A04',
    fontSize: 13,
    fontWeight: '700',
  },

  editBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  editBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },

  /* Right Panel Grid */
  gridContainer: {
    flex: 1,
    flexDirection: 'column',
    gap: 24,
  },
  rowWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
  gridItem: {
    flex: 1,
    minWidth: '100%',
    alignItems: 'flex-start',
    padding: 24,
  },
  gridItemDesktop: {
    minWidth: '46%',
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  itemDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    fontWeight: '500',
  },


});
