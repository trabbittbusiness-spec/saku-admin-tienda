import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

const CATEGORIES_PERRO_GATO = ['Alimento', 'Accesorios', 'Higiene', 'Juguetes', 'Salud', 'Ropa'];
const CATEGORIES_EXOTICO = ['Aves', 'Reptiles', 'Peces', 'Roedores', 'Accesorios'];
const ANIMALS_PERRO_GATO = ['Perro', 'Gato', 'Ambos'];
const ANIMALS_EXOTICO = ['Ave', 'Pez', 'Reptil', 'Roedor', 'Otro'];
const BRANDS = ['Royal Canin', 'Purina', 'Hills', 'Whiskas', 'Pedigree', 'Otra'];

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

function DropdownRow({ icon, label, placeholder, value, options, onSelect }: {
  icon: any; label: string; placeholder: string; value: string; options: string[]; onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.dropdownWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity 
        style={[styles.dropdown, open && styles.dropdownOpen]} 
        onPress={() => setOpen(!open)} 
        activeOpacity={0.8}
      >
        <Ionicons name={icon} size={16} color={value ? "#10B981" : "#94A3B8"} />
        <Text style={[styles.dropdownText, value && styles.dropdownTextSelected]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color="#94A3B8" />
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdownOptions}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={styles.dropdownOption}
              onPress={() => { onSelect(opt); setOpen(false); }}
            >
              <Text style={[styles.dropdownOptionText, value === opt && styles.dropdownOptionActive]}>
                {opt}
              </Text>
              {value === opt && <Ionicons name="checkmark" size={12} color="#10B981" />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export default function NuevoProductoScreen() {
  const { tipo, from } = useLocalSearchParams<{ tipo: string, from?: string }>();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1024;

  const isExotico = tipo === 'exotico';
  const pageTitle = isExotico ? 'Productos Exóticos' : 'Gato o Perro';
  const categories = isExotico ? CATEGORIES_EXOTICO : CATEGORIES_PERRO_GATO;
  const animals = isExotico ? ANIMALS_EXOTICO : ANIMALS_PERRO_GATO;

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [measure, setMeasure] = useState('');
  const [desc, setDesc] = useState('');
  const [cat, setCat] = useState('');
  const [animal, setAnimal] = useState('');
  const [brand, setBrand] = useState('');
  const [promo, setPromo] = useState(false);
  const [recipe, setRecipe] = useState(false);
  const [colors, setColors] = useState<string[]>([]);
  const [newColor, setNewColor] = useState('');
  
  // Image States
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [subImage1, setSubImage1] = useState<string | null>(null);
  const [subImage2, setSubImage2] = useState<string | null>(null);

  const reset = () => {
    setName(''); setPrice(''); setMeasure(''); setDesc('');
    setCat(''); setAnimal(''); setBrand('');
    setPromo(false); setRecipe(false); setColors([]); setNewColor('');
    setMainImage(null); setSubImage1(null); setSubImage2(null);
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

  const addColor = () => {
    if (newColor.trim()) {
      setColors((c) => [...c, newColor.trim()]);
      setNewColor('');
    }
  };
  const removeColor = (i: number) => setColors((c) => c.filter((_, idx) => idx !== i));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={[styles.header, isDesktop && { height: 100, borderBottomWidth: 0, backgroundColor: '#fff' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity 
            style={styles.headerBackBtn} 
            onPress={() => from ? router.push(from as any) : router.back()} 
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerSubText}>{isExotico ? 'Animales Exóticos' : 'Perros y Gatos'}</Text>
            <Text style={[styles.headerTitleText, isDesktop && { fontSize: 26, fontWeight: '900' }]}>{name || 'Agregar producto'}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerResetBtn} onPress={reset}>
            <Text style={styles.headerResetText}>Descartar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerSaveBtn}>
            <Text style={styles.headerSaveText}>Guardar Producto</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={[styles.content, isDesktop && { flex: 1 }]}
        showsVerticalScrollIndicator={!isDesktop}
      >
        <View style={[styles.mainLayout, isDesktop && styles.mainLayoutDesktop]}>
          
          {/* COL 1: MEDIA & STATUS */}
          <View style={[styles.col, { flex: isDesktop ? 0.3 : 1 }]}>
            <Text style={styles.colTitle}>Multimedia</Text>
            <View style={styles.mediaRow}>
              <TouchableOpacity 
                style={styles.imageBox} 
                activeOpacity={0.7}
                onPress={() => pickImage(setMainImage)}
              >
                {mainImage ? (
                  <Image source={{ uri: mainImage }} style={styles.imageFull} resizeMode="cover" />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="camera-outline" size={20} color="#10B981" />
                    <Text style={styles.imageLabelTiny}>Principal</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.imageBox} 
                activeOpacity={0.7}
                onPress={() => pickImage(setSubImage1)}
              >
                {subImage1 ? (
                  <Image source={{ uri: subImage1 }} style={styles.imageFull} resizeMode="cover" />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="add" size={18} color="#94A3B8" />
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.imageBox} 
                activeOpacity={0.7}
                onPress={() => pickImage(setSubImage2)}
              >
                {subImage2 ? (
                  <Image source={{ uri: subImage2 }} style={styles.imageFull} resizeMode="cover" />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="add" size={18} color="#94A3B8" />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.colTitle}>Visibilidad</Text>
            <View style={styles.inspectorCard}>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleText}>En Promoción</Text>
                <Switch
                  value={promo}
                  onValueChange={setPromo}
                  trackColor={{ false: '#E2E8F0', true: '#10B981' }}
                  thumbColor={promo ? '#fff' : '#fff'}
                  style={Platform.OS === 'web' ? { transform: [{ scale: 0.8 }] } as any : {}}
                />
              </View>
              {!isExotico && (
                <View style={[styles.toggleRow, { marginTop: 12 }]}>
                  <Text style={styles.toggleText}>Receta Médica</Text>
                  <Switch
                    value={recipe}
                    onValueChange={setRecipe}
                    trackColor={{ false: '#E2E8F0', true: '#10B981' }}
                    thumbColor={recipe ? '#fff' : '#fff'}
                    style={Platform.OS === 'web' ? { transform: [{ scale: 0.8 }] } as any : {}}
                  />
                </View>
              )}
            </View>
          </View>

          {/* COL 2: CORE INFO */}
          <View style={[styles.col, { flex: isDesktop ? 0.4 : 1, paddingHorizontal: isDesktop ? 20 : 0 }]}>
            <Text style={styles.colTitle}>Detalles Principales</Text>
            <CustomInput label="Nombre comercial" placeholder="Ej: Royal Canin Puppy" value={name} onChangeText={setName} />
            <CustomInput label="Descripción del producto" placeholder="Escribe aquí los beneficios..." value={desc} onChangeText={setDesc} multiline />
            
            <View style={styles.inlineRow}>
              <View style={{ flex: 1 }}><CustomInput label="Precio venta ($)" placeholder="0.00" value={price} onChangeText={setPrice} numeric /></View>
              <View style={{ flex: 1 }}><CustomInput label="Unidad" placeholder="kg, lb..." value={measure} onChangeText={setMeasure} /></View>
            </View>
          </View>

          {/* COL 3: ATTRS */}
          <View style={[styles.col, { flex: isDesktop ? 0.3 : 1 }]}>
            <Text style={styles.colTitle}>Categorización</Text>
            <DropdownRow icon="grid-outline" label="Categoría" placeholder="Ej: Alimento" value={cat} options={categories} onSelect={setCat} />
            <DropdownRow icon="paw-outline" label="Dirigido a" placeholder="Ej: Gato" value={animal} options={animals} onSelect={setAnimal} />
            {!isExotico && <DropdownRow icon="shield-outline" label="Marca" placeholder="Ej: Hill's" value={brand} options={BRANDS} onSelect={setBrand} />}

            <Text style={styles.colTitle}>Variantes Disponibles</Text>
            <View style={styles.colorInputContainer}>
              <View style={styles.colorInputRow}>
                <TextInput
                  style={styles.colorTextInput}
                  placeholder="Nuevo color..."
                  value={newColor}
                  onChangeText={setNewColor}
                />
                <TouchableOpacity style={styles.addColorTinyBtn} onPress={addColor}>
                  <Ionicons name="add" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={styles.tagsContainer}>
                {colors.map((color, idx) => (
                  <View key={idx} style={styles.tag}>
                    <Text style={styles.tagText}>{color}</Text>
                    <TouchableOpacity onPress={() => removeColor(idx)}><Ionicons name="close" size={14} color="#6366F1" /></TouchableOpacity>
                  </View>
                ))}
              </View>
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
    paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerBackBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerSubText: { fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' },
  headerTitleText: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerResetBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  headerResetText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  headerSaveBtn: { backgroundColor: '#10B981', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  headerSaveText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  container: { flex: 1 },
  content: { padding: 24 },
  mainLayout: { gap: 24 },
  mainLayoutDesktop: { flexDirection: 'row', gap: 0 },
  col: { gap: 16 },
  colTitle: { fontSize: 11, fontWeight: '900', color: '#10B981', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, marginTop: 8 },

  inspectorCard: { padding: 16, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleText: { fontSize: 13, fontWeight: '700', color: '#475569' },

  mediaRow: { flexDirection: 'row', gap: 10 },
  imageBox: { 
    flex: 1, height: 100, backgroundColor: '#fff', borderRadius: 12, borderStyle: 'dashed', 
    borderWidth: 1.5, borderColor: '#10B981', overflow: 'hidden' 
  },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  imageLabelTiny: { fontSize: 10, fontWeight: '800', color: '#10B981' },
  imageFull: { width: '100%', height: '100%' },

  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 12, fontWeight: '800', color: '#475569', marginBottom: 8, marginLeft: 2 },
  input: {
    backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#0F172A', borderWidth: 1, borderColor: '#E2E8F0', outlineWidth: 0,
  } as any,
  inputFocused: { borderColor: '#10B981' },
  inputMultiline: { height: 70, textAlignVertical: 'top' },
  inlineRow: { flexDirection: 'row', gap: 12 },

  dropdownWrap: { marginBottom: 14 },
  dropdown: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#E2E8F0', gap: 10 
  },
  dropdownOpen: { borderColor: '#10B981' },
  dropdownText: { flex: 1, fontSize: 14, color: '#94A3B8', fontWeight: '600' },
  dropdownTextSelected: { color: '#0F172A' },
  dropdownOptions: {
    backgroundColor: '#fff', borderRadius: 12, marginTop: 4,
    borderWidth: 1, borderColor: '#F1F5F9', padding: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 4,
  },
  dropdownOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderRadius: 8 },
  dropdownOptionText: { fontSize: 13, color: '#475569', fontWeight: '500' },
  dropdownOptionActive: { backgroundColor: '#F0FDF4', color: '#10B981', fontWeight: '700' },

  colorInputContainer: { },
  colorInputRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  colorTextInput: { 
    flex: 1, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, 
    height: 40, fontSize: 13, borderWidth: 1, borderColor: '#E2E8F0', outlineWidth: 0 
  } as any,
  addColorTinyBtn: { width: 40, height: 40, backgroundColor: '#10B981', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { 
    flexDirection: 'row', alignItems: 'center', gap: 6, 
    backgroundColor: '#F0FDF4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: '#DCFCE7'
  },
  tagText: { fontSize: 12, fontWeight: '700', color: '#10B981' },
});


