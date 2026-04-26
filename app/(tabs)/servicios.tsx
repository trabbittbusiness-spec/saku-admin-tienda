import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Switch,
  useWindowDimensions,
  Platform,
  Image,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import * as ImagePicker from 'expo-image-picker';


export default function ServiciosScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 860;
  
  const [servicios, setServicios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precio, setPrecio] = useState('');
  const [foto, setFoto] = useState<string | null>(null);
  const [disponibilidad, setDisponibilidad] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Categories State
  const [categorias, setCategorias] = useState<any[]>([]);
  const [categoriaIds, setCategoriaIds] = useState<string[]>([]);
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [newCatNombre, setNewCatNombre] = useState('');
  const [catSaving, setCatSaving] = useState(false);
  const [catSearch, setCatSearch] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'Servicios'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setServicios(list);
      setLoading(false);
    });

    // Listen for categories
    const qCat = query(collection(db, 'CategoriasServicios'));
    const unsubCat = onSnapshot(qCat, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCategorias(list);
    });

    return () => {
      unsubscribe();
      unsubCat();
    };
  }, []);

  const filtered = servicios.filter(s => 
    (s.nombre || '').toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditingId(null);
    setNombre('');
    setDescripcion('');
    setPrecio('');
    setFoto(null);
    setCategoriaIds([]);
    setDisponibilidad(true);
    setModalVisible(true);
  };

  const openEdit = (s: any) => {
    setEditingId(s.id);
    setNombre(s.nombre || '');
    setDescripcion(s.descripcion || '');
    setPrecio(s.precio ? s.precio.toString() : '');
    setFoto(s.foto1 || null);
    
    // Handle migration from single string to array
    if (Array.isArray(s.categoriaIds)) {
      setCategoriaIds(s.categoriaIds);
    } else if (s.categoriaId) {
      setCategoriaIds([s.categoriaId]);
    } else {
      setCategoriaIds([]);
    }
    
    setDisponibilidad(s.disponibilidad !== false);
    setModalVisible(true);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setFoto(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    try {
      // Si la imagen ya es una URL de Firebase Storage, no volver a subirla
      if (uri.startsWith('http') && !uri.includes('localhost') && !uri.includes('blob:')) {
        return uri;
      }

      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `servicios/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (e) {
      console.error('Upload error:', e);
      return uri;
    }
  };


  const handleSave = async () => {
    if (!nombre || !precio) {
      if (Platform.OS === 'web') {
        alert('Nombre y Precio son obligatorios');
      } else {
        Alert.alert('Error', 'Nombre y Precio son obligatorios');
      }
      return;
    }

    setSaving(true);
    try {
      let finalFoto = '';
      if (foto) {
        finalFoto = await uploadImage(foto);
      }

      const serviceData = {
        nombre,
        descripcion,
        precio: parseFloat(precio) || 0,
        foto1: finalFoto,
        categoriaIds,
        disponibilidad,
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, 'Servicios', editingId), serviceData);
      } else {
        await addDoc(collection(db, 'Servicios'), {
          ...serviceData,
          createdAt: serverTimestamp(),
        });
      }
      setModalVisible(false);
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'Servicios', id), { disponibilidad: !currentStatus });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    const performDelete = async () => {
      try {
        await deleteDoc(doc(db, 'Servicios', id));
      } catch (e) {
        console.error(e);
      }
    };

    if (Platform.OS === 'web') {
      if (confirm('¿Seguro que deseas eliminar este servicio?')) {
        performDelete();
      }
    } else {
      Alert.alert(
        'Eliminar Servicio',
        '¿Seguro que deseas eliminar este servicio?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: performDelete }
        ]
      );
    }
  };

  const handleAddCategory = async () => {
    if (!newCatNombre.trim()) return;
    setCatSaving(true);
    try {
      await addDoc(collection(db, 'CategoriasServicios'), {
        nombre: newCatNombre.trim(),
        createdAt: serverTimestamp(),
      });
      setNewCatNombre('');
    } catch (e) {
      console.error(e);
    } finally {
      setCatSaving(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'CategoriasServicios', id));
    } catch (e) {
      console.error(e);
    }
  };

  const getCategoryIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('salud') || n.includes('med')) return 'medical-outline';
    if (n.includes('estetica') || n.includes('corte') || n.includes('belleza')) return 'cut-outline';
    if (n.includes('baño') || n.includes('limpieza') || n.includes('aseo')) return 'water-outline';
    if (n.includes('alimento') || n.includes('comida')) return 'nutrition-outline';
    if (n.includes('vacuna')) return 'bandage-outline';
    if (n.includes('urgencia') || n.includes('emergencia')) return 'alert-circle-outline';
    if (n.includes('consulta') || n.includes('chequeo')) return 'clipboard-outline';
    if (n.includes('juego') || n.includes('guarderia') || n.includes('diversion')) return 'paw-outline';
    if (n.includes('transporte') || n.includes('taxi')) return 'car-outline';
    if (n.includes('hotel') || n.includes('hospedaje')) return 'bed-outline';
    if (n.includes('educacion') || n.includes('entrenamiento')) return 'school-outline';
    return 'tag-outline';
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={{ marginTop: 12, color: '#94A3B8', fontWeight: '600' }}>Cargando servicios...</Text>
      </View>
    );
  }

  const renderContent = () => (
    <ScrollView style={styles.scroll} contentContainerStyle={isDesktop ? styles.contentDesktop : styles.contentMobile}>
      <View style={[styles.headerRow, isDesktop && { flexDirection: 'row', alignItems: 'center' }]}>
        <View>
          <Text style={styles.pageTitle}>Servicios</Text>
          <Text style={styles.pageSubtitle}>{servicios.length} servicios registrados</Text>
        </View>
        
        <View style={[styles.headerActions, isDesktop ? { width: 'auto' } : { flexDirection: 'column', gap: 12 }]}>
          <View style={[styles.headerSearch, isDesktop ? { width: 280 } : { width: '100%' }, isSearchFocused && styles.headerSearchFocused]}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar servicios..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
          </View>

          <View style={[styles.actionButtonsRow, isDesktop && { width: 'auto' }]}>
            <TouchableOpacity 
              style={[styles.addBtn, { backgroundColor: '#F1F5F9', flex: isDesktop ? 0 : 1 }]} 
              activeOpacity={0.8} 
              onPress={() => setCatModalVisible(true)}
            >
              <Ionicons name="grid-outline" size={18} color="#475569" />
              <Text style={[styles.addBtnText, { color: '#475569' }]}>Categorías</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.addBtn, { backgroundColor: '#10B981', flex: isDesktop ? 0 : 1, shadowColor: '#10B981' }]} 
              activeOpacity={0.85} 
              onPress={openAdd}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addBtnText}>Agregar Servicio</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.grid}>
        {filtered.map(s => {
          const isActive = s.disponibilidad !== false;
          return (
            <View key={s.id} style={[styles.card, isDesktop && { width: '31%' }]}>
              <View style={styles.imgBox}>
                {s.foto1 ? (
                  <Image source={{ uri: s.foto1 }} style={styles.productImg} resizeMode="cover" />
                ) : (
                  <Ionicons name="briefcase-outline" size={40} color="#CBD5E1" />
                )}
                <View style={[styles.statusBadge, { backgroundColor: isActive ? '#DCFCE7' : '#FEE2E2' }]}>
                  <Text style={[styles.statusBadgeText, { color: isActive ? '#10B981' : '#EF4444' }]}>
                    {isActive ? 'Activo' : 'Inactivo'}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName} numberOfLines={1}>{s.nombre || 'Sin Nombre'}</Text>
                    <View style={styles.cardCatContainer}>
                      {Array.isArray(s.categoriaIds) && s.categoriaIds.length > 0 ? (
                        s.categoriaIds.map((cid: string) => {
                          const cat = categorias.find(c => c.id === cid);
                          return cat ? (
                            <View key={cid} style={styles.cardCatBadge}>
                              <Text style={styles.cardCatText}>{cat.nombre}</Text>
                            </View>
                          ) : null;
                        })
                      ) : s.categoriaId ? (
                        <View style={styles.cardCatBadge}>
                          <Text style={styles.cardCatText}>
                            {categorias.find(c => c.id === s.categoriaId)?.nombre || 'Categoría'}
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.cardCatTextPlaceholder}>Sin categoría</Text>
                      )}
                    </View>
                  </View>
                </View>
                <Text style={styles.cardDesc} numberOfLines={2}>{s.descripcion || 'Sin descripción'}</Text>
                <Text style={styles.cardPrice}>${(s.precio || 0).toLocaleString()}</Text>

                <View style={styles.cardFooter}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Switch
                      value={isActive}
                      onValueChange={() => toggleStatus(s.id, isActive)}
                      trackColor={{ false: '#E2E8F0', true: '#10B981' }}
                      thumbColor="#fff"
                      style={Platform.OS === 'web' ? { transform: [{ scale: 0.8 }] } as any : {}}
                    />
                    <Text style={{ fontSize: 12, color: '#64748B', fontWeight: '600' }}>
                      {isActive ? 'Visible' : 'Oculto'}
                    </Text>
                  </View>
                  
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(s)}>
                      <Ionicons name="pencil" size={16} color="#6366F1" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FFF5F5' }]} onPress={() => handleDelete(s.id)}>
                      <Ionicons name="trash" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          );
        })}

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No hay servicios registrados</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.bg} edges={['top']}>
      {renderContent()}

      <Modal visible={modalVisible} transparent animationType={isDesktop ? 'fade' : 'slide'}>
        <View style={[styles.modalOverlay, !isDesktop && { padding: 0, backgroundColor: '#fff' }]}>
          <View style={[
            styles.modalContent, 
            isDesktop ? styles.modalContentDesktop : styles.modalFullScreenMobile
          ]}>
            <View style={[styles.modalHeader, !isDesktop && { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }]}>
              <View>
                <Text style={styles.modalTitle}>{editingId ? 'Editar Servicio' : 'Nuevo Servicio'}</Text>
                <Text style={styles.modalSubtitle}>Completa los datos para publicarlo</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={[styles.modalScroll, !isDesktop && { flex: 1 }]}
              contentContainerStyle={[
                styles.modalScrollContent,
                isDesktop && { flexDirection: 'row' },
                !isDesktop && { padding: 20 }
              ]}
              showsVerticalScrollIndicator={true}
            >
              <View style={[styles.modalLeft, isDesktop ? { borderRightWidth: 1, width: '40%' } : { width: '100%' }]}>
                <Text style={styles.formSectionTitle}>Multimedia</Text>
                <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.8}>
                  {foto ? (
                    <View style={styles.imagePreviewContainer}>
                      <Image source={{ uri: foto }} style={styles.imagePreview} />
                      <View style={styles.imageEditBadge}>
                        <Ionicons name="camera" size={14} color="#fff" />
                        <Text style={{color: '#fff', fontSize: 10, fontWeight: '700', marginLeft: 4}}>Cambiar</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <View style={styles.iconCircle}>
                        <Ionicons name="cloud-upload-outline" size={32} color="#6366F1" />
                      </View>
                      <Text style={styles.uploadText}>Subir foto del servicio</Text>
                      <Text style={styles.uploadSubText}>Formatos sugeridos: JPG o PNG</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.settingsRow}>
                  <View style={styles.settingsInfo}>
                    <Text style={styles.settingsTitle}>Servicio Activo</Text>
                    <Text style={styles.settingsDesc}>Visibilidad en la app</Text>
                  </View>
                  <Switch
                    value={disponibilidad}
                    onValueChange={setDisponibilidad}
                    trackColor={{ false: '#E2E8F0', true: '#10B981' }}
                    thumbColor="#fff"
                  />
                </View>
              </View>

              <View style={[styles.modalRight, isDesktop ? { width: '60%' } : { width: '100%' }]}>
                <Text style={styles.formSectionTitle}>Detalles del Servicio</Text>
                <View style={styles.formGrid}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Nombre <Text style={{color: '#EF4444'}}>*</Text></Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="briefcase-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                      <TextInput 
                        style={styles.inputWithIcon} 
                        value={nombre} 
                        onChangeText={setNombre} 
                        placeholder="Ej: Consulta Veterinaria" 
                        placeholderTextColor="#CBD5E1"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Precio <Text style={{color: '#EF4444'}}>*</Text></Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons name="cash-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                      <TextInput 
                        style={styles.inputWithIcon} 
                        value={precio} 
                        onChangeText={setPrecio} 
                        placeholder="0.00" 
                        keyboardType="numeric"
                        placeholderTextColor="#CBD5E1"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Categorías</Text>
                    <View style={styles.catWrapGrid}>
                      <TouchableOpacity 
                        style={[styles.catTag, categoriaIds.length === 0 && styles.catTagSelected]}
                        onPress={() => setCategoriaIds([])}
                      >
                        <Text style={[styles.catTagText, categoriaIds.length === 0 && styles.catTagSelectedText]}>Ninguna</Text>
                      </TouchableOpacity>
                      {categorias.map(cat => {
                        const isSelected = categoriaIds.includes(cat.id);
                        return (
                          <TouchableOpacity 
                            key={cat.id}
                            style={[styles.catTag, isSelected && styles.catTagSelected]}
                            onPress={() => {
                              if (isSelected) {
                                setCategoriaIds(categoriaIds.filter(id => id !== cat.id));
                              } else {
                                setCategoriaIds([...categoriaIds, cat.id]);
                              }
                            }}
                          >
                            <Text style={[styles.catTagText, isSelected && styles.catTagSelectedText]}>{cat.nombre}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Descripción</Text>
                    <TextInput 
                      style={[styles.input, styles.textArea]} 
                      value={descripcion} 
                      onChangeText={setDescripcion} 
                      placeholder="Explica en qué consiste el servicio..." 
                      placeholderTextColor="#CBD5E1"
                      multiline 
                    />
                  </View>
                </View>
              </View>
            </ScrollView>


            <View style={[styles.modalFooter, !isDesktop && { padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20 }]}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveBtn, { backgroundColor: '#10B981', shadowColor: '#10B981' }, saving && { opacity: 0.7 }]} 
                onPress={handleSave} 
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Guardando...' : 'Publicar Servicio'}</Text>
                {!saving && <Ionicons name="checkmark-circle" size={18} color="#fff" />}
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {/* Categories Manager Modal - High Density Proposal */}
      <Modal visible={catModalVisible} transparent animationType={isDesktop ? 'fade' : 'slide'}>
        <View style={[styles.modalOverlay, !isDesktop && { padding: 0, backgroundColor: '#fff' }]}>
          <View style={[
            styles.modalContent, 
            isDesktop ? { width: 1000, maxWidth: '95%' } : styles.modalFullScreenMobile
          ]}>
            <View style={[styles.modalHeader, !isDesktop && { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }]}>
              <View>
                <Text style={styles.modalTitle}>Gestión de Categorías</Text>
                <Text style={styles.modalSubtitle}>Administra y clasifica tus servicios masivamente</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setCatModalVisible(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Sticky Add Bar */}
            <View style={[styles.stickyAddBar, !isDesktop && { paddingHorizontal: 20 }]}>
              <View style={styles.addCatInputGroup}>
                <Ionicons name="add-circle-outline" size={20} color="#6366F1" style={{ marginLeft: 12 }} />
                <TextInput 
                  style={styles.addCatInput}
                  placeholder={isDesktop ? "Escribe el nombre de la nueva categoría..." : "Nueva categoría..."}
                  value={newCatNombre}
                  onChangeText={setNewCatNombre}
                  placeholderTextColor="#94A3B8"
                  onSubmitEditing={handleAddCategory}
                />
                <TouchableOpacity 
                  style={[styles.miniAddBtn, !newCatNombre.trim() && { opacity: 0.5 }]} 
                  onPress={handleAddCategory}
                  disabled={catSaving || !newCatNombre.trim()}
                >
                  <Text style={styles.miniAddBtnText}>{catSaving ? '...' : 'Agregar'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.catManagerBody, !isDesktop && { padding: 20 }]}>
              <View style={[styles.catManagerHeader, !isDesktop && { flexDirection: 'column', alignItems: 'flex-start', gap: 12 }]}>
                <View style={[styles.catSearchWrapper, !isDesktop && { width: '100%' }]}>
                  <Ionicons name="search-outline" size={18} color="#94A3B8" />
                  <TextInput 
                    style={styles.catSearchInput}
                    placeholder="Filtrar categorías..."
                    value={catSearch}
                    onChangeText={setCatSearch}
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={styles.catTotalBadge}>
                  <Text style={styles.catTotalText}>{categorias.length} categorías</Text>
                </View>
              </View>

              <ScrollView 
                style={styles.catGridScroll} 
                showsVerticalScrollIndicator={true}
              >
                <View style={[styles.catMasonryGrid, isDesktop && styles.catMasonryGridDesktop]}>
                  {categorias.filter(c => c.nombre.toLowerCase().includes(catSearch.toLowerCase())).map(cat => (
                    <View key={cat.id} style={styles.highDensityCard}>
                      <View style={styles.hdCardInfo}>
                        <View style={styles.hdIcon}>
                          <Ionicons name={getCategoryIcon(cat.nombre)} size={14} color="#6366F1" />
                        </View>
                        <Text style={styles.hdName} numberOfLines={1}>{cat.nombre}</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.hdDelete} 
                        onPress={() => handleDeleteCategory(cat.id)}
                      >
                        <Ionicons name="close-circle" size={18} color="#CBD5E1" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                {categorias.length === 0 && (
                  <View style={styles.emptyHD}>
                    <Ionicons name="grid-outline" size={48} color="#F1F5F9" />
                    <Text style={styles.emptyHDText}>Comienza agregando una categoría arriba</Text>
                  </View>
                )}
              </ScrollView>
            </View>

            <View style={[styles.modalFooter, !isDesktop && { padding: 20 }]}>
              <TouchableOpacity 
                style={[styles.saveBtn, { flex: 1 }]} 
                onPress={() => setCatModalVisible(false)}
              >
                <Text style={styles.saveBtnText}>Guardar y Salir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { flex: 1 },
  contentDesktop: { paddingHorizontal: 40, paddingTop: 32, paddingBottom: 60 },
  contentMobile: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 100 },

  headerRow: { flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 16 },
  pageTitle: { fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: -1 },
  pageSubtitle: { fontSize: 14, color: '#64748B', fontWeight: '500', marginTop: 4 },
  
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%' },
  headerSearch: { flex: Platform.OS !== 'web' ? 1 : undefined, width: Platform.OS === 'web' ? 280 : 'auto', flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 },
  headerSearchFocused: { borderColor: '#6366F1', backgroundColor: '#fff' },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A', outlineStyle: 'none' } as any,
  
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#10B981', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14, shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, minWidth: Platform.OS === 'web' ? 200 : 0, flexShrink: 0 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  actionButtonsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  card: { width: '100%', backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.04, shadowRadius: 20, marginBottom: 4 },
  imgBox: { height: 180, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  productImg: { width: '100%', height: '100%' },
  statusBadge: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  
  cardBody: { padding: 20 },
  cardName: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 6 },
  cardDesc: { fontSize: 14, color: '#64748B', marginBottom: 14, lineHeight: 20 },
  cardPrice: { fontSize: 20, fontWeight: '900', color: '#10B981', marginBottom: 20 },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16 },
  actionBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F5F7FF', alignItems: 'center', justifyContent: 'center' },

  emptyState: { width: '100%', alignItems: 'center', paddingVertical: 100 },
  emptyText: { fontSize: 16, color: '#94A3B8', fontWeight: '600', marginTop: 16 },

  // Modal Styles - Wide Premium Design
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 32, width: '94%', maxHeight: '90%', shadowColor: '#000', shadowOffset: { width: 0, height: 25 }, shadowOpacity: 0.2, shadowRadius: 50, elevation: 25, overflow: 'hidden' },
  modalContentDesktop: { width: 850 },
  modalFullScreenMobile: { width: '100%', height: '100%', maxHeight: '100%', borderRadius: 0 },
  
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 32, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#fff' },
  modalTitle: { fontSize: 24, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  modalSubtitle: { fontSize: 14, color: '#64748B', fontWeight: '500', marginTop: 4 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  
  modalScroll: { flex: 1 },
  modalScrollContent: { paddingBottom: 20 },
  modalLeft: { padding: Platform.OS === 'web' ? 32 : 24, borderRightColor: '#F1F5F9' },
  modalRight: { padding: Platform.OS === 'web' ? 32 : 24 },


  
  imagePicker: { height: 280, backgroundColor: '#F8FAFC', borderRadius: 24, borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed', overflow: 'hidden' },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  uploadText: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  uploadSubText: { fontSize: 13, color: '#94A3B8', marginTop: 6 },
  imagePreviewContainer: { flex: 1, position: 'relative' },
  imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageEditBadge: { position: 'absolute', bottom: 16, right: 16, backgroundColor: 'rgba(15, 23, 42, 0.8)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  
  formSectionTitle: { fontSize: 12, fontWeight: '900', color: '#6366F1', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 20 },
  formGrid: { gap: 20, marginBottom: 24 },
  inputGroup: { width: '100%' },
  inputLabel: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 10, marginLeft: 2 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  inputIcon: { paddingLeft: 16 },
  inputWithIcon: { flex: 1, paddingHorizontal: 14, paddingVertical: 16, fontSize: 15, color: '#0F172A', outlineStyle: 'none', fontWeight: '500' } as any,
  input: { backgroundColor: '#F8FAFC', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16, fontSize: 15, color: '#0F172A', borderWidth: 1, borderColor: '#E2E8F0', outlineStyle: 'none', fontWeight: '500' } as any,
  textArea: { height: 120, textAlignVertical: 'top' },
  
  settingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F0FDF4', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#DCFCE7', marginTop: 8 },
  settingsInfo: { flex: 1, paddingRight: 20 },
  settingsTitle: { fontSize: 15, fontWeight: '700', color: '#166534', marginBottom: 4 },
  settingsDesc: { fontSize: 13, color: '#15803d', lineHeight: 18 },
  
  modalFooter: { flexDirection: 'row', padding: 32, borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: '#fff', gap: 16 },
  cancelBtn: { flex: 1, paddingVertical: 18, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0' },
  cancelBtnText: { color: '#475569', fontSize: 16, fontWeight: '700' },
  saveBtn: { flex: 2, flexDirection: 'row', paddingVertical: 18, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B981', gap: 10, shadowColor: '#10B981', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  cardCatContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  cardCatBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  cardCatText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  cardCatTextPlaceholder: { fontSize: 11, color: '#94A3B8', fontStyle: 'italic', marginBottom: 8 },

  catWrapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  catTag: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  catTagSelected: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  catTagText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  catTagSelectedText: { color: '#fff' },

  // Cat Modal Redesign
  // High Density Manager Redesign
  stickyAddBar: { paddingHorizontal: 32, paddingVertical: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  addCatInputGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', paddingRight: 8 },
  addCatInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 14, fontSize: 15, color: '#0F172A', outlineStyle: 'none' } as any,
  miniAddBtn: { backgroundColor: '#6366F1', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  miniAddBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  catManagerBody: { padding: 32, flex: 1 },
  catManagerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  catSearchWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9', width: 300 },
  catSearchInput: { flex: 1, fontSize: 14, color: '#0F172A', outlineStyle: 'none' } as any,
  catTotalBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  catTotalText: { fontSize: 12, fontWeight: '700', color: '#64748B' },

  catGridScroll: { flex: 1, maxHeight: Platform.OS === 'web' ? 450 : undefined },
  catMasonryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  catMasonryGridDesktop: { gap: 12, justifyContent: 'flex-start' },
  
  highDensityCard: { width: Platform.OS === 'web' ? '31.5%' : '48%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4 },
  hdCardInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  hdIcon: { width: 24, height: 24, borderRadius: 6, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  hdName: { fontSize: 14, fontWeight: '700', color: '#334155' },
  hdDelete: { padding: 4 },
  
  emptyHD: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 16 },
  emptyHDText: { color: '#94A3B8', fontSize: 15, fontWeight: '500' },
});

