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
import { Video, ResizeMode } from 'expo-av';

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
  const [duracion, setDuracion] = useState('');
  const [foto, setFoto] = useState<string | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const [disponibilidad, setDisponibilidad] = useState(true);
  const [saving, setSaving] = useState(false);
  const [adminMuted, setAdminMuted] = useState(false);
  
  // Mascotas Config State
  const [requiresPetDetails, setRequiresPetDetails] = useState(false);
  const [weightRanges, setWeightRanges] = useState<any[]>([]);
  
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
    setDuracion('');
    setFoto(null);
    setVideo(null);
    setCategoriaIds([]);
    setDisponibilidad(true);
    setRequiresPetDetails(false);
    setWeightRanges([]);
    setModalVisible(true);
  };

  const openEdit = (s: any) => {
    setEditingId(s.id);
    setNombre(s.nombre || '');
    setDescripcion(s.descripcion || '');
    setPrecio(s.precio ? s.precio.toString() : '');
    setDuracion(s.duracion || '');
    setFoto(s.foto1 || null);
    setVideo(s.video1 || null);
    
    // Handle migration from single string to array
    if (Array.isArray(s.categoriaIds)) {
      setCategoriaIds(s.categoriaIds);
    } else if (s.categoriaId) {
      setCategoriaIds([s.categoriaId]);
    } else {
      setCategoriaIds([]);
    }
    
    setDisponibilidad(s.disponibilidad !== false);
    setRequiresPetDetails(s.requiresPetDetails || false);
    setWeightRanges(s.weightRanges ? s.weightRanges.map((w: any) => ({ min: (w.min||'').toString(), max: (w.max||'').toString(), price: (w.price||'').toString() })) : []);
    setModalVisible(true);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6,
    });

    if (!result.canceled) {
      setFoto(result.assets[0].uri);
    }
  };

  const pickVideo = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.6,
      videoMaxDuration: 60,
    });

    if (!result.canceled) {
      setVideo(result.assets[0].uri);
    }
  };

  const uploadFile = async (uri: string, isVideo: boolean = false) => {
    try {
      if (uri.startsWith('http') && !uri.includes('localhost') && !uri.includes('blob:')) {
        return uri;
      }
      // Robust blob conversion for mobile and web
      const blob: Blob = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function () {
          resolve(xhr.response);
        };
        xhr.onerror = function (e) {
          reject(new TypeError("Network request failed"));
        };
        xhr.responseType = "blob";
        xhr.open("GET", uri, true);
        xhr.send(null);
      });
      const filename = `servicios/${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;
      const storageRef = ref(storage, filename);
      
      await uploadBytes(storageRef, blob, {
        contentType: isVideo ? 'video/mp4' : 'image/jpeg'
      });
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
      let finalVideo = '';
      if (foto) finalFoto = await uploadFile(foto, false);
      if (video) finalVideo = await uploadFile(video, true);

      const servicioData = {
        nombre,
        descripcion,
        precio: parseFloat(precio) || 0,
        duracion,
        foto1: finalFoto,
        video1: finalVideo,
        categoriaIds,
        disponibilidad,
        requiresPetDetails,
        weightRanges: requiresPetDetails ? weightRanges.map(wr => ({
          min: parseFloat(wr.min) || 0,
          max: parseFloat(wr.max) || 0,
          price: parseFloat(wr.price) || 0
        })) : [],
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, 'Servicios', editingId), servicioData);
      } else {
        await addDoc(collection(db, 'Servicios'), {
          ...servicioData,
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
        <ActivityIndicator size="large" color="#63348C" />
        <Text style={{ marginTop: 12, color: '#94A3B8', fontWeight: '600' }}>Cargando servicios...</Text>
      </View>
    );
  }

  const renderContent = () => (
    <ScrollView style={styles.scroll} contentContainerStyle={isDesktop ? styles.contentDesktop : styles.contentMobile}>
      <View style={[styles.headerRow, isDesktop && { flexDirection: 'row', alignItems: 'center' }]}>
        <View style={isDesktop ? { flex: 1 } : {}}>
          <Text style={styles.pageTitle}>Servicios</Text>
          <Text style={styles.pageSubtitle}>{servicios.length} servicios registrados</Text>
        </View>
        
        <View style={[styles.headerActions, isDesktop ? { width: 'auto', flexShrink: 0 } : { flexDirection: 'column', gap: 12 }]}>
          <View style={[styles.headerSearch, isDesktop ? { width: 200 } : { width: '100%' }, isSearchFocused && styles.headerSearchFocused]}>
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
              style={[styles.addBtn, { backgroundColor: '#F1F5F9', flexShrink: 0 }]} 
              activeOpacity={0.8} 
              onPress={() => setCatModalVisible(true)}
            >
              <Ionicons name="grid-outline" size={18} color="#475569" />
              <Text style={[styles.addBtnText, { color: '#475569' }]}>Categorías</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.addBtn, { flexShrink: 0 }]} 
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
          const priceDisplay = (() => {
            if (s.requiresPetDetails && Array.isArray(s.weightRanges) && s.weightRanges.length > 0) {
              const prices = s.weightRanges.map((r: any) => Number(r.price)).filter((p: number) => !isNaN(p) && p > 0);
              if (prices.length > 0) {
                const min = Math.min(...prices);
                const max = Math.max(...prices);
                return min === max ? `$${min.toLocaleString("de-DE")}` : `$${min.toLocaleString("de-DE")} — $${max.toLocaleString("de-DE")}`;
              }
            }
            return `$${(s.precio || 0).toLocaleString("de-DE")}`;
          })();

          const hasPetMode = s.requiresPetDetails && Array.isArray(s.weightRanges) && s.weightRanges.length > 0;

          return (
            <View key={s.id} style={[styles.card, isDesktop && { width: '31%' }]}>
              {/* IMAGE SECTION */}
              <View style={styles.imgBox}>
                {s.foto1 ? (
                  <Image source={{ uri: s.foto1 }} style={styles.productImg} resizeMode="cover" />
                ) : (
                  <View style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' }}>
                    <Ionicons name="briefcase-outline" size={44} color="#CBD5E1" />
                  </View>
                )}
                {/* Dark gradient overlay */}
                <View style={styles.imgGradient} />

                {/* Status pill */}
                <View style={[styles.statusPill, { backgroundColor: isActive ? '#10B981' : '#EF4444' }]}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff', marginRight: 5 }} />
                  <Text style={styles.statusPillText}>{isActive ? 'Activo' : 'Inactivo'}</Text>
                </View>

                {/* Price badge bottom-right */}
                <View style={[styles.pricePill, hasPetMode && { backgroundColor: '#63348C' }]}>
                  <Text style={styles.pricePillText} numberOfLines={1}>{priceDisplay}</Text>
                </View>
              </View>

              {/* BODY */}
              <View style={styles.cardBody}>
                {/* Name */}
                <Text style={styles.cardName} numberOfLines={1}>{s.nombre || 'Sin Nombre'}</Text>

                {/* Categories row */}
                <View style={styles.cardCatContainer}>
                  {Array.isArray(s.categoriaIds) && s.categoriaIds.length > 0 ? (
                    s.categoriaIds.slice(0, 2).map((cid: string) => {
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
                    <View style={[styles.cardCatBadge, { backgroundColor: '#F8FAFC' }]}>
                      <Text style={[styles.cardCatText, { color: '#94A3B8' }]}>Sin categoría</Text>
                    </View>
                  )}
                  {hasPetMode && (
                    <View style={[styles.cardCatBadge, { backgroundColor: '#EDE9FE' }]}>
                      <Ionicons name="paw-outline" size={10} color="#63348C" style={{ marginRight: 3 }} />
                      <Text style={[styles.cardCatText, { color: '#63348C' }]}>Multi-mascota</Text>
                    </View>
                  )}
                </View>

                {/* Meta: tiempo y descripción */}
                <View style={styles.cardMetaRow}>
                  <Ionicons name="time-outline" size={13} color="#94A3B8" />
                  <Text style={styles.cardMetaText}>{s.duracion || 'Sin tiempo definido'}</Text>
                </View>

                <Text style={styles.cardDesc} numberOfLines={2}>
                  {s.descripcion || 'Sin descripción disponible.'}
                </Text>

                {/* FOOTER */}
                <View style={styles.cardFooter}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => toggleStatus(s.id, isActive)}
                    style={[styles.statusToggle, isActive ? styles.statusToggleOn : styles.statusToggleOff]}
                  >
                    <View style={[styles.statusToggleThumb, isActive ? styles.statusToggleThumbOn : styles.statusToggleThumbOff]} />
                    <Text style={[styles.statusToggleLabel, { color: isActive ? '#10B981' : '#94A3B8' }]}>
                      {isActive ? 'Activo' : 'Oculto'}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(s)}>
                      <Ionicons name="create-outline" size={17} color="#63348C" />
                      <Text style={styles.editBtnText}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(s.id)}>
                      <Ionicons name="trash-outline" size={17} color="#EF4444" />
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
                
                {/* FOTO DE PORTADA */}
                <Text style={styles.inputLabel}>Foto de Portada <Text style={{color: '#EF4444'}}>*</Text></Text>
                <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.8}>
                  {foto ? (
                    <View style={styles.imagePreviewContainer}>
                      <Image source={{ uri: foto }} style={styles.imagePreview} />
                      <TouchableOpacity 
                        style={[styles.removeBadge, { left: 16 }]} 
                        onPress={() => setFoto(null)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#fff" />
                      </TouchableOpacity>
                      <View style={styles.imageEditBadge}>
                        <Ionicons name="camera" size={14} color="#fff" />
                        <Text style={{color: '#fff', fontSize: 10, fontWeight: '700', marginLeft: 4}}>Cambiar Foto</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <View style={styles.iconCircle}>
                        <Ionicons name="image-outline" size={32} color="#63348C" />
                      </View>
                      <Text style={styles.uploadText}>Subir portada</Text>
                      <Text style={styles.uploadSubText}>JPG o PNG optimizado</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* VIDEO PROMOCIONAL */}
                <Text style={[styles.inputLabel, { marginTop: 20 }]}>Video Promocional (Opcional)</Text>
                <TouchableOpacity style={[styles.imagePicker, { height: 160 }]} onPress={pickVideo} activeOpacity={0.8}>
                  {video ? (
                    <View style={styles.imagePreviewContainer}>
                      <Video
                        source={{ uri: video }}
                        style={styles.imagePreview}
                        resizeMode={ResizeMode.COVER}
                        shouldPlay
                        isLooping
                        isMuted={adminMuted}
                        useNativeControls
                      />
                      <TouchableOpacity 
                        style={[styles.removeBadge, { left: 16 }]} 
                        onPress={() => setVideo(null)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => setAdminMuted(!adminMuted)}
                        style={styles.muteBadge}
                      >
                        <Ionicons 
                          name={adminMuted ? "volume-mute" : "volume-medium"} 
                          size={14} 
                          color="#fff" 
                        />
                      </TouchableOpacity>
                      <View style={styles.imageEditBadge}>
                        <Ionicons name="videocam" size={14} color="#fff" />
                        <Text style={{color: '#fff', fontSize: 10, fontWeight: '700', marginLeft: 4}}>Cambiar Video</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <View style={[styles.iconCircle, { width: 48, height: 48 }]}>
                        <Ionicons name="videocam-outline" size={24} color="#63348C" />
                      </View>
                      <Text style={[styles.uploadText, { fontSize: 14 }]}>Agregar Video</Text>
                      <Text style={[styles.uploadSubText, { fontSize: 11 }]}>MP4 máx. 60 seg • 1280x720px</Text>
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
                    trackColor={{ false: '#E2E8F0', true: '#63348C' }}
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

                  <View style={{ flexDirection: 'row', gap: 16 }}>
                    {/* PRECIO */}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Precio <Text style={{color: '#EF4444'}}>*</Text></Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="cash-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                        <TextInput
                          style={styles.inputWithIcon}
                          placeholder="0.00"
                          value={precio}
                          onChangeText={setPrecio}
                          keyboardType="numeric"
                          placeholderTextColor="#CBD5E1"
                        />
                      </View>
                    </View>

                    {/* DURACIÓN */}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Duración <Text style={{color: '#EF4444'}}>*</Text></Text>
                      <View style={styles.inputWrapper}>
                        <Ionicons name="time-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
                        <TextInput
                          style={styles.inputWithIcon}
                          placeholder="Ej: 45 min"
                          value={duracion}
                          onChangeText={setDuracion}
                          placeholderTextColor="#CBD5E1"
                        />
                      </View>
                    </View>
                  </View>

                  {/* CONFIGURACIÓN DE MASCOTAS */}
                  <View style={{ padding: 16, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>Opciones para Mascotas</Text>
                        <Text style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Permitir múltiples mascotas y pesos</Text>
                      </View>
                      <Switch
                        value={requiresPetDetails}
                        onValueChange={setRequiresPetDetails}
                        trackColor={{ false: '#CBD5E1', true: '#10B981' }}
                        thumbColor="#fff"
                      />
                    </View>

                    {requiresPetDetails && (
                      <View style={{ marginTop: 16 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#0F172A', marginBottom: 8 }}>Rangos de Peso y Precios</Text>
                        <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 12 }}>
                          Si no defines rangos, se cobrará el precio base a cada mascota.
                        </Text>
                        
                        {weightRanges.map((wr, idx) => (
                          <View key={idx} style={{ marginBottom: 14, backgroundColor: '#F1F5F9', borderRadius: 10, padding: 12 }}>
                            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'center' }}>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B', marginBottom: 4, textTransform: 'uppercase' }}>Peso mín (kg)</Text>
                                <TextInput
                                  style={[styles.input, { height: 40, paddingVertical: 0, fontSize: 13, backgroundColor: '#fff' }]}
                                  placeholder="Ej: 0"
                                  keyboardType="numeric"
                                  value={wr.min}
                                  onChangeText={(val) => {
                                    const newArr = [...weightRanges];
                                    newArr[idx].min = val;
                                    setWeightRanges(newArr);
                                  }}
                                />
                              </View>
                              <Text style={{ color: '#94A3B8', marginTop: 18 }}>—</Text>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B', marginBottom: 4, textTransform: 'uppercase' }}>Peso máx (kg)</Text>
                                <TextInput
                                  style={[styles.input, { height: 40, paddingVertical: 0, fontSize: 13, backgroundColor: '#fff' }]}
                                  placeholder="Ej: 10"
                                  keyboardType="numeric"
                                  value={wr.max}
                                  onChangeText={(val) => {
                                    const newArr = [...weightRanges];
                                    newArr[idx].max = val;
                                    setWeightRanges(newArr);
                                  }}
                                />
                              </View>
                              <View style={{ flex: 1.2 }}>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748B', marginBottom: 4, textTransform: 'uppercase' }}>Precio ($CLP)</Text>
                                <TextInput
                                  style={[styles.input, { height: 40, paddingVertical: 0, fontSize: 13, backgroundColor: '#fff' }]}
                                  placeholder="Ej: 25000"
                                  keyboardType="numeric"
                                  value={wr.price}
                                  onChangeText={(val) => {
                                    const newArr = [...weightRanges];
                                    newArr[idx].price = val;
                                    setWeightRanges(newArr);
                                  }}
                                />
                              </View>
                              <TouchableOpacity
                                style={{ marginTop: 18, padding: 6 }}
                                onPress={() => {
                                  const newArr = [...weightRanges];
                                  newArr.splice(idx, 1);
                                  setWeightRanges(newArr);
                                }}
                              >
                                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                        
                        <TouchableOpacity
                          style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, marginTop: 4 }}
                          onPress={() => setWeightRanges([...weightRanges, { min: '', max: '', price: '' }])}
                        >
                          <Ionicons name="add-circle-outline" size={16} color="#63348C" />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#63348C' }}>Agregar Rango</Text>
                        </TouchableOpacity>
                      </View>
                    )}
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
                style={[styles.saveBtn, saving && { opacity: 0.7 }]} 
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
                <Ionicons name="add-circle-outline" size={20} color="#63348C" style={{ marginLeft: 12 }} />
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
                          <Ionicons name={getCategoryIcon(cat.nombre)} size={14} color="#63348C" />
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

  headerRow: { flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 12 },
  pageTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A', letterSpacing: -0.8 },
  pageSubtitle: { fontSize: 12, color: '#64748B', fontWeight: '500', marginTop: 2 },
  
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%' },
  headerSearch: { flex: Platform.OS !== 'web' ? 1 : undefined, width: Platform.OS === 'web' ? 200 : 'auto', flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#E2E8F0', gap: 6 },
  headerSearchFocused: { borderColor: '#63348C', backgroundColor: '#fff' },
  searchInput: { flex: 1, fontSize: 13, color: '#0F172A', outlineStyle: 'none' } as any,
  
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10B981', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, shadowColor: '#10B981', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8, flexShrink: 0, overflow: 'visible' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  actionButtonsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  card: {
    width: '100%', backgroundColor: '#fff', borderRadius: 20,
    borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden',
    shadowColor: '#63348C', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06, shadowRadius: 24, marginBottom: 4,
  },
  imgBox: { height: 160, backgroundColor: '#F8FAFC', position: 'relative' },
  productImg: { width: '100%', height: '100%' },
  imgGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 70,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  statusPill: {
    position: 'absolute', top: 12, left: 12,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  statusPillText: { fontSize: 10, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 0.4 },
  pricePill: {
    position: 'absolute', bottom: 12, right: 12,
    backgroundColor: '#1E293B',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    maxWidth: 200,
  },
  pricePillText: { fontSize: 13, fontWeight: '900', color: '#fff' },

  cardBody: { padding: 18 },
  cardName: { fontSize: 17, fontWeight: '900', color: '#0F172A', marginBottom: 8, letterSpacing: -0.3 },
  cardCatContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  cardCatBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  cardCatText: { fontSize: 10, fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.3 },
  cardCatTextPlaceholder: { fontSize: 12, color: '#CBD5E1', fontStyle: 'italic' },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  cardMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMetaText: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  cardDesc: { fontSize: 13, color: '#64748B', marginBottom: 16, lineHeight: 19 },
  cardPrice: { fontSize: 17, fontWeight: '900', color: '#0F172A', marginBottom: 16 },

  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 14,
  },
  statusToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#F8FAFC',
  },
  statusToggleOn: { backgroundColor: '#F0FDF4' },
  statusToggleOff: { backgroundColor: '#F8FAFC' },
  statusToggleThumb: { width: 10, height: 10, borderRadius: 5 },
  statusToggleThumbOn: { backgroundColor: '#10B981' },
  statusToggleThumbOff: { backgroundColor: '#CBD5E1' },
  statusToggleLabel: { fontSize: 12, fontWeight: '700' },
  cardActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F5F3FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
  },
  editBtnText: { fontSize: 12, fontWeight: '700', color: '#63348C' },
  delBtn: {
    width: 34, height: 34, borderRadius: 12,
    backgroundColor: '#FFF5F5', alignItems: 'center', justifyContent: 'center',
  },

  emptyState: { width: '100%', alignItems: 'center', paddingVertical: 100 },
  emptyText: { fontSize: 16, color: '#94A3B8', fontWeight: '600', marginTop: 16 },

  // Modal Styles - Wide Premium Design
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 32, width: '94%', maxHeight: '90%', shadowColor: '#000', shadowOffset: { width: 0, height: 25 }, shadowOpacity: 0.2, shadowRadius: 50, elevation: 25, overflow: 'hidden' },
  modalContentDesktop: { width: 1050, maxWidth: '97%' },
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
  muteBadge: { position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(15, 23, 42, 0.8)', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  removeBadge: { position: 'absolute', top: 16, backgroundColor: 'rgba(239, 68, 68, 0.9)', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  
  formSectionTitle: { fontSize: 12, fontWeight: '900', color: '#63348C', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 20 },
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
  catTagSelected: { backgroundColor: 'transparent', borderColor: '#63348C', borderWidth: 2 },
  catTagText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  catTagSelectedText: { color: '#63348C' },

  // Cat Modal Redesign
  // High Density Manager Redesign
  stickyAddBar: { paddingHorizontal: 32, paddingVertical: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  addCatInputGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', paddingRight: 8 },
  addCatInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 14, fontSize: 15, color: '#0F172A', outlineStyle: 'none' } as any,
  miniAddBtn: { backgroundColor: '#63348C', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
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

