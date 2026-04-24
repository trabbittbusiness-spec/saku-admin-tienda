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
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
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

function EditPortadaModal({ 
  visible, 
  onCancel, 
  onSave, 
  item, 
  setItem, 
  loading,
  onPickImage,
  availableCategories,
  availableBrands
}: { 
  visible: boolean; 
  onCancel: () => void; 
  onSave: () => void; 
  item: any;
  setItem: (val: any) => void;
  loading: boolean;
  onPickImage: () => void;
  availableCategories?: string[];
  availableBrands?: string[];
}) {
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 1024;

  if (!visible || !item) return null;

  const colors = [
    { name: 'Saku Indigo', hex: '#0A0A2E' },
    { name: 'Pure Black', hex: '#000000' },
    { name: 'Royal Blue', hex: '#1E3A8A' },
    { name: 'Slate', hex: '#334155' },
    { name: 'Emerald', hex: '#065F46' },
  ];

  return (
    <Modal transparent visible={visible} animationType="slide">
      <View style={{ flex: 1, backgroundColor: '#F1F5F9' }}>
        
        {/* BARRA SUPERIOR STUDIO ADAPTATIVA */}
        <View style={{ 
          height: isMobile ? 70 : 64, 
          backgroundColor: '#FFF', 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          paddingHorizontal: isMobile ? 16 : 24,
          borderBottomWidth: 1,
          borderBottomColor: '#E2E8F0',
          zIndex: 50
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: isMobile ? 8 : 12 }}>
            <Image 
              source={require('../../assets/images/logo_saku_cl.png')} 
              style={{ width: isMobile ? 30 : 34, height: isMobile ? 30 : 34, borderRadius: 8 }} 
              resizeMode="contain"
            />
            <View>
              <Text style={{ color: '#0F172A', fontSize: isMobile ? 13 : 15, fontWeight: '800' }}>Saku Studio</Text>
              {!isMobile && <Text style={{ color: '#6366F1', fontSize: 9, fontWeight: '900', letterSpacing: 2, marginTop: 2 }}>PUBLICIDAD</Text>}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: isMobile ? 8 : 12 }}>
            <TouchableOpacity 
              onPress={onCancel}
              style={{ paddingHorizontal: isMobile ? 12 : 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }}
            >
              <Text style={{ color: '#64748B', fontSize: 12, fontWeight: '700' }}>{isMobile ? 'Salir' : 'Descartar'}</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={onSave}
              disabled={loading}
              style={{ 
                paddingHorizontal: isMobile ? 14 : 22, 
                paddingVertical: 10, 
                borderRadius: 10, 
                backgroundColor: '#10B981', 
                flexDirection: 'row', 
                alignItems: 'center', 
                gap: 8,
                shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8
              }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>{isMobile ? 'Listo' : 'Guardar y Publicar'}</Text>
                  {!isMobile && <Ionicons name="rocket" size={16} color="#fff" />}
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, height: isMobile ? 'auto' : '100%' }} 
          scrollEnabled={isMobile}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flex: 1, flexDirection: isMobile ? 'column' : 'row' }}>
            
            {/* ÁREA DE TRABAJO (CANVAS) */}
            <View style={{ 
              flex: 1, 
              backgroundColor: '#F8FAFC', 
              alignItems: 'center', 
              justifyContent: isMobile ? 'flex-start' : 'center', 
              padding: isMobile ? 16 : 40,
              minHeight: isMobile ? 250 : 'auto',
              paddingTop: isMobile ? 32 : 40
            }}>
              
              {/* WORKBENCH CANVAS */}
              <View style={{ 
                width: '100%', 
                maxWidth: isMobile ? 400 : 950, 
                aspectRatio: 1200 / 525, 
                backgroundColor: item.backgroundColor,
                borderRadius: isMobile ? 12 : 20,
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 20 },
                shadowOpacity: 0.1,
                shadowRadius: 30,
                elevation: 10,
                borderWidth: 1,
                borderColor: 'rgba(0,0,0,0.05)'
              }}>
                {item.imageUrl && (
                  <Image source={{ uri: item.imageUrl }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                )}
                <LinearGradient
                  colors={[item.backgroundColor, 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.9, y: 0 }}
                  style={StyleSheet.absoluteFillObject}
                />
                
                <View style={{ flex: 1, padding: isMobile ? '5%' : '7%', justifyContent: 'center' }}>
                  <View style={{ 
                    backgroundColor: '#22C55E', 
                    alignSelf: 'flex-start', 
                    paddingHorizontal: isMobile ? 8 : 14, 
                    paddingVertical: isMobile ? 3 : 6, 
                    borderRadius: 6, 
                    marginBottom: isMobile ? 8 : 16 
                  }}>
                    <Text style={{ color: '#fff', fontSize: isMobile ? 8 : 11, fontWeight: '900', letterSpacing: 1.5 }}>{item.badge || 'NUEVO'}</Text>
                  </View>
                  <Text style={{ 
                    color: '#fff', 
                    fontSize: isMobile ? 18 : 44, 
                    fontWeight: '900', 
                    lineHeight: isMobile ? 20 : 46, 
                    letterSpacing: isMobile ? 0 : -1, 
                    maxWidth: '85%' 
                  }}>{item.title || 'Título del Banner'}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: isMobile ? 10 : 20, fontWeight: '500', marginTop: isMobile ? 4 : 12 }}>{item.subtitle || 'Subtítulo informativo'}</Text>
                  
                  <View style={{ 
                    marginTop: isMobile ? 12 : 35, 
                    backgroundColor: '#fff', 
                    paddingHorizontal: isMobile ? 12 : 26, 
                    paddingVertical: isMobile ? 6 : 14, 
                    borderRadius: 8, 
                    alignSelf: 'flex-start',
                    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5
                  }}>
                    <Text style={{ color: '#000', fontSize: isMobile ? 9 : 14, fontWeight: '800' }}>{item.buttonText || 'COMPRAR'}</Text>
                  </View>
                </View>
              </View>

              {/* GUÍAS DE ESTUDIO (Solo Desktop) */}
              {!isMobile && (
                <View style={{ marginTop: 40, flexDirection: 'row', gap: 32 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' }} />
                    <Text style={{ color: '#64748B', fontSize: 12, fontWeight: '700' }}>VISTA EN VIVO</Text>
                  </View>
                  <Text style={{ color: '#CBD5E1', fontSize: 12 }}>|</Text>
                  <Text style={{ color: '#94A3B8', fontSize: 12, fontWeight: '600' }}>MODO ESCRITORIO</Text>
                </View>
              )}
            </View>

            {/* INSPECTOR LATERAL / INFERIOR ADAPTATIVO */}
            <View style={{ 
              width: isMobile ? '100%' : 400, 
              backgroundColor: '#FFF', 
              borderLeftWidth: isMobile ? 0 : 1, 
              borderLeftColor: '#E2E8F0',
              borderTopWidth: isMobile ? 1 : 0,
              borderTopColor: '#E2E8F0',
              minHeight: isMobile ? 500 : 'auto'
            }}>

              <ScrollView 
                contentContainerStyle={{ padding: isMobile ? 20 : 28 }}
                scrollEnabled={!isMobile}
                showsVerticalScrollIndicator={!isMobile} // Solo visible en desktop
                persistentScrollbar={!isMobile} // Solo persistente en desktop
              >
                {/* SECCIÓN IMAGEN */}
                <View style={{ marginBottom: 30 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Ionicons name="image-outline" size={16} color="#6366F1" />
                    <Text style={{ color: '#475569', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>FOTOGRAFÍA</Text>
                  </View>
                  <TouchableOpacity 
                    onPress={onPickImage}
                    style={{ 
                      width: '100%', 
                      height: isMobile ? 120 : 140, 
                      borderRadius: 16, 
                      backgroundColor: '#F8FAFC', 
                      borderWidth: 2, 
                      borderColor: '#F1F5F9',
                      borderStyle: 'dashed',
                      alignItems: 'center', 
                      justifyContent: 'center',
                      gap: 12,
                      overflow: 'hidden'
                    }}
                  >
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={StyleSheet.absoluteFillObject} />
                    ) : null}
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 }}>
                      <Ionicons name="camera-outline" size={20} color="#6366F1" />
                      <Text style={{ color: '#6366F1', fontSize: 10, fontWeight: '800', marginTop: 4 }}>CAMBIAR IMAGEN</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* SECCIÓN COLORES */}
                <View style={{ marginBottom: 30 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Ionicons name="color-fill-outline" size={16} color="#6366F1" />
                    <Text style={{ color: '#475569', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>COLOR DE MARCA</Text>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    {colors.map((c) => (
                      <TouchableOpacity 
                        key={c.hex} 
                        onPress={() => setItem({ ...item, backgroundColor: c.hex })}
                        style={{ 
                          width: isMobile ? 44 : 48, height: isMobile ? 44 : 48, borderRadius: 14, backgroundColor: c.hex,
                          borderWidth: item.backgroundColor === c.hex ? 4 : 1,
                          borderColor: item.backgroundColor === c.hex ? '#6366F1' : '#E2E8F0',
                          alignItems: 'center', justifyContent: 'center'
                        }}
                      >
                        {item.backgroundColor === c.hex && <Ionicons name="checkmark" size={20} color="#fff" />}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* SECCIÓN TEXTOS */}
                <View style={{ gap: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Ionicons name="text-outline" size={16} color="#6366F1" />
                    <Text style={{ color: '#475569', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>TEXTOS</Text>
                  </View>
                  
                  <View>
                    <Text style={{ color: '#64748B', fontSize: 10, marginBottom: 8, fontWeight: '700' }}>Etiqueta (Badge)</Text>
                    <TextInput 
                      style={{ backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, color: '#1E293B', fontSize: 14, borderWidth: 1, borderColor: '#E2E8F0' }}
                      value={item.badge}
                      placeholder="Ej: NUEVO"
                      onChangeText={(t) => setItem({ ...item, badge: t })}
                    />
                  </View>

                  <View>
                    <Text style={{ color: '#64748B', fontSize: 10, marginBottom: 8, fontWeight: '700' }}>Título Principal</Text>
                    <TextInput 
                      style={{ backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, color: '#1E293B', fontSize: 14, borderWidth: 1, borderColor: '#E2E8F0' }}
                      value={item.title}
                      multiline
                      placeholder="Escribe el título..."
                      onChangeText={(t) => setItem({ ...item, title: t })}
                    />
                  </View>

                  <View>
                    <Text style={{ color: '#64748B', fontSize: 10, marginBottom: 8, fontWeight: '700' }}>Subtítulo</Text>
                    <TextInput 
                      style={{ backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, color: '#1E293B', fontSize: 14, borderWidth: 1, borderColor: '#E2E8F0' }}
                      value={item.subtitle}
                      placeholder="Texto secundario..."
                      onChangeText={(t) => setItem({ ...item, subtitle: t })}
                    />
                  </View>

                  <View>
                    <Text style={{ color: '#64748B', fontSize: 10, marginBottom: 8, fontWeight: '700' }}>Texto del Botón</Text>
                    <TextInput 
                      style={{ backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, color: '#1E293B', fontSize: 14, borderWidth: 1, borderColor: '#E2E8F0' }}
                      value={item.buttonText}
                      placeholder="COMPRAR"
                      onChangeText={(t) => setItem({ ...item, buttonText: t })}
                    />
                  </View>
                </View>

                {/* SECCIÓN ETIQUETAS */}
                <View style={{ gap: 20, marginTop: 24 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Ionicons name="pricetags-outline" size={16} color="#6366F1" />
                    <Text style={{ color: '#475569', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>ETIQUETAS Y FILTROS</Text>
                  </View>
                  
                  {/* Categorías */}
                  <View>
                    <Text style={{ color: '#64748B', fontSize: 10, marginBottom: 8, fontWeight: '700' }}>Categorías Asociadas</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {Array.from(new Set(availableCategories || [])).map((cat: string, index: number) => {
                        const isSelected = (item.categorias || []).includes(cat);
                        return (
                          <TouchableOpacity
                            key={`cat-${cat}-${index}`}
                            onPress={() => {
                              const cats = item.categorias || [];
                              if (isSelected) {
                                setItem({ ...item, categorias: cats.filter((c: string) => c !== cat) });
                              } else {
                                setItem({ ...item, categorias: [...cats, cat] });
                              }
                            }}
                            style={{
                              paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
                              backgroundColor: isSelected ? '#6366F1' : '#F8FAFC',
                              borderWidth: 1, borderColor: isSelected ? '#6366F1' : '#E2E8F0',
                            }}
                          >
                            <Text style={{ color: isSelected ? '#fff' : '#64748B', fontSize: 12, fontWeight: isSelected ? '800' : '600' }}>{cat}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Marcas */}
                  <View style={{ marginTop: 4 }}>
                    <Text style={{ color: '#64748B', fontSize: 10, marginBottom: 8, fontWeight: '700' }}>Marcas Asociadas</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {Array.from(new Set(availableBrands || [])).map((brand: string, index: number) => {
                        const isSelected = (item.marcas || []).includes(brand);
                        return (
                          <TouchableOpacity
                            key={`brand-${brand}-${index}`}
                            onPress={() => {
                              const brands = item.marcas || [];
                              if (isSelected) {
                                setItem({ ...item, marcas: brands.filter((b: string) => b !== brand) });
                              } else {
                                setItem({ ...item, marcas: [...brands, brand] });
                              }
                            }}
                            style={{
                              paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
                              backgroundColor: isSelected ? '#10B981' : '#F8FAFC',
                              borderWidth: 1, borderColor: isSelected ? '#10B981' : '#E2E8F0',
                            }}
                          >
                            <Text style={{ color: isSelected ? '#fff' : '#64748B', fontSize: 12, fontWeight: isSelected ? '800' : '600' }}>{brand}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>



                <View style={{ height: isMobile ? 100 : 60 }} />
              </ScrollView>
            </View>
          </View>
        </ScrollView>
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
  const router = useRouter();
  
  const [currentView, setCurrentView] = useState<'banners' | 'portadas'>('banners');
  const [banners, setBanners] = useState<any[]>([]);
  const [portadas, setPortadas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<{
    id?: string;
    index: number;
    badge: string;
    title: string;
    subtitle: string;
    buttonText: string;
    backgroundColor: string;
    imageUrl?: string;
    storagePath?: string;
    categorias?: string[];
    marcas?: string[];
  } | null>(null);

  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);

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

    const unsubCats = onSnapshot(query(collection(db, 'Categorias_name')), (snapshot) => {
      const cats = snapshot.docs.map(doc => doc.data().nombre || doc.data().name).filter(Boolean);
      setAvailableCategories(cats);
    });

    const unsubBrands = onSnapshot(query(collection(db, 'Marca_name')), (snapshot) => {
      const brands = snapshot.docs.map(doc => doc.data().nombre || doc.data().name).filter(Boolean);
      setAvailableBrands(brands);
    });

    return () => {
      unsubBanners();
      unsubPortadas();
      unsubCats();
      unsubBrands();
    };
  }, []);

  const openEditModal = (itemOrIdx: any) => {
    let existing;
    let idx;

    if (typeof itemOrIdx === 'number') {
      idx = itemOrIdx;
      existing = portadas.find(p => Number(p.index) === idx);
    } else {
      existing = itemOrIdx;
      idx = Number(existing.index);
    }

    setEditingItem({
      id: existing?.id,
      index: idx,
      badge: existing?.badge || '',
      title: existing?.title || '',
      subtitle: existing?.subtitle || '',
      buttonText: existing?.buttonText || 'COMPRAR',
      backgroundColor: existing?.backgroundColor || '#0A0A2E',
      imageUrl: existing?.imageUrl,
      storagePath: existing?.storagePath,
      categorias: existing?.categorias || [],
      marcas: existing?.marcas || []
    });
    setEditVisible(true);
  };

  const savePortadaInfo = async () => {
    if (!editingItem) return;
    setUploading(true);
    try {
      const docData = {
        ...editingItem,
        index: Number(editingItem.index),
        updatedAt: serverTimestamp(),
      };

      if (editingItem.id) {
        await deleteDoc(doc(db, 'portadas', editingItem.id));
      }
      
      const { id, ...dataToSave } = docData;
      await addDoc(collection(db, 'portadas'), dataToSave);
      
      setEditVisible(false);
      showToast('¡Banner configurado correctamente!');
    } catch (error) {
      showToast('Error al guardar', 'error');
    } finally {
      setUploading(false);
    }
  };

  const pickAndUpload = async (type: string, portadaIndex?: number) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'portada' ? [80, 35] : [14, 4],
        quality: 1,
      });

      if (result.canceled) return;

      setUploading(true);
      const uri = result.assets[0].uri;
      const collName = type === 'portada' ? 'portadas' : 'publicidad';
      
      const filename = `${collName}/${Date.now()}_${type}${portadaIndex || ''}.jpg`;
      const storageRef = ref(storage, filename);
      
      const response = await fetch(uri);
      const blob = await response.blob();

      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      if (type === 'portada' && editVisible && editingItem) {
        // Just update the editing state, don't save to Firestore yet
        setEditingItem({
          ...editingItem,
          imageUrl: downloadURL,
          storagePath: filename
        });
        showToast('Imagen cargada en vista previa', 'success');
      } else if (type === 'portada' && portadaIndex !== undefined) {
        // This is from the grid "Subir" button
        const existing = portadas.find(p => Number(p.index) === portadaIndex);
        if (existing?.storagePath) {
          await deleteObject(ref(storage, existing.storagePath)).catch(() => {});
        }
        
        const docData = {
          imageUrl: downloadURL,
          storagePath: filename,
          index: portadaIndex,
          badge: existing?.badge || 'NUEVO',
          title: existing?.title || 'Título del Banner',
          subtitle: existing?.subtitle || 'Subtítulo informativo aquí',
          buttonText: existing?.buttonText || 'COMPRAR',
          backgroundColor: existing?.backgroundColor || '#0A0A2E',
          categorias: existing?.categorias || [],
          marcas: existing?.marcas || [],
          createdAt: serverTimestamp(),
        };

        if (existing) {
          await deleteDoc(doc(db, 'portadas', existing.id));
        }
        await addDoc(collection(db, 'portadas'), docData);
        
        // After upload, open editor
        openEditModal(portadaIndex);
        showToast('Imagen subida con éxito', 'success');
      } else {
        await addDoc(collection(db, 'publicidad'), {
          imageUrl: downloadURL,
          storagePath: filename,
          type,
          createdAt: serverTimestamp(),
        });
        showToast('Imagen subida con éxito', 'success');
      }
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
      <EditPortadaModal 
        visible={editVisible}
        item={editingItem}
        setItem={setEditingItem}
        onCancel={() => setEditVisible(false)}
        onSave={savePortadaInfo}
        loading={uploading}
        onPickImage={() => pickAndUpload('portada', editingItem?.index)}
        availableCategories={availableCategories}
        availableBrands={availableBrands}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={[styles.header, isDesktop && styles.headerDesktop]}>
          {isDesktop ? (
            <View style={styles.titleSection}>
              <Text style={styles.title}>Gestión de Publicidad</Text>
              <Text style={styles.subtitle}>Administra los banners de la tienda</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingHorizontal: 50, width: '100%' }}>
              <TouchableOpacity onPress={() => router.push('/cuenta')} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', position: 'absolute', left: 0, zIndex: 10 }}>
                <Ionicons name="chevron-back" size={22} color="#0F172A" style={{ marginLeft: -2 }} />
              </TouchableOpacity>
              <Text style={[styles.title, { fontSize: 20, textAlign: 'center', letterSpacing: -0.5 }]} numberOfLines={1}>Gestión de Publicidad</Text>
            </View>
          )}

          {isDesktop && (
            <View style={styles.viewToggleHeader}>
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
          )}

          <View style={styles.headerRight}>
            {uploading && (
              <View style={styles.uploadingBadge}>
                <ActivityIndicator size="small" color="#10B981" />
                <Text style={styles.uploadingText}>Subiendo...</Text>
              </View>
            )}
          </View>
        </View>

        {!isDesktop && (
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
        )}

        {currentView === 'banners' ? (
          <View style={[styles.mainLayout, isDesktop && styles.mainLayoutDesktop]}>
            {BANNER_TYPES.map((section) => (
              <View key={section.id} style={[styles.section, isDesktop && styles.sectionDesktop]}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <View style={styles.iconBox}>
                      <Ionicons name={section.icon as any} size={18} color="#6366F1" />
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
                      <Ionicons name="image-outline" size={40} color="#CBD5E1" />
                      <Text style={styles.emptyCardText}>No hay sliders configurados</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.portadasContainer, { padding: isDesktop ? 32 : 16 }]}>
            <View style={[styles.portadasHeader, { marginBottom: isDesktop ? 40 : 24 }]}>
              <View style={[styles.iconBox, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="grid" size={20} color="#6366F1" />
              </View>
              <View>
                <Text style={styles.sectionLabel}>Gestión de Portadas Desktop</Text>
                <Text style={styles.dimsLabel}>Configura los 4 banners de la cuadrícula principal de la tienda</Text>
              </View>
            </View>

            <View style={[styles.portadasGrid, { gap: isDesktop ? 24 : 16 }]}>
              {[1, 2, 3, 4].map((idx) => {
                const item = portadas.find(p => Number(p.index) === idx);
                
                return (
                  <View key={idx} style={[styles.portadaCard, { width: isDesktop ? '48.5%' : '100%' }]}>
                    <View style={styles.portadaImgBox}>
                      {item ? (
                        <View style={styles.fullSize}>
                          <Image 
                            source={{ uri: item.imageUrl }} 
                            style={styles.bannerImg} 
                            resizeMode="cover" 
                          />
                          <View style={styles.portadaBadge}>
                            <Text style={styles.portadaBadgeText}>{item.badge || 'ACTIVA'}</Text>
                          </View>
                          <View style={styles.portadaActions}>
                            <TouchableOpacity 
                              style={[styles.portadaActionBtn, { backgroundColor: '#6366F1' }]} 
                              onPress={() => openEditModal(item)}
                            >
                              <Ionicons name="create-outline" size={14} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[styles.portadaActionBtn, { backgroundColor: '#fff' }]} 
                              onPress={() => handleDelete(item)}
                            >
                              <Ionicons name="trash-outline" size={14} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.emptyPortadaPlaceholder}>
                          <Ionicons name="image-outline" size={48} color="#CBD5E1" />
                          <Text style={styles.emptyPortadaText}>Vacío</Text>
                        </View>
                      )}
                      
                      {uploading && (
                        <View style={styles.uploadingOverlay}>
                          <ActivityIndicator color="#fff" />
                        </View>
                      )}
                    </View>
                    
                    <View style={[styles.portadaInfo, { padding: isDesktop ? 16 : 12 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.portadaLabel}>Posición {idx}</Text>
                        <Text style={styles.dimsLabel}>800 x 350 px</Text>
                      </View>
                      <TouchableOpacity 
                        style={[styles.portadaAddBtn, item ? styles.portadaChangeBtn : styles.portadaAddBtnStyle]}
                        onPress={() => pickAndUpload('portada', idx)}
                        disabled={uploading}
                      >
                        <Text style={styles.portadaAddText}>{item ? 'Nueva Foto' : 'Subir'}</Text>
                        <Ionicons name={item ? "camera-outline" : "cloud-upload-outline"} size={14} color="#fff" />
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
  container: { flex: 1, backgroundColor: '#ffffff' },
  content: { padding: 32, width: '100%' },
  header: {
    marginBottom: 24,
    gap: 16,
  },
  headerDesktop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  titleSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  viewToggleHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignSelf: 'flex-end',
  },
  headerLeft: {
    minWidth: 40,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerRight: { flex: 1, alignItems: 'flex-end' },
  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -1.2,
    textAlign: 'left',
  },
  titleMobile: { fontSize: 18, letterSpacing: -0.5 },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'left',
  },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' },
  loadingText: { marginTop: 12, color: '#94A3B8', fontWeight: '600' },
  uploadingBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ECFDF5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  uploadingText: { color: '#10B981', fontWeight: '700', fontSize: 11 },
  
  mainLayout: { gap: 32 },
  mainLayoutDesktop: { flexDirection: 'row', alignItems: 'flex-start' },
  
  section: { backgroundColor: '#ffffff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#F1F5F9' },
  sectionDesktop: { flex: 1, minHeight: 600 },
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

  portadasContainer: { flex: 1, backgroundColor: '#fff', borderRadius: 28, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.02, shadowRadius: 24 },
  portadasHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  portadasGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  portadaCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.04,
    shadowRadius: 40,
    elevation: 3,
  },
  portadaImgBox: { width: '100%', aspectRatio: 1200 / 525, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  portadaInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  portadaLabel: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  portadaAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  portadaAddBtnStyle: { backgroundColor: '#10B981' },
  portadaChangeBtn: { backgroundColor: '#6366F1' },
  portadaAddText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  
  fullSize: { width: '100%', height: '100%' },
  portadaBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#22C55E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 10,
  },
  portadaBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  portadaActions: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
  },
  portadaActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center' },
  emptyPortadaPlaceholder: { alignItems: 'center', gap: 8 },
  emptyPortadaText: { color: '#CBD5E1', fontWeight: '700', fontSize: 12 },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  inputBare: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1E293B',
  },
  portadaDelete: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

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
