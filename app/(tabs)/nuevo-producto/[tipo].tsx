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
  const [cantidadCreada, setCantidadCreada] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState<string | string[]>('');
  const [marca, setMarca] = useState<string | string[]>('');
  const [animalSelected, setAnimalSelected] = useState('');
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

  const handleAnimalChange = (newAnimal: string) => {
    if (newAnimal !== animalSelected) {
      setAnimalSelected(newAnimal);
      setCategoria([]);
      setMarca([]);
    }
  };

  const displayCategories = categoriesList
    .filter(c => {
      if (c.disponibilidad === false) return false;
      if (!animalSelected) return true;
      const animals = c.animales || (c.animal ? [c.animal] : []);
      return animals.includes(animalSelected) || animals.includes('Ambos') || animals.includes('Todos');
    })
    .map(c => c.nombre || c.name);

  const displayBrands = Array.from(new Set(
    brandsList
      .filter(b => {
        // 1. Filter by Animal
        const matchAnimal = !animalSelected || 
          b.Tipo_animal === animalSelected || 
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
  const [sizes, setSizes] = useState<string[]>([]);
  const [newSize, setNewSize] = useState('');
  
  const [foto1, setFoto1] = useState<string | null>(null);
  const [foto2, setFoto2] = useState<string | null>(null);
  const [foto3, setFoto3] = useState<string | null>(null);

  const reset = () => {
    setNombre(''); setPrecio(''); setMedida(''); setCantidadCreada('1'); setDescripcion('');
    setCategoria(''); setAnimalSelected(''); setMarca('');
    setEstadoPromocion(false); setDisponibilidad(true); setReceta(false); setColores([]); setSizes([]);
    setFoto1(null); setFoto2(null); setFoto3(null);
  };

  const pickImage = async (setter: (v: string | null) => void) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setter(result.assets[0].uri);
    }
  };

  const addSize = () => {
    if (newSize.trim()) {
      setSizes((s) => [...s, newSize.trim()]);
      setNewSize('');
    }
  };
  const removeSize = (i: number) => setSizes((s) => s.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!nombre || !precio) {
      alert('Por favor completa los campos obligatorios (Nombre y Precio)');
      return;
    }

    try {
      setLoading(true);
      const docData = {
        nombre,
        precio: parseFloat(precio) || 0,
        medida,
        Cantidadcreada: parseInt(cantidadCreada) || 0,
        descripcion,
        categoria,
        marca: marca,
        animal: animalSelected,
        estadoPromocion,
        disponibilidad,
        Receta,
        sizes,
        Tipo: 'General',
        foto1: foto1 || '',
        foto2: foto2 || '',
        foto3: foto3 || '',
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
      <View style={[styles.header, isDesktop && { height: 100, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#fff' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <TouchableOpacity 
            style={styles.headerBackBtn} 
            onPress={() => router.push('/productos')} 
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitleText, isDesktop && { fontSize: 28, fontWeight: '900' }]}>Nuevo Producto</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerResetBtn} onPress={reset}>
            <Text style={styles.headerResetText}>Descartar</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerSaveBtn, loading && { opacity: 0.7 }]} 
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.headerSaveText}>{loading ? 'Guardando...' : 'Guardar Producto'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={[styles.content, isDesktop && { flex: 1, paddingHorizontal: 40 }]}
        showsVerticalScrollIndicator={!isDesktop}
      >
        <View style={[styles.mainLayout, isDesktop && styles.mainLayoutDesktop]}>
          
          <View style={[styles.col, { flex: isDesktop ? 0.3 : 1 }]}>
            <Text style={styles.colTitle}>Multimedia</Text>
            <View style={styles.mediaRow}>
              {[
                { uri: foto1, setter: setFoto1, label: 'Principal' },
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
                      <TouchableOpacity 
                        style={styles.removeImageBtn} 
                        onPress={(e) => { e.stopPropagation(); item.setter(null); }}
                      >
                        <Ionicons name="close-circle" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      {i === 0 ? <Ionicons name="camera-outline" size={24} color="#10B981" /> : <Ionicons name="add-outline" size={24} color="#CBD5E1" />}
                      {item.label && <Text style={styles.imageLabelTiny}>{item.label}</Text>}
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.colTitle, { marginTop: 24 }]}>Estado y Visibilidad</Text>
            <View style={styles.inspectorCard}>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleText}>Disponibilidad</Text>
                <Switch
                  value={disponibilidad}
                  onValueChange={setDisponibilidad}
                  trackColor={{ false: '#E2E8F0', true: '#10B981' }}
                  thumbColor="#fff"
                  style={Platform.OS === 'web' ? { transform: [{ scale: 0.8 }] } as any : {}}
                />
              </View>
              <View style={[styles.toggleRow, { marginTop: 12 }]}>
                <Text style={styles.toggleText}>En Promoción</Text>
                <Switch
                  value={estadoPromocion}
                  onValueChange={setEstadoPromocion}
                  trackColor={{ false: '#E2E8F0', true: '#10B981' }}
                  thumbColor="#fff"
                  style={Platform.OS === 'web' ? { transform: [{ scale: 0.8 }] } as any : {}}
                />
              </View>
              <View style={[styles.toggleRow, { marginTop: 12 }]}>
                <Text style={styles.toggleText}>Receta Médica</Text>
                <Switch
                  value={Receta}
                  onValueChange={setReceta}
                  trackColor={{ false: '#E2E8F0', true: '#10B981' }}
                  thumbColor="#fff"
                  style={Platform.OS === 'web' ? { transform: [{ scale: 0.8 }] } as any : {}}
                />
              </View>
            </View>
          </View>

          <View style={[styles.col, { flex: isDesktop ? 0.4 : 1, paddingHorizontal: isDesktop ? 40 : 0 }]}>
            <Text style={styles.colTitle}>Información General</Text>
            <CustomInput label="Nombre del producto" placeholder="Ej: Lata Félix Sabor Pescado" value={nombre} onChangeText={setNombre} />
            <CustomInput label="Descripción" placeholder="Escribe aquí los beneficios y detalles..." value={descripcion} onChangeText={setDescripcion} multiline />
            
            <View style={styles.inlineRow}>
              <View style={{ flex: 1.5 }}><CustomInput label="Precio ($)" placeholder="0.00" value={precio} onChangeText={setPrecio} numeric /></View>
              <View style={{ flex: 1 }}><CustomInput label="Medida" placeholder="g, kg, ml..." value={medida} onChangeText={setMedida} /></View>
              <View style={{ flex: 1 }}><CustomInput label="Stock" placeholder="0" value={cantidadCreada} onChangeText={setCantidadCreada} numeric /></View>
            </View>
          </View>

          <View style={[styles.col, { flex: isDesktop ? 0.3 : 1 }]}>
            <Text style={styles.colTitle}>Clasificación</Text>
            <DropdownRow icon="paw-outline" label="Animal" placeholder="Selecciona..." value={animalSelected} options={animalsList} onSelect={handleAnimalChange} />
            <DropdownRow icon="grid-outline" label="Categoría" placeholder="Selecciona..." value={categoria} options={displayCategories} onSelect={setCategoria} disabled={!animalSelected} multiple />
            <DropdownRow icon="shield-outline" label="Marca (Opcional)" placeholder="Selecciona..." value={marca} options={displayBrands} onSelect={setMarca} disabled={!animalSelected} multiple />
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    height: 80, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#FFFFFF'
  },
  headerBackBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#F8FAFC' },
  headerSubText: { fontSize: 11, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },
  headerTitleText: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  headerResetBtn: { paddingHorizontal: 12 },
  headerResetText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  headerSaveBtn: { backgroundColor: '#10B981', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  headerSaveText: { fontSize: 14, fontWeight: '800', color: '#fff' },

  container: { flex: 1 },
  content: { padding: 32 },
  mainLayout: { gap: 32 },
  mainLayoutDesktop: { flexDirection: 'row', gap: 0 },
  col: { gap: 12 },
  colTitle: { fontSize: 12, fontWeight: '900', color: '#10B981', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },

  inspectorCard: { padding: 20, backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleText: { fontSize: 14, fontWeight: '700', color: '#475569' },

  mediaRow: { flexDirection: 'row', gap: 12 },
  imageBox: { 
    flex: 1, height: 110, backgroundColor: '#FFFFFF', borderRadius: 12, 
    borderWidth: 1.5, borderColor: '#10B981', overflow: 'hidden' 
  },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  imageLabelTiny: { fontSize: 11, fontWeight: '800', color: '#10B981' },
  imageFull: { width: '100%', height: '100%' },
  removeImageBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: '#fff', borderRadius: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 },

  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 10, marginLeft: 2 },
  input: {
    backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#0F172A', borderWidth: 1.5, borderColor: '#F1F5F9', outlineWidth: 0,
    fontWeight: '600'
  } as any,
  inputFocused: { borderColor: '#10B981', backgroundColor: '#fff' },
  inputMultiline: { height: 120, textAlignVertical: 'top' },
  inlineRow: { flexDirection: 'row', gap: 20 },

  dropdownWrap: { marginBottom: 20 },
  dropdown: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1.5, borderColor: '#F1F5F9', gap: 12 
  },
  dropdownOpen: { borderColor: '#10B981' },
  dropdownText: { flex: 1, fontSize: 15, color: '#94A3B8', fontWeight: '600' },
  dropdownTextSelected: { color: '#0F172A' },
  dropdownOptions: {
    backgroundColor: '#fff', borderRadius: 16, marginTop: 8,
    borderWidth: 1, borderColor: '#F1F5F9', padding: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10,
    zIndex: 1000
  },
  dropdownOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 10 },
  dropdownOptionText: { fontSize: 14, color: '#475569', fontWeight: '600' },
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
});


