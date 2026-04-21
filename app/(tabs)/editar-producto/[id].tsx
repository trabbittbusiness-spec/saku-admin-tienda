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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const CATEGORIES = ['Ropa', 'Calzado', 'Accesorios', 'Electrónica'];
const BRANDS = ['Nike', 'Adidas', 'Zara', 'H&M', 'Apple', 'Samsung'];
const ANIMALS = ['Perro', 'Gato', 'Ave', 'Pez', 'Otro'];

const PRODUCTS: Record<string, any> = {
  '1': { name: 'Camisa Oxford Azul', price: '350', stock: '24', desc: '', cat: 'Ropa', brand: '', animal: '', promo: false, available: true, recipe: false },
  '2': { name: 'Tenis Sport Pro', price: '890', stock: '8', desc: '', cat: 'Calzado', brand: '', animal: '', promo: false, available: true, recipe: false },
  '3': { name: 'Reloj Minimal', price: '1200', stock: '3', desc: '', cat: 'Accesorios', brand: '', animal: '', promo: false, available: true, recipe: false },
  '4': { name: 'Audífonos Bluetooth', price: '650', stock: '15', desc: '', cat: 'Electrónica', brand: '', animal: '', promo: false, available: true, recipe: false },
  '5': { name: 'Pantalón Chino Beige', price: '420', stock: '0', desc: '', cat: 'Ropa', brand: '', animal: '', promo: false, available: false, recipe: false },
  '6': { name: 'Mochila Urban XL', price: '580', stock: '11', desc: '', cat: 'Accesorios', brand: '', animal: '', promo: false, available: true, recipe: false },
};

