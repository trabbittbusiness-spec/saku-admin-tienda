import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
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
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { auth, storage } from '../../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Classification constants are now fetched dynamically from Firestore

interface InputProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  numeric?: boolean;
}

function CustomInput({ label, placeholder, value, onChangeText, multiline, numeric }: InputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[
          styles.input, 
          multiline && styles.inputMultiline,
          focused && styles.inputFocused
        ]}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType={numeric ? 'numeric' : 'default'}
      />
    </View>
  );
}

function DropdownRow({ icon, label, placeholder, value, options, onSelect, disabled, multiple }: {
  icon: any; label: string; placeholder: string; value: string | string[]; options: string[]; onSelect: (v: any) => void; disabled?: boolean; multiple?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isSelected = (opt: string) => Array.isArray(value) ? value.includes(opt) : value === opt;

  const handlePress = (opt: string) => {
    if (multiple) {
      const current = Array.isArray(value) ? value : (value ? [value] : []);
      if (current.includes(opt)) {
        onSelect(current.filter(i => i !== opt));
      } else {
        onSelect([...current, opt]);
      }
    } else {
      onSelect(opt);
      setOpen(false);
    }
  };

  const displayValue = () => {
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : placeholder;
    }
    return value || placeholder;
  };

  return (
    <View style={[styles.dropdownWrap, disabled && { opacity: 0.6 }]}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity 
        style={[styles.dropdown, open && styles.dropdownOpen, disabled && { backgroundColor: '#F1F5F9' }]} 
        onPress={() => !disabled && setOpen(!open)} 
        activeOpacity={disabled ? 1 : 0.8}
      >
        <Ionicons name={icon} size={16} color={value && (Array.isArray(value) ? value.length > 0 : !!value) ? "#10B981" : "#94A3B8"} />
        <Text style={[styles.dropdownText, (Array.isArray(value) ? value.length > 0 : !!value) && styles.dropdownTextSelected]} numberOfLines={1}>
          {displayValue()}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color="#94A3B8" />
      </TouchableOpacity>
      {open && !disabled && (
        <View style={styles.dropdownOptions}>
          {options.length > 0 ? (
            options.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={styles.dropdownOption}
                onPress={() => handlePress(opt)}
              >
                <Text style={[styles.dropdownOptionText, isSelected(opt) && styles.dropdownOptionActive]}>
                  {opt}
                </Text>
                {isSelected(opt) && <Ionicons name="checkmark" size={12} color="#10B981" />}
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.dropdownOption}>
              <Text style={[styles.dropdownOptionText, { color: '#94A3B8', fontStyle: 'italic' }]}>
                {label === 'Marca (Opcional)' ? 'No hay Marcas Disponibles' : 'No hay opciones disponibles'}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

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
      }, 3000);
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
      <TouchableOpacity onPress={hide} style={{ marginLeft: 12 }}>
        <Ionicons name="close" size={16} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function NuevoProductoScreen() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1024;

  const pageTitle = 'Nuevo Producto';

  const [loading, setLoading] = useState(false);
  const [brandsList, setBrandsList] = useState<any[]>([]);
  const [animalsList, setAnimalsList] = useState<string[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [medida, setMedida] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState<string | string[]>('');
  const [marca, setMarca] = useState<string | string[]>('');
  const [animalSelected, setAnimalSelected] = useState<string[]>([]);
  const [estadoPromocion, setEstadoPromocion] = useState(false);
  const [disponibilidad, setDisponibilidad] = useState(true);
  const [Receta, setReceta] = useState(false);

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success'
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [brandsSnap, animalsSnap, catsSnap] = await Promise.all([
          getDocs(collection(db, 'Marca_name')),
          getDocs(collection(db, 'animal')),
          getDocs(collection(db, 'Categorias_name'))
        ]);

        const brands = brandsSnap.docs
          .map(doc => doc.data())
          .filter(d => d.disponibilidad !== false && !!d.nombre);
        setBrandsList(brands);

        const animals = animalsSnap.docs
          .map(doc => doc.data().nombre)
          .filter(name => !!name);
        setAnimalsList([...new Set(animals)] as string[]);

        const cats = catsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCategoriesList(cats);
      } catch (error) {
        console.error("Error fetching classification data:", error);
      }
    };
    fetchData();
  }, []);

  const handleAnimalChange = (newAnimals: string[]) => {
    setAnimalSelected(newAnimals);
    setCategoria([]);
    setMarca([]);
  };

  const displayCategories = categoriesList
    .filter(c => {
      if (c.disponibilidad === false) return false;
      if (animalSelected.length === 0) return true;
      const animals = c.animales || (c.animal ? [c.animal] : []);
      return animals.some((a: string) => animalSelected.includes(a)) || animals.includes('Ambos') || animals.includes('Todos');
    })
    .map(c => c.nombre || c.name);

  const displayBrands = Array.from(new Set(
    brandsList
      .filter(b => {
        // 1. Filter by Animal
        const matchAnimal = animalSelected.length === 0 || 
          animalSelected.includes(b.Tipo_animal) || 
          b.Tipo_animal === 'Ambos' || 
          b.Tipo_animal === 'Todos' ||
          !b.Tipo_animal;
        
        if (!matchAnimal) return false;

        // 2. Filter by Category
        const selectedCats = Array.isArray(categoria) ? categoria : (categoria ? [categoria] : []);
        
        // If brand has no category, it's a general brand: show it
        if (!b.categoria) return true;
        
        // If brand has a category, show it only if no categories are selected OR it matches one of the selected ones
        if (selectedCats.length === 0) return true;
        return selectedCats.includes(b.categoria);
      })
      .map(b => b.nombre)
  )) as string[];
  const [colores, setColores] = useState<string[]>([]);
  const [newColor, setNewColor] = useState('');
  const [variants, setVariants] = useState<{ label: string; price: number }[]>([]);
  const [newVariantLabel, setNewVariantLabel] = useState('');
  const [newVariantPrice, setNewVariantPrice] = useState('');
  const [variantUnit, setVariantUnit] = useState<'gr' | 'kg'>('kg');
  
  const [foto1, setFoto1] = useState<string | null>(null);
  const [foto2, setFoto2] = useState<string | null>(null);
  const [foto3, setFoto3] = useState<string | null>(null);
  const [foto1Base64, setFoto1Base64] = useState<string | null>(null);
  const [foto2Base64, setFoto2Base64] = useState<string | null>(null);
  const [foto3Base64, setFoto3Base64] = useState<string | null>(null);

  const reset = () => {
    setNombre(''); setPrecio(''); setMedida(''); setDescripcion('');
    setCategoria(''); setAnimalSelected([]); setMarca('');
    setEstadoPromocion(false); setDisponibilidad(true); setReceta(false); setColores([]); setVariants([]);
    setFoto1(null); setFoto2(null); setFoto3(null);
    setFoto1Base64(null); setFoto2Base64(null); setFoto3Base64(null);
  };

  const pickImage = async (setter: (v: string | null) => void, base64Setter: (v: string | null) => void) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
      base64: true,
    });

    if (!result.canceled) {
      setter(result.assets[0].uri);
      if (result.assets[0].base64) {
        base64Setter(result.assets[0].base64);
      }
    }
  };

  const addVariant = () => {
    if (!newVariantLabel || !newVariantPrice) return;
    let label = newVariantLabel.trim();
    if (/^\d+(\.\d+)?$/.test(label)) {
      label += ` ${variantUnit}`;
    }
    setVariants([...variants, { label, price: parseFloat(newVariantPrice) }]);
    setNewVariantLabel('');
    setNewVariantPrice('');
  };
  const removeVariant = (i: number) => setVariants(variants.filter((_, idx) => idx !== i));


  const uploadImage = async (uri: string | null, base64String?: string | null) => {
    if (!uri) return '';
    if (uri.startsWith('http')) return uri; // Already a URL

    try {
      const userId = auth.currentUser?.uid || 'anonymous';
      const timestamp = Date.now() + Math.floor(Math.random() * 1000).toString();
      const filename = `${timestamp}.jpg`;
      const storageRef = ref(storage, `users/${userId}/uploads/${filename}`);

      if (base64String) {
        // Use uploadString to bypass XHR issues for local URIs
        await uploadString(storageRef, base64String, 'base64', { contentType: 'image/jpeg' });
      } else {
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
        
        await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
      }
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error("Error uploading image:", error);
      return '';
    }
  };

  const handleSave = async () => {
    if (!nombre || !precio) {
      alert('Por favor completa los campos obligatorios (Nombre y Precio)');
      return;
    }

    try {
      setLoading(true);
      
      // Upload images first
      const [url1, url2, url3] = await Promise.all([
        uploadImage(foto1, foto1Base64),
        uploadImage(foto2, foto2Base64),
        uploadImage(foto3, foto3Base64),
      ]);

      const docData = {
        nombre,
        precio: parseFloat(precio) || 0,
        medida,
        descripcion,
        categoria,
        marca: marca,
        animal: animalSelected,
        estadoPromocion,
        disponibilidad,
        Receta,
        variants,
        Tipo: 'General',
        foto1: url1,
        foto2: url2,
        foto3: url3,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'Products'), docData);
      showToast('Producto guardado con éxito');
      setTimeout(() => router.back(), 1500);
    } catch (error) {
      console.error('Error al guardar:', error);
      showToast('Hubo un error al guardar el producto', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Toast 
        visible={toast.visible} 
        message={toast.message} 
        type={toast.type} 
        onHide={() => setToast(prev => ({ ...prev, visible: false }))} 
      />
      <View style={[styles.header, isDesktop && { height: 70, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#fff' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1, marginRight: 16 }}>
          <TouchableOpacity style={styles.headerBackBtn} onPress={() => router.push('/productos')} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerSubText}>NUEVO PRODUCTO</Text>
            <Text style={styles.headerTitleText}>Crear Nuevo Producto</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={[styles.headerSaveBtn, loading && { opacity: 0.7 }]} onPress={handleSave} disabled={loading}>
            <Text style={styles.headerSaveText}>{loading ? 'Guardando...' : 'Crear Producto'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={[styles.content, isDesktop && { flex: 1, paddingHorizontal: 24, paddingVertical: 16 }]}
        showsVerticalScrollIndicator={!isDesktop}
        scrollEnabled={!isDesktop}
      >
        <View style={[styles.mainLayout, isDesktop && styles.mainLayoutDesktop]}>
          
          {/* COL 1: Información & Estado */}
          <View style={[styles.col, { flex: isDesktop ? 0.33 : 1 }]}>
            <View style={styles.card}>
              <Text style={styles.colTitle}>Información Básica</Text>
              <CustomInput label="Nombre del producto" placeholder="Nombre..." value={nombre} onChangeText={setNombre} />
              <CustomInput label="Descripción" placeholder="Detalles..." value={descripcion} onChangeText={setDescripcion} multiline />
            </View>

            <View style={styles.card}>
              <Text style={styles.colTitle}>Visibilidad</Text>
              <View style={styles.inspectorCard}>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleText}>Disponibilidad</Text>
                  <Switch value={disponibilidad} onValueChange={setDisponibilidad} trackColor={{ false: '#E2E8F0', true: '#10B981' }} thumbColor="#fff" />
                </View>
                <View style={[styles.toggleRow, { marginTop: 8 }]}>
                  <Text style={styles.toggleText}>En Oferta</Text>
                  <Switch value={estadoPromocion} onValueChange={setEstadoPromocion} trackColor={{ false: '#E2E8F0', true: '#10B981' }} thumbColor="#fff" />
                </View>
                <View style={[styles.toggleRow, { marginTop: 8 }]}>
                  <Text style={styles.toggleText}>Receta</Text>
                  <Switch value={Receta} onValueChange={setReceta} trackColor={{ false: '#E2E8F0', true: '#10B981' }} thumbColor="#fff" />
                </View>
              </View>
            </View>
          </View>

          {/* COL 2: Multimedia & Variantes */}
          <View style={[styles.col, { flex: isDesktop ? 0.34 : 1, paddingHorizontal: isDesktop ? 16 : 0 }]}>
            <View style={styles.card}>
              <Text style={styles.colTitle}>Multimedia</Text>
              <View style={styles.mediaRow}>
                {[
                  { uri: foto1, setter: setFoto1 },
                  { uri: foto2, setter: setFoto2 },
                  { uri: foto3, setter: setFoto3 }
                ].map((item, i) => (
                  <TouchableOpacity 
                    key={i} 
                    style={[styles.imageBox, { borderStyle: 'dashed' }]} 
                    activeOpacity={0.7}
                    onPress={() => pickImage(item.setter)}
                  >
                    {item.uri ? (
                      <View style={{ flex: 1 }}>
                        <Image source={{ uri: item.uri }} style={styles.imageFull} resizeMode="cover" />
                        <TouchableOpacity style={styles.removeImageBtn} onPress={(e) => { e.stopPropagation(); item.setter(null); }}>
                          <Ionicons name="close-circle" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Ionicons name={i === 0 ? "camera-outline" : "add-outline"} size={20} color="#10B981" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.colTitle}>Variantes (Opcional)</Text>
              <View style={styles.variantsSection}>
                <View style={styles.variantInputRow}>
                  <TextInput style={[styles.variantInput, { flex: 1 }]} placeholder="Valor" value={newVariantLabel} onChangeText={setNewVariantLabel} />
                  
                  <View style={styles.unitSelector}>
                    <TouchableOpacity 
                      onPress={() => setVariantUnit('gr')} 
                      style={[styles.unitBtn, variantUnit === 'gr' && styles.unitBtnActive]}
                    >
                      <Text style={[styles.unitBtnText, variantUnit === 'gr' && styles.unitBtnTextActive]}>Gr</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => setVariantUnit('kg')} 
                      style={[styles.unitBtn, variantUnit === 'kg' && styles.unitBtnActive]}
                    >
                      <Text style={[styles.unitBtnText, variantUnit === 'kg' && styles.unitBtnTextActive]}>Kg</Text>
                    </TouchableOpacity>
                  </View>

                  <TextInput style={[styles.variantInput, { flex: 1.2 }]} placeholder="Precio $" value={newVariantPrice} onChangeText={setNewVariantPrice} keyboardType="numeric" />
                  <TouchableOpacity style={styles.addVariantBtn} onPress={addVariant}><Ionicons name="add" size={20} color="#fff" /></TouchableOpacity>
                </View>
                <View style={[styles.variantList, { maxHeight: isDesktop ? 100 : undefined }]}>
                  {variants.length === 0 ? (
                    <Text style={[styles.emptyVariantText, { fontSize: 12 }]}>UNIDAD (Sin variantes)</Text>
                  ) : (
                    variants.map((v, i) => (
                      <View key={i} style={styles.variantBadge}>
                        <Text style={styles.variantBadgeText}>{v.label} - ${v.price}</Text>
                        <TouchableOpacity onPress={() => removeVariant(i)}><Ionicons name="close-circle" size={16} color="#EF4444" /></TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* COL 3: Precios & Clasificación */}
          <View style={[styles.col, { flex: isDesktop ? 0.33 : 1 }]}>
            <View style={styles.card}>
              <Text style={styles.colTitle}>Inventario</Text>
              <CustomInput label="Precio Base ($)" placeholder="0.00" value={precio} onChangeText={setPrecio} numeric />
              <CustomInput label="Medida" placeholder="kg..." value={medida} onChangeText={setMedida} />
            </View>

            <View style={styles.card}>
              <Text style={styles.colTitle}>Clasificación</Text>
              <DropdownRow icon="paw-outline" label="Animal" placeholder="Animal..." value={animalSelected} options={animalsList} onSelect={handleAnimalChange} multiple />
              <DropdownRow icon="grid-outline" label="Categoría" placeholder="Categoría..." value={categoria} options={displayCategories} onSelect={setCategoria} disabled={animalSelected.length === 0} multiple />
              <DropdownRow icon="shield-outline" label="Marca" placeholder="Marca..." value={marca} options={displayBrands} onSelect={setMarca} disabled={animalSelected.length === 0} multiple />
            </View>
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    height: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#FFFFFF'
  },
  headerBackBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#F8FAFC' },
  headerSubText: { fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },
  headerTitleText: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerSaveBtn: { backgroundColor: '#10B981', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  headerSaveText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  container: { flex: 1 },
  content: { padding: 32 },
  mainLayout: { gap: 32 },
  mainLayoutDesktop: { flexDirection: 'row', gap: 24 },
  col: { gap: 12 },
  colTitle: { fontSize: 11, fontWeight: '900', color: '#10B981', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 },

  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  
  inspectorCard: { padding: 0, backgroundColor: 'transparent' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleText: { fontSize: 13, fontWeight: '700', color: '#475569' },

  mediaRow: { flexDirection: 'row', gap: 10 },
  imageBox: { 
    flex: 1, height: 80, backgroundColor: '#FFFFFF', borderRadius: 12, 
    borderWidth: 1.5, borderColor: '#10B981', overflow: 'hidden' 
  },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imageLabelTiny: { fontSize: 10, fontWeight: '800', color: '#10B981' },
  imageFull: { width: '100%', height: '100%' },
  removeImageBtn: { position: 'absolute', top: 2, right: 2, backgroundColor: '#fff', borderRadius: 10 },

  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 6, marginLeft: 2 },
  input: {
    backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#0F172A', borderWidth: 1.5, borderColor: '#F1F5F9', outlineWidth: 0,
    fontWeight: '600'
  } as any,
  inputFocused: { borderColor: '#10B981', backgroundColor: '#fff' },
  inputMultiline: { height: 70, textAlignVertical: 'top' },
  inlineRow: { flexDirection: 'row', gap: 12 },

  dropdownWrap: { marginBottom: 12 },
  dropdown: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1.5, borderColor: '#F1F5F9', gap: 10 
  },
  dropdownOpen: { borderColor: '#10B981' },
  dropdownText: { flex: 1, fontSize: 14, color: '#94A3B8', fontWeight: '600' },
  dropdownTextSelected: { color: '#0F172A' },
  dropdownOptions: {
    backgroundColor: '#fff', borderRadius: 12, marginTop: 4,
    borderWidth: 1, borderColor: '#F1F5F9', padding: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10,
    zIndex: 1000
  },
  dropdownOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderRadius: 8 },
  dropdownOptionText: { fontSize: 13, color: '#475569', fontWeight: '600' },
  dropdownOptionActive: { backgroundColor: '#F0FDF4', color: '#10B981', fontWeight: '800' },

  colorInputContainer: { },
  colorInputRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  colorTextInput: { 
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 16, 
    height: 48, fontSize: 14, borderWidth: 1.5, borderColor: '#F1F5F9', outlineWidth: 0,
    fontWeight: '600'
  } as any,
  addColorTinyBtn: { width: 48, height: 48, backgroundColor: '#10B981', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tag: { 
    flexDirection: 'row', alignItems: 'center', gap: 8, 
    backgroundColor: '#F0FDF4', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: '#DCFCE7'
  },
  tagText: { fontSize: 13, fontWeight: '700', color: '#10B981' },

  toast: {
    position: 'absolute', top: 40, alignSelf: 'center', zIndex: 9999,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10,
    minWidth: 300, maxWidth: '90%'
  },
  toastSuccess: { backgroundColor: '#10B981' },
  toastError: { backgroundColor: '#EF4444' },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '700', marginLeft: 10, flex: 1 },

  variantsSection: { backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  variantInputRow: { flexDirection: 'row', gap: 6, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' },
  variantInput: { 
    backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 10, height: 36, 
    borderWidth: 1, borderColor: '#E2E8F0', fontSize: 13, fontWeight: '600',
    minWidth: 60
  },
  
  unitSelector: { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 8, padding: 2, height: 36 },
  unitBtn: { paddingHorizontal: 8, justifyContent: 'center', borderRadius: 6 },
  unitBtnActive: { backgroundColor: '#fff' },
  unitBtnText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  unitBtnTextActive: { color: '#10B981' },

  addVariantBtn: { width: 36, height: 36, backgroundColor: '#F47321', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  variantList: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  variantBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0FDF4', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#DCFCE7' },
  variantBadgeText: { fontSize: 13, fontWeight: '700', color: '#10B981' },
  emptyVariantBadge: { backgroundColor: '#F0FDF4', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#DCFCE7' },
  emptyVariantText: { fontSize: 13, fontWeight: '800', color: '#10B981' },
});
