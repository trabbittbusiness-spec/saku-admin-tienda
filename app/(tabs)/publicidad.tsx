import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  Animated,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { db, storage } from '../../lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  orderBy 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

function Toast({ visible, message, type, onHide }: { visible: boolean; message: string; type: 'success' | 'error'; onHide: () => void }) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [translateY] = useState(new Animated.Value(-20));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
      const timer = setTimeout(() => {
        hide();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hide = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -20, duration: 300, useNativeDriver: true }),
    ]).start(() => onHide());
  };

  if (!visible && fadeAnim._value === 0) return null;

  return (
    <Animated.View style={[
      styles.toast, 
      { opacity: fadeAnim, transform: [{ translateY }] },
      type === 'success' ? styles.toastSuccess : styles.toastError
    ]}>
      <Ionicons name={type === 'success' ? "checkmark-circle" : "alert-circle"} size={20} color="#fff" />
      <Text style={styles.toastText}>{message}</Text>
      <TouchableOpacity onPress={hide} style={styles.toastBtn}>
        <Text style={styles.toastBtnText}>Aceptar</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}



function ConfirmModal({ visible, onCancel, onConfirm }: { visible: boolean; onCancel: () => void; onConfirm: () => void }) {
  if (!visible) return null;
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalIconBox}>
            <Ionicons name="trash" size={32} color="#EF4444" />
          </View>
          <Text style={styles.modalTitle}>¿Eliminar imagen?</Text>
          <Text style={styles.modalDesc}>Esta acción no se puede deshacer. El banner se quitará de la tienda inmediatamente.</Text>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onCancel}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalDeleteBtn} onPress={onConfirm}>
              <Text style={styles.modalDeleteText}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const BANNER_TYPES = [
  { id: 'desktop', label: 'Slider Desktop', icon: 'desktop-outline', dims: '1400 x 400 px' },
  { id: 'mobile',  label: 'Slider Móvil',   icon: 'phone-portrait-outline', dims: '800 x 800 px' },
];