function DropdownRow({ icon, placeholder, value, options, onSelect }: {
  icon: any; placeholder: string; value: string; options: string[]; onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <TouchableOpacity style={styles.dropdown} onPress={() => setOpen(!open)} activeOpacity={0.8}>
        <Ionicons name={icon} size={22} color="#8B7355" />
        <Text style={[styles.dropdownText, value && styles.dropdownTextSelected]}>
          {value || placeholder}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#8B7355" />
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
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export default function EditarProductoScreen() {
  const { id, from } = useLocalSearchParams<{ id: string, from?: string }>();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;

  const base = PRODUCTS[id ?? '1'] ?? PRODUCTS['1'];
  const [name, setName] = useState<string>(base.name);
  const [price, setPrice] = useState<string>(base.price);
  const [stock, setStock] = useState<string>(base.stock);
  const [desc, setDesc] = useState<string>(base.desc);
  const [cat, setCat] = useState<string>(base.cat);
  const [brand, setBrand] = useState<string>(base.brand);
  const [animal, setAnimal] = useState<string>(base.animal);
  const [promo, setPromo] = useState<boolean>(base.promo);
  const [available, setAvailable] = useState<boolean>(base.available);
  const [recipe, setRecipe] = useState<boolean>(base.recipe);
  const [colors, setColors] = useState<string[]>(['Rojo', 'Azul', 'Negro']);

  const removeColor = (i: number) => setColors((c) => c.filter((_, idx) => idx !== i));
  const addColor = () => setColors((c) => [...c, `Color ${c.length + 1}`]);

  const Content = (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Images row */}
      <View style={styles.imagesRow}>
        {[0, 1, 2].map((i) => (
          <TouchableOpacity key={i} style={styles.imageBox} activeOpacity={0.7}>
            <Ionicons name="image-outline" size={32} color="#B0A090" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Text fields */}
      <View style={styles.fieldsSection}>
        <TextInput
          style={styles.fieldInput}
          placeholder="[nombre]"
          placeholderTextColor="#94A3B8"
          value={name}
          onChangeText={setName}
        />
        <View style={styles.fieldDivider} />

        <TextInput
          style={styles.fieldInput}
          placeholder="[precio]"
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
          value={price}
          onChangeText={setPrice}
        />
        <View style={styles.fieldDivider} />

        <TextInput
          style={styles.fieldInput}
          placeholder="[medida / stock]"
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
          value={stock}
          onChangeText={setStock}
        />
        <View style={styles.fieldDivider} />

        <TextInput
          style={[styles.fieldInput, styles.fieldMultiline]}
          placeholder="[descripcion]"
          placeholderTextColor="#94A3B8"
          multiline
          numberOfLines={4}
          value={desc}
          onChangeText={setDesc}
        />
        <View style={styles.fieldDivider} />
      </View>

      {/* Dropdowns */}
      <View style={styles.dropdownsSection}>
        <DropdownRow icon="copy-outline" placeholder="Selecciona la categoría.." value={cat} options={CATEGORIES} onSelect={setCat} />
        <DropdownRow icon="refresh-circle-outline" placeholder="Selecciona la marca.." value={brand} options={BRANDS} onSelect={setBrand} />
        <DropdownRow icon="paw-outline" placeholder="Selecciona el animal.." value={animal} options={ANIMALS} onSelect={setAnimal} />
      </View>

      {/* Toggles */}
      <View style={styles.togglesSection}>
        {[
          { label: 'Promoción', value: promo, onChange: setPromo },
          { label: 'Disponibilidad', value: available, onChange: setAvailable },
          { label: 'Receta', value: recipe, onChange: setRecipe },
        ].map((t) => (
          <View key={t.label} style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>{t.label}</Text>
            <Switch
              value={t.value}
              onValueChange={t.onChange}
              trackColor={{ false: '#E2E8F0', true: '#86EFAC' }}
              thumbColor={t.value ? '#22C55E' : '#CBD5E1'}
            />
          </View>
        ))}
      </View>

      {/* Colors */}
      <TouchableOpacity style={styles.addColorBtn} onPress={addColor} activeOpacity={0.85}>
        <Ionicons name="add" size={18} color="#fff" />
        <Text style={styles.addColorText}>Agregar color</Text>
      </TouchableOpacity>

      <View style={styles.colorsList}>
        {colors.map((color, i) => (
          <View key={i} style={[styles.colorItem, i === 0 && styles.colorItemActive]}>
            <Text style={[styles.colorItemText, i === 0 && styles.colorItemTextActive]}>
              {color}
            </Text>
            <TouchableOpacity onPress={() => removeColor(i)}>
              <Ionicons name="trash" size={18} color={i === 0 ? '#EF4444' : '#FCA5A5'} />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Update Button */}
      <TouchableOpacity style={styles.updateBtn} activeOpacity={0.85}>
        <Text style={styles.updateBtnText}>Actualizar</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const header = (
    <View style={[styles.header, isDesktop && { height: 100, borderBottomWidth: 0, backgroundColor: '#fff' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => from ? router.push(from as any) : router.back()} 
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View>
          <Text style={{ fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' }}>Editar Producto</Text>
          <Text style={[styles.headerTitle, isDesktop && { fontSize: 26, fontWeight: '900' }]}>{name || 'Cargando...'}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.deleteBtn}>
        <Ionicons name="trash" size={22} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );

  if (!isDesktop) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {header}
        {Content}
      </SafeAreaView>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {header}
      {Content}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F1EE' },
  scroll: { flex: 1, backgroundColor: '#F4F1EE' },
  content: { paddingHorizontal: 20, paddingBottom: 48, paddingTop: 12 },
  contentDesktop: { maxWidth: 500, paddingHorizontal: 32 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F4F1EE',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2D9',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  deleteBtn: { padding: 4 },

  imagesRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  imageBox: {
    flex: 1, aspectRatio: 1, borderRadius: 12, backgroundColor: '#CEC8C0',
    alignItems: 'center', justifyContent: 'center',
  },

  fieldsSection: { marginBottom: 20 },
  fieldInput: {
    fontSize: 16,
    color: '#0F172A',
    paddingVertical: 14,
    backgroundColor: 'transparent',
    outlineWidth: 0,
  } as any,
  fieldMultiline: { minHeight: 100, textAlignVertical: 'top' },
  fieldDivider: { height: 1, backgroundColor: '#CBD5E1' },

  dropdownsSection: { gap: 10, marginBottom: 20 },
  dropdown: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#EDE8E0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  dropdownText: { flex: 1, fontSize: 15, color: '#8B7355' },
  dropdownTextSelected: { color: '#0F172A' },
  dropdownOptions: {
    backgroundColor: '#fff', borderRadius: 10, marginTop: 4,
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 6,
  },
  dropdownOption: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dropdownOptionText: { fontSize: 14, color: '#475569' },
  dropdownOptionActive: { color: '#6366F1', fontWeight: '700' },

  togglesSection: { marginBottom: 20 },
  toggleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E8E2D9',
  },
  toggleLabel: { fontSize: 15, color: '#0F172A', fontWeight: '500' },

  addColorBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#22C55E', borderRadius: 10,
    paddingVertical: 12, paddingHorizontal: 18,
    alignSelf: 'flex-start', marginBottom: 16,
  },
  addColorText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  colorsList: { gap: 8, marginBottom: 28 },
  colorItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: '#E8E2D9',
  },
  colorItemActive: {},
  colorItemText: { fontSize: 15, color: '#94A3B8' },
  colorItemTextActive: { color: '#0F172A', fontWeight: '600' },

  updateBtn: {
    backgroundColor: '#4C1D7A', borderRadius: 14,
    paddingVertical: 18, alignItems: 'center',
  },
  updateBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
