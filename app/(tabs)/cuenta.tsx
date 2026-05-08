import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import ShopScheduleModal from '../../components/ShopScheduleModal';
import NotifyClientsModal from '../../components/NotifyClientsModal';



export default function CuentaScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 860;

  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          } else {
            // Fallback to auth data if firestore doc is missing
            setUserData({
              display_name: user.displayName || 'Administrador',
              email: user.email,
            });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const Content = (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerArea}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.pageTitle}>Mi Espacio</Text>
            <Text style={styles.pageSubtitle}>Mi perfil de admin</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity 
              style={styles.headerIconBtn} 
              onPress={() => setNotifyModalOpen(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="megaphone-outline" size={26} color="#10B981" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerIconBtn} 
              onPress={() => setScheduleModalOpen(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="time-outline" size={28} color="#0F172A" />
            </TouchableOpacity>
          </View>
        </View>
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

          <Text style={styles.profileName}>
            {loading ? 'Cargando...' : `¡Hola, ${userData?.display_name || 'Administrador'}!`}
          </Text>
          <Text style={styles.profileEmail}>
            {loading ? '...' : userData?.email || 'admin@saku.com'}
          </Text>


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
              <Text style={styles.itemTitle}>Clientes</Text>
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
                  <Ionicons name="megaphone-outline" size={24} color="#63348C" />
                </View>
                <Text style={styles.itemTitle}>Publicidad</Text>
                <Text style={styles.itemDesc}>Gestión de banners y anuncios.</Text>
              </TouchableOpacity>
            )}
          </View>

            {/* Agenda for Mobile */}
            {!isDesktop && (
              <TouchableOpacity 
                style={[styles.bentoCard, styles.gridItem]} 
                activeOpacity={0.7}
                onPress={() => router.push('/agenda')}
              >
                <View style={[styles.iconWrapper, { backgroundColor: '#F0F9FF' }]}>
                  <Ionicons name="calendar-outline" size={24} color="#63348C" />
                </View>
                <Text style={styles.itemTitle}>Agenda</Text>
                <Text style={styles.itemDesc}>Gestiona tus citas del día y horarios programados.</Text>
              </TouchableOpacity>
            )}

          </View>


      </View>
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      {isDesktop ? Content : (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          {Content}
        </SafeAreaView>
      )}
      <ShopScheduleModal visible={scheduleModalOpen} onClose={() => setScheduleModalOpen(false)} />
      <NotifyClientsModal visible={notifyModalOpen} onClose={() => setNotifyModalOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { flex: 1, backgroundColor: '#ffffff' },
  content: { paddingHorizontal: 24, paddingVertical: 24, paddingBottom: 100 },
  contentDesktop: { paddingHorizontal: 40, paddingTop: 32, paddingBottom: 60, width: '100%' },

  headerArea: {
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 12,
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
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  profileCardDesktop: {
    width: 300,
    position: 'sticky',
    top: 32,
  } as any,

  avatarGlowContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatarCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#63348C',
    borderWidth: 3,
    borderColor: '#ffffff',
  },

  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
    textAlign: 'center',
  },
  profileEmail: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF9C3',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    gap: 6,
    marginBottom: 24,
  },
  roleText: {
    color: '#CA8A04',
    fontSize: 12,
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
    padding: 20,
  },
  gridItemDesktop: {
    minWidth: '46%',
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  itemDesc: {
    fontSize: 10.5,
    color: '#64748B',
    lineHeight: 16,
    fontWeight: '500',
  },


});