export default function PublicidadScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1024;
  
  const [currentView, setCurrentView] = useState<'banners' | 'portadas'>('banners');
  const [banners, setBanners] = useState<any[]>([]);
  const [portadas, setPortadas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success'
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
  };

  useEffect(() => {
    const qBanners = query(collection(db, 'publicidad'), orderBy('createdAt', 'desc'));
    const unsubBanners = onSnapshot(qBanners, (snapshot) => {
      setBanners(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    const qPortadas = query(collection(db, 'portadas'), orderBy('index', 'asc'));
    const unsubPortadas = onSnapshot(qPortadas, (snapshot) => {
      setPortadas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubBanners();
      unsubPortadas();
    };
  }, []);

  const pickAndUpload = async (type: string, portadaIndex?: number) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'desktop' ? [14, 4] : (type === 'portada' ? [1, 1] : [1, 1]),
        quality: 1,
      });

      if (result.canceled) return;

      setUploading(true);
      const uri = result.assets[0].uri;
      const collName = type === 'portada' ? 'portadas' : 'publicidad';
      
      // 1. Upload to Storage
      const filename = `${collName}/${Date.now()}_${type}${portadaIndex || ''}.jpg`;
      const storageRef = ref(storage, filename);
      
      const response = await fetch(uri);
      const blob = await response.blob();

      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      // 2. Save to Firestore
      if (type === 'portada' && portadaIndex !== undefined) {
        // Find existing to delete from storage if replacing
        const existing = portadas.find(p => p.index === portadaIndex);
        if (existing?.storagePath) {
          await deleteObject(ref(storage, existing.storagePath)).catch(() => {});
        }
        
        // Update or Add
        const docData = {
          imageUrl: downloadURL,
          storagePath: filename,
          index: portadaIndex,
          createdAt: serverTimestamp(),
        };

        if (existing) {
          await deleteDoc(doc(db, 'portadas', existing.id));
        }
        await addDoc(collection(db, 'portadas'), docData);
      } else {
        await addDoc(collection(db, 'publicidad'), {
          imageUrl: downloadURL,
          storagePath: filename,
          type,
          createdAt: serverTimestamp(),
        });
      }

      showToast('¡Imagen subida con éxito!', 'success');
    } catch (error) {
      console.error('Error uploading:', error);
      showToast('Error al subir la imagen', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (item: any) => {
    setItemToDelete(item);
    setConfirmVisible(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const item = itemToDelete;
    setConfirmVisible(false);
    setItemToDelete(null);

    try {
      if (item.storagePath) {
        await deleteObject(ref(storage, item.storagePath)).catch(() => {});
      }
      const coll = currentView === 'banners' ? 'publicidad' : 'portadas';
      await deleteDoc(doc(db, coll, item.id));
      showToast('Eliminado correctamente');
    } catch (error) {
      showToast('Error al eliminar', 'error');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Cargando banners...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Toast 
        visible={toast.visible} 
        message={toast.message} 
        type={toast.type} 
        onHide={() => setToast(prev => ({ ...prev, visible: false }))} 
      />
      <ConfirmModal 
        visible={confirmVisible}
        onCancel={() => setConfirmVisible(false)}
        onConfirm={confirmDelete}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {!isDesktop && (
              <TouchableOpacity 
                style={styles.backBtn} 
                onPress={() => router.back()}
              >
                <Ionicons name="chevron-back" size={24} color="#0F172A" />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.headerCenter}>
            <Text style={[styles.title, !isDesktop && styles.titleMobile]}>Gestión de Publicidad</Text>
            <Text style={styles.subtitle}>Administra los banners de la tienda</Text>
          </View>

          <View style={styles.headerRight}>
            {uploading && (
              <View style={styles.uploadingBadge}>
                <ActivityIndicator size="small" color="#10B981" />
                <Text style={styles.uploadingText}>Subiendo...</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.viewToggle}>
          <TouchableOpacity 
            style={[styles.toggleBtn, currentView === 'banners' && styles.toggleBtnActive]} 
            onPress={() => setCurrentView('banners')}
          >
            <Ionicons name="images-outline" size={18} color={currentView === 'banners' ? '#fff' : '#64748B'} />
            <Text style={[styles.toggleText, currentView === 'banners' && styles.toggleTextActive]}>Sliders</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleBtn, currentView === 'portadas' && styles.toggleBtnActive]} 
            onPress={() => setCurrentView('portadas')}
          >
            <Ionicons name="grid-outline" size={18} color={currentView === 'portadas' ? '#fff' : '#64748B'} />
            <Text style={[styles.toggleText, currentView === 'portadas' && styles.toggleTextActive]}>Portadas</Text>
          </TouchableOpacity>
        </View>

        {currentView === 'banners' ? (
          <View style={[styles.mainLayout, isDesktop && styles.mainLayoutDesktop]}>
            {BANNER_TYPES.map((section) => (
              <View key={section.id} style={[styles.section, isDesktop && styles.sectionDesktop]}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <View style={styles.iconBox}>
                      <Ionicons name={section.icon as any} size={18} color="#10B981" />
                    </View>
                    <View>
                      <Text style={styles.sectionLabel}>{section.label}</Text>
                      <Text style={styles.dimsLabel}>{section.dims}</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.addBtn} 
                    onPress={() => pickAndUpload(section.id)}
                    disabled={uploading}
                  >
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.addBtnText}>Agregar</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.bannerGrid}>
                  {banners.filter(b => b.type === section.id).length > 0 ? (
                    banners.filter(b => b.type === section.id).map((banner) => (
                      <View 
                        key={banner.id} 
                        style={[
                          styles.bannerCard, 
                          section.id === 'desktop' ? styles.cardWide : styles.cardSquare
                        ]}
                      >
                        <View style={styles.imgContainer}>
                          <Image source={{ uri: banner.imageUrl }} style={styles.bannerImg} resizeMode="cover" />
                          <View style={styles.cardOverlay}>
                            <TouchableOpacity 
                              style={styles.deleteBtn} 
                              onPress={() => handleDelete(banner)}
                            >
                              <Ionicons name="trash-outline" size={16} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={styles.emptyCard}>
                      <Ionicons name="image-outline" size={28} color="#CBD5E1" />
                      <Text style={styles.emptyCardText}>Sin banners</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.portadasContainer, { padding: isDesktop ? 32 : 16 }]}>
            <View style={[styles.portadasHeader, { marginBottom: isDesktop ? 40 : 20 }]}>
              <View style={styles.iconBox}>
                <Ionicons name="grid-outline" size={18} color="#10B981" />
              </View>
              <View>
                <Text style={styles.sectionLabel}>Gestión de Portadas Desktop</Text>
                <Text style={styles.dimsLabel}>Configura los 4 banners de la cuadrícula principal</Text>
              </View>
            </View>

            <View style={[styles.portadasGrid, { gap: isDesktop ? 16 : 12 }]}>
              {[1, 2, 3, 4].map((idx) => {
                const item = portadas.find(p => p.index === idx);
                return (
                  <View key={idx} style={[styles.portadaCard, { width: isDesktop ? '23.5%' : '48%' }]}>
                    <View style={styles.portadaImgBox}>
                      {item ? (
                        <>
                          <Image source={{ uri: item.imageUrl }} style={styles.bannerImg} resizeMode="cover" />
                          <TouchableOpacity style={styles.portadaDelete} onPress={() => handleDelete(item)}>
                            <Ionicons name="trash" size={14} color="#EF4444" />
                          </TouchableOpacity>
                        </>
                      ) : (
                        <Ionicons name="image-outline" size={40} color="#CBD5E1" />
                      )}
                    </View>
                    <View style={[styles.portadaInfo, { padding: isDesktop ? 16 : 10 }]}>
                      <View>
                        <Text style={[styles.portadaLabel, { fontSize: isDesktop ? 14 : 12 }]}>Posición {idx}</Text>
                        <Text style={styles.dimsLabel}>600 x 600 px</Text>
                      </View>
                      <TouchableOpacity 
                        style={[styles.portadaAddBtn, { paddingHorizontal: isDesktop ? 12 : 8 }]}
                        onPress={() => pickAndUpload('portada', idx)}
                        disabled={uploading}
                      >
                        <Text style={[styles.portadaAddText, { fontSize: isDesktop ? 12 : 10 }]}>{item ? 'Cambiar' : 'Agregar'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  container: { flex: 1 },
  content: { padding: 32, width: '100%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, width: '100%' },
  headerLeft: { flex: 1, alignItems: 'flex-start' },
  headerCenter: { flex: 2, alignItems: 'center' },
  headerRight: { flex: 1, alignItems: 'flex-end' },
  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: -1, textAlign: 'center' },
  titleMobile: { fontSize: 18, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 4, textAlign: 'center', fontWeight: '500' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' },
  loadingText: { marginTop: 12, color: '#94A3B8', fontWeight: '600' },
  uploadingBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  uploadingText: { color: '#10B981', fontWeight: '700', fontSize: 11 },
  
  mainLayout: { gap: 32 },
  mainLayoutDesktop: { flexDirection: 'row', alignItems: 'flex-start' },
  
  section: { flex: 1, backgroundColor: '#ffffff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#F1F5F9' },
  sectionDesktop: { minHeight: 600 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  dimsLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10B981', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  
  bannerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  bannerCard: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9' },
  cardWide: { width: '100%', aspectRatio: 14/4 },
  cardSquare: { width: '47%', aspectRatio: 1/1 },
  imgContainer: { width: '100%', height: '100%' },
  bannerImg: { width: '100%', height: '100%' },
  cardOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.02)', padding: 10, alignItems: 'flex-end' },
  deleteBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  
  emptyCardText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },

  viewToggle: { flexDirection: 'row', alignSelf: 'center', backgroundColor: '#F1F5F9', padding: 4, borderRadius: 16, marginBottom: 32, gap: 4 },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  toggleBtnActive: { backgroundColor: '#3B1E54', shadowColor: '#3B1E54', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  toggleText: { fontSize: 14, fontWeight: '800', color: '#64748B' },
  toggleTextActive: { color: '#fff' },

  portadasContainer: { flex: 1, backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: '#F1F5F9' },
  portadasHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  portadasGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  portadaCard: { backgroundColor: '#F8FAFC', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9' },
  portadaImgBox: { width: '100%', aspectRatio: 1, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  portadaInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' },
  portadaLabel: { fontWeight: '800', color: '#0F172A' },
  portadaAddBtn: { backgroundColor: '#10B981', paddingVertical: 6, borderRadius: 8 },
  portadaAddText: { color: '#fff', fontWeight: '800' },
  portadaDelete: { position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 8, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },

  /* Toast Styles */
  toast: {
    position: 'absolute',
    top: 40,
    left: '10%',
    right: '10%',
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    gap: 12,
  },
  toastSuccess: { backgroundColor: '#10B981' },
  toastError: { backgroundColor: '#EF4444' },
  toastText: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '700' },
  toastBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  toastBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  /* Modal Styles */
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', width: '100%', maxWidth: 400, borderRadius: 28, padding: 32, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.2, shadowRadius: 30, elevation: 20 },
  modalIconBox: { width: 70, height: 70, borderRadius: 24, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginBottom: 12, textAlign: 'center' },
  modalDesc: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 32, fontWeight: '500' },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center' },
  modalCancelText: { color: '#64748B', fontWeight: '800', fontSize: 14 },
  modalDeleteBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#EF4444', alignItems: 'center', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  modalDeleteText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
