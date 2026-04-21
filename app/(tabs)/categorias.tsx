import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const ANIMALS = ['Todos', 'Perro', 'Gato', 'Exótico'];

// Datos iniciales sin iconos como pidió el usuario
const INITIAL_CATEGORIES = [
  { id: '1', name: 'Alimento', count: 45, animal: 'Todos' },
  { id: '2', name: 'Juguetes', count: 12, animal: 'Perro' },
  { id: '3', name: 'Higiene', count: 8, animal: 'Gato' },
  { id: '4', name: 'Salud', count: 20, animal: 'Todos' },
  { id: '5', name: 'Accesorios', count: 15, animal: 'Todos' },
  { id: '6', name: 'Habitats', count: 5, animal: 'Exótico' },
];

export default function CategoriasScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 860;
  
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const filteredData = INITIAL_CATEGORIES.filter(c => 
    (filter === 'Todos' || c.animal === filter || c.animal === 'Todos') &&
    c.name.toLowerCase().includes(search.toLowerCase())
  );

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
            <Text style={[styles.headerTitleText, !isDesktop && styles.headerTitleTextMobile]}>Categorías</Text>
          </View>
        </View>

        {isDesktop && (
          <TouchableOpacity 
            style={styles.addBtn} 
            activeOpacity={0.8}
            onPress={() => setIsModalVisible(true)}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Nueva Categoría</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.headerControls}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar categorías..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.filterTabs}
          contentContainerStyle={styles.filterTabsContent}
        >
          {ANIMALS.map(a => (
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
    <TouchableOpacity style={styles.categoryCard} activeOpacity={0.7}>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.label}>Categoría</Text>
            <Text style={styles.categoryName} numberOfLines={1}>{item.name}</Text>
          </View>
          <TouchableOpacity style={styles.moreBtn}>
             <Ionicons name="ellipsis-vertical" size={20} color="#94A3B8" />
          </TouchableOpacity>
        </View>
        <View style={styles.countBadge}>
          <Ionicons name="layers-outline" size={14} color="#64748B" />
          <Text style={styles.countText}>{item.count} Productos</Text>
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
        contentContainerStyle={styles.listContent}
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

      {/* Modal Nueva Categoría */}
      {isModalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nueva Categoría</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.inputLabel}>Nombre de la Categoría</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ej. Alimento Premium"
              value={newCatName}
              onChangeText={setNewCatName}
              autoFocus
            />

            <TouchableOpacity 
              style={styles.modalSubmitBtn}
              onPress={() => {
                // Aquí iría la lógica de guardado
                setIsModalVisible(false);
                setNewCatName('');
              }}
            >
              <Text style={styles.modalSubmitBtnText}>Crear Categoría</Text>
            </TouchableOpacity>
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

  listContent: { padding: 20, paddingBottom: 40 },
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
  moreBtn: { padding: 4 },
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
    padding: 20
  },
  modalContent: {
    width: Platform.OS === 'web' ? 400 : '100%',
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
});
