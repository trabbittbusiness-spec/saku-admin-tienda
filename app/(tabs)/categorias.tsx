import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  useWindowDimensions,
  Platform,
  FlatList,
  ActivityIndicator,
  Switch,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, onSnapshot, query, orderBy, updateDoc, doc, deleteDoc } from 'firebase/firestore';

const ANIMALS_DEFAULT = ['Todos', 'Perro', 'Gato', 'Exótico'];

export default function CategoriasScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 860;
  
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [animalsList, setAnimalsList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [selectedTab, setSelectedTab] = useState<'Categorias' | 'Marcas'>('Categorias');
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  // Shared Form State
  const [newName, setNewName] = useState('');
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  const [disponibilidad, setDisponibilidad] = useState(true);
  const [itemCategory, setItemCategory] = useState(''); // Only for Brands

  // Fetch Categories in real-time
  useEffect(() => {
    const qCats = query(collection(db, 'Categorias_name'), orderBy('creadoEn', 'desc'));
    const unsubCats = onSnapshot(qCats, (snapshot) => {
      setCategories(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qBrands = query(collection(db, 'Marca_name'));
    const unsubBrands = onSnapshot(qBrands, (snapshot) => {
      setBrands(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => {
      unsubCats();
      unsubBrands();
    };
  }, []);

  // Fetch Animals for the modal/filter
  useEffect(() => {
    const fetchAnimals = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'animal'));
        const animals = querySnapshot.docs
          .map(doc => doc.data().nombre)
          .filter(name => !!name);
        setAnimalsList([...new Set(['Todos', ...animals])] as string[]);
      } catch (error) {
        console.error("Error fetching animals:", error);
      }
    };
    fetchAnimals();
  }, []);

  const filteredData = (selectedTab === 'Categorias' ? categories : brands).filter(item => {
    const name = (item.nombre || item.name || '').toLowerCase();
    const matchesSearch = name.includes(search.toLowerCase());
    
    let matchesFilter = filter === 'Todos';
    if (!matchesFilter) {
      if (selectedTab === 'Categorias') {
        const animals = item.animales || (item.animal ? [item.animal] : []);
        matchesFilter = animals.includes(filter) || animals.includes('Ambos') || animals.includes('Todos');
      } else {
        matchesFilter = item.Tipo_animal === filter || item.Tipo_animal === 'Ambos' || item.Tipo_animal === 'Todos';
      }
    }
    
    return matchesSearch && matchesFilter;
  });

  const renderHeader = () => (
    <View style={[styles.header, isDesktop && styles.headerDesktop]}>
      <View style={[styles.headerTop, !isDesktop && styles.headerTopMobile]}>
        <View style={[styles.headerLeft, !isDesktop && styles.headerLeftMobile]}>
          <TouchableOpacity 
            style={[styles.backBtn, !isDesktop && styles.backBtnMobile]} 
            onPress={() => router.push('/cuenta')}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <View style={!isDesktop && { alignItems: 'center' }}>
            <Text style={[styles.headerTitleText, !isDesktop && styles.headerTitleTextMobile]}>
              {selectedTab === 'Categorias' ? 'Categorías' : 'Marcas'}
            </Text>
          </View>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabBtn, selectedTab === 'Categorias' && styles.tabBtnActive]} 
            onPress={() => setSelectedTab('Categorias')}
          >
            <Text style={[styles.tabBtnText, selectedTab === 'Categorias' && styles.tabBtnTextActive]}>Categorías</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tabBtn, selectedTab === 'Marcas' && styles.tabBtnActive]} 
            onPress={() => setSelectedTab('Marcas')}
          >
            <Text style={[styles.tabBtnText, selectedTab === 'Marcas' && styles.tabBtnTextActive]}>Marcas</Text>
          </TouchableOpacity>
        </View>

        {isDesktop && (
          <TouchableOpacity 
            style={styles.addBtn} 
            activeOpacity={0.8}
            onPress={() => {
              setEditingItem(null);
              setNewName('');
              setSelectedAnimals([]);
              setItemCategory('');
              setDisponibilidad(true);
              setIsModalVisible(true);
            }}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>
              {selectedTab === 'Categorias' ? 'Nueva Categoría' : 'Nueva Marca'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.headerControls}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder={selectedTab === 'Categorias' ? "Buscar categorías..." : "Buscar marcas..."}
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.filterTabs}
          contentContainerStyle={[styles.filterTabsContent, isDesktop && { gap: 16 }]}
        >
          {(animalsList.length > 0 ? animalsList : ANIMALS_DEFAULT).map(a => (
            <TouchableOpacity 
              key={a} 
              style={[styles.filterTab, filter === a && styles.filterTabActive]}
              onPress={() => setFilter(a)}
            >
              <Text style={[styles.filterTabText, filter === a && styles.filterTabTextActive]}>{a}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[styles.categoryCard, item.disponibilidad === false && { opacity: 0.7 }]} 
      activeOpacity={0.7}
      onPress={() => {
        setEditingItem(item);
        setNewName(item.nombre || item.name || '');
        setSelectedAnimals(item.animales || (item.Tipo_animal ? [item.Tipo_animal] : (item.animal ? [item.animal] : [])));
        setItemCategory(item.categoria || '');
        setDisponibilidad(item.disponibilidad !== false);
        setIsModalVisible(true);
      }}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.label}>{selectedTab === 'Categorias' ? 'Categoría' : 'Marca'}</Text>
              {item.disponibilidad === false && (
                <View style={styles.inactiveBadge}><Text style={styles.inactiveBadgeText}>INACTIVO</Text></View>
              )}
            </View>
            <Text style={styles.categoryName} numberOfLines={1}>{item.nombre || item.name}</Text>
          </View>
          <TouchableOpacity 
            style={styles.editIconBtn}
            onPress={() => {
              setEditingItem(item);
              setNewName(item.nombre || item.name || '');
              setSelectedAnimals(item.animales || (item.Tipo_animal ? [item.Tipo_animal] : (item.animal ? [item.animal] : [])));
              setItemCategory(item.categoria || '');
              setDisponibilidad(item.disponibilidad !== false);
              setIsModalVisible(true);
            }}
          >
             <Ionicons name="pencil" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {selectedTab === 'Marcas' && item.categoria && (
          <View style={[styles.animalTag, { backgroundColor: '#EEF2FF', marginBottom: 8, alignSelf: 'flex-start' }]}>
            <Text style={[styles.animalTagText, { color: '#4F46E5' }]}>{item.categoria}</Text>
          </View>
        )}

        <View style={styles.cardAnimals}>
          {(item.animales || []).map((a: string) => (
            <View key={a} style={styles.animalTag}>
              <Text style={styles.animalTagText}>{a}</Text>
            </View>
          ))}
          {(!item.animales || item.animales.length === 0) && (item.Tipo_animal || item.animal) && (
            <View style={styles.animalTag}>
              <Text style={styles.animalTagText}>{item.Tipo_animal || item.animal}</Text>
            </View>
          )}
        </View>

      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {renderHeader()}
      <FlatList
        key={isDesktop ? 'desktop' : 'mobile'}
        data={filteredData}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        numColumns={isDesktop ? 4 : 2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[styles.listContent, isDesktop && { paddingHorizontal: 40 }]}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB Mobile */}
      {!isDesktop && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => setIsModalVisible(true)}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Modal Nueva / Editar Categoría */}
      {isModalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingItem ? 'Editar' : 'Nueva'} {selectedTab === 'Categorias' ? 'Categoría' : 'Marca'}
              </Text>
              <TouchableOpacity onPress={() => {
                setIsModalVisible(false);
                setEditingItem(null);
                setSelectedAnimals([]);
                setNewName('');
                setItemCategory('');
                setDisponibilidad(true);
              }}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.inputLabel}>Nombre</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={selectedTab === 'Categorias' ? "Ej. Alimento Premium" : "Ej. Royal Canin"}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />

            {selectedTab === 'Marcas' && (
              <>
                <Text style={styles.inputLabel}>Categoría Relacionada (Opcional)</Text>
                <View style={styles.categoryPicker}>
                  {categories.map(c => {
                    const cName = c.nombre || c.name;
                    const isSelected = itemCategory === cName;
                    return (
                      <TouchableOpacity 
                        key={c.id} 
                        style={[styles.modalAnimalChip, isSelected && styles.modalAnimalChipActive]}
                        onPress={() => setItemCategory(isSelected ? '' : cName)}
                      >
                        <Text style={[styles.modalAnimalChipText, isSelected && styles.modalAnimalChipTextActive]}>
                          {cName}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

            <View style={[styles.statusRow, { marginBottom: 20 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Disponibilidad</Text>
                <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: -8 }}>{disponibilidad ? 'Visible en formularios' : 'Oculta en formularios'}</Text>
              </View>
              <Switch 
                value={disponibilidad} 
                onValueChange={setDisponibilidad}
                trackColor={{ false: '#E2E8F0', true: '#10B981' }}
              />
            </View>

            <Text style={styles.inputLabel}>¿A qué animales pertenece?</Text>
            <View style={styles.modalAnimalList}>
              {(animalsList.length > 0 ? animalsList : ANIMALS_DEFAULT).filter(a => a !== 'Todos').map(a => {
                const isSelected = selectedAnimals.includes(a);
                return (
                  <TouchableOpacity 
                    key={a} 
                    style={[styles.modalAnimalChip, isSelected && styles.modalAnimalChipActive]}
                    onPress={() => {
                      if (isSelected) {
                        setSelectedAnimals(selectedAnimals.filter(item => item !== a));
                      } else {
                        setSelectedAnimals([...selectedAnimals, a]);
                      }
                    }}
                  >
                    <Text style={[styles.modalAnimalChipText, isSelected && styles.modalAnimalChipTextActive]}>{a}</Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={14} color="#fff" />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              {editingItem && (
                <TouchableOpacity 
                  style={styles.modalDeleteBtn}
                  onPress={async () => {
                    if (!editingItem.id) return;
                    if (!confirm(`¿Estás seguro de eliminar esta ${selectedTab === 'Categorias' ? 'categoría' : 'marca'}?`)) return;
                    try {
                      setLoading(true);
                      const collectionName = selectedTab === 'Categorias' ? 'Categorias_name' : 'Marca_name';
                      await deleteDoc(doc(db, collectionName, editingItem.id));
                      setIsModalVisible(false);
                      setEditingItem(null);
                      setNewName('');
                      setSelectedAnimals([]);
                      setItemCategory('');
                      setDisponibilidad(true);
                    } catch (error) {
                      console.error("Error deleting item:", error);
                      alert("Error al eliminar");
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={[styles.modalSubmitBtn, { flex: 1 }, (!newName || (selectedTab === 'Categorias' && selectedAnimals.length === 0)) && { opacity: 0.5 }]}
                disabled={!newName || (selectedTab === 'Categorias' && selectedAnimals.length === 0) || loading}
                onPress={async () => {
                  if (!newName) return;
                  try {
                    setLoading(true);
                    const collectionName = selectedTab === 'Categorias' ? 'Categorias_name' : 'Marca_name';
                    
                    const data: any = {
                      nombre: newName,
                      disponibilidad,
                    };

                    if (selectedTab === 'Categorias') {
                      data.animales = selectedAnimals;
                      data.animal = selectedAnimals.length === 1 ? selectedAnimals[0] : 'Ambos';
                    } else {
                      // For Brands
                      data.Tipo_animal = selectedAnimals.length === 1 ? selectedAnimals[0] : (selectedAnimals.length > 1 ? 'Ambos' : '');
                      data.categoria = itemCategory;
                      data.animales = selectedAnimals; // Keep for consistency
                    }

                    if (editingItem) {
                      await updateDoc(doc(db, collectionName, editingItem.id), data);
                    } else {
                      await addDoc(collection(db, collectionName), {
                        ...data,
                        creadoEn: serverTimestamp()
                      });
                    }
                    
                    setIsModalVisible(false);
                    setEditingItem(null);
                    setNewName('');
                    setSelectedAnimals([]);
                    setItemCategory('');
                    setDisponibilidad(true);
                  } catch (error) {
                    console.error("Error saving item:", error);
                    alert("Error al guardar");
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>
                    {editingItem ? 'Guardar Cambios' : `Crear ${selectedTab === 'Categorias' ? 'Categoría' : 'Marca'}`}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  header: { 
    padding: 24, 
    backgroundColor: '#fff', 
    borderBottomWidth: 1, 
    borderBottomColor: '#F1F5F9',
    zIndex: 10
  },
  headerDesktop: { paddingHorizontal: 40, paddingTop: 32 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerTopMobile: { flexDirection: 'column', gap: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerLeftMobile: { width: '100%', justifyContent: 'center' },
  backBtn: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: '#F1F5F9' },
  backBtnMobile: { position: 'absolute', left: 0 },
  headerTitleText: { fontSize: 32, fontWeight: '900', color: '#0F172A', letterSpacing: -1 },
  headerTitleTextMobile: { fontSize: 24, textAlign: 'center' },
  addBtn: { 
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10B981', 
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  
  headerControls: { gap: 16 },
  searchBox: { 
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC',
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'web' ? 12 : 8, borderRadius: 12,
    borderWidth: 1, borderColor: '#F1F5F9'
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1E293B', outlineStyle: 'none' } as any,
  
  filterTabs: { flexDirection: 'row' },
  filterTabsContent: { gap: 8 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9' },
  filterTabActive: { backgroundColor: '#334155' },
  filterTabText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  filterTabTextActive: { color: '#fff' },

  listContent: { paddingHorizontal: 24, paddingBottom: 40 },
  row: { gap: 16, justifyContent: 'flex-start', marginBottom: 16 },
  
  categoryCard: { 
    flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 10, elevation: 1
  },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  categoryName: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  countBadge: { 
    alignSelf: 'flex-start', backgroundColor: '#F8FAFC', 
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#F1F5F9'
  },
  countText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  label: { fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  inactiveBadge: { backgroundColor: '#FEF2F2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#FEE2E2' },
  inactiveBadgeText: { fontSize: 9, fontWeight: '900', color: '#EF4444' },
  editIconBtn: { padding: 8, backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  fab: {
    position: 'absolute', bottom: 32, right: 24,
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#10B981', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 15, elevation: 8
  },

  /* Modal Styles */
  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)', // Darker subtle overlay
    justifyContent: 'center', alignItems: 'center', zIndex: 100,
    padding: 24
  },
  modalContent: {
    width: Platform.OS === 'web' ? 500 : '88%',
    backgroundColor: '#fff', borderRadius: 24, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 30, elevation: 20
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: { 
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 12, 
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#0F172A', marginBottom: 24,
    outlineStyle: 'none'
  } as any,
  modalSubmitBtn: { 
    backgroundColor: '#10B981', paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8
  },
  modalSubmitBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  modalDeleteBtn: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FEE2E2'
  },
  modalAnimalList: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  modalAnimalChip: { 
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    borderWidth: 1, borderColor: '#F1F5F9'
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  modalAnimalChipActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  modalAnimalChipText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  modalAnimalChipTextActive: { color: '#fff' },

  cardAnimals: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  animalTag: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  animalTagText: { fontSize: 11, fontWeight: '700', color: '#64748B' },

  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    gap: 4
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B'
  },
  tabBtnTextActive: {
    color: '#0F172A'
  },
  categoryPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20
  }
});
