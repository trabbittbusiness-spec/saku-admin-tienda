import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import ProductTypeSelectorModal from '../../components/ProductTypeSelectorModal';

const CATEGORIES = ['Todos', 'Alimento', 'Snacks', 'Accesorios', 'Higiene', 'Juguetes'];

const CAT_ICONS: Record<string, any> = {
  Alimento: 'fast-food-outline',
  Snacks: 'nutrition-outline',
  Accesorios: 'watch-outline',
  Higiene: 'medical-outline',
  Juguetes: 'basketball-outline',
};

const PAGE_SIZE = 18;

const STATUS_COLORS: Record<string, string> = {
  'Activo': '#10B981',
  'Bajo stock': '#F59E0B',
  'Agotado': '#EF4444',
};

const STATUS_BG_COLORS: Record<string, string> = {
  'Activo': '#DCFCE7',
  'Bajo stock': '#FEF3C7',
  'Agotado': '#FEE2E2',
};

export default function PromocionesScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 860;
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Dynamic Grid calculation
  const numColumns = width > 1600 ? 6 : width > 1200 ? 5 : width > 1000 ? 4 : 3;
  const simpleCardWidth = `${(100 / numColumns) - 1.5}%`;

  useEffect(() => {
    const q = query(collection(db, 'Products'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.nombre || 'Sin nombre',
          price: `$${(data.precio || 0).toLocaleString()}`,
          cat: data.categoria || 'Sin categoría',
          animal: data.animal || 'Ambos',
          tipo: data.Tipo || 'General',
          image: data.foto1 || '',
          stock: data.Cantidadcreada || 0,
          status: data.disponibilidad ? 'Activo' : 'Agotado',
          isPromoted: data.estadoPromocion || false,
        };
      });
      setProducts(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filtered = products.filter((p) => {
    const matchPromo = p.isPromoted; // ONLY PROMOTED
    const matchCat = activeCategory === 'Todos' || p.cat === activeCategory;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchPromo && matchCat && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const changeFilter = (f: string) => { setActiveCategory(f); setPage(1); };
  const changeSearch = (t: string) => { setSearch(t); setPage(1); };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#F59E0B" />
        <Text style={{ marginTop: 12, color: '#94A3B8', fontWeight: '600' }}>Cargando promociones...</Text>
      </View>
    );
  }

  if (isDesktop) {
    return (
      <View style={ds.bg}>
        <ScrollView style={ds.scroll} contentContainerStyle={ds.content} showsVerticalScrollIndicator={true}>
          <View style={ds.headerRow}>
            <View>
              <Text style={ds.pageTitle}>Promociones</Text>
              <Text style={ds.pageSubtitle}>{filtered.length} productos destacados</Text>
            </View>
            <View style={ds.headerActions}>
              <View style={[ds.headerSearch, isSearchFocused && ds.headerSearchFocused]}>
                <Ionicons name="search-outline" size={18} color="#94A3B8" />
                <TextInput
                  style={ds.searchInput}
                  placeholder="Buscar promociones..."
                  placeholderTextColor="#94A3B8"
                  value={search}
                  onChangeText={changeSearch}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                />
              </View>

              <View style={ds.headerChips}>
                {CATEGORIES.map((cat) => {
                  const isActive = activeCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[ds.catChip, isActive && ds.catChipActive]}
                      onPress={() => changeFilter(cat)}
                      activeOpacity={0.8}
                    >
                      <Text style={[ds.catText, isActive && ds.catTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={ds.grid}>
            {paginated.map((p) => {
              const statusColor = STATUS_COLORS[p.status] || '#94A3B8';
              const statusBg = STATUS_BG_COLORS[p.status] || '#F1F5F9';
              return (
                <TouchableOpacity 
                  key={p.id} 
                  style={[ds.card, { width: simpleCardWidth }]} 
                  activeOpacity={0.9} 
                  onPress={() => router.push(`/editar-producto/${p.id}?from=/promocion` as any)}
                >
                  <View style={ds.promoLabel}>
                    <Text style={ds.promoLabelText}>PROMOCIONADO</Text>
                  </View>
                  <View style={[ds.statusBadge, { backgroundColor: statusBg, top: 32 }]}>
                    <Text style={[ds.statusBadgeText, { color: statusColor }]}>{p.status}</Text>
                  </View>

                  <View style={ds.imgBox}>
                    {p.image ? (
                      <Image source={{ uri: p.image }} style={ds.productImg} resizeMode="cover" />
                    ) : (
                      <Ionicons name="cube-outline" size={40} color="#CBD5E1" />
                    )}
                  </View>

                  <View style={ds.cardBody}>
                    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
                      <View style={ds.tag}><Text style={ds.tagText}>{p.cat}</Text></View>
                      <View style={[ds.tag, { backgroundColor: '#EEF2FF' }]}><Text style={[ds.tagText, { color: '#6366F1' }]}>{p.animal}</Text></View>
                    </View>
                    <Text style={ds.cardName} numberOfLines={2}>{p.name}</Text>
                    <Text style={ds.cardTipo}>{p.tipo}</Text>
                    <View style={ds.priceRow}>
                      <Text style={ds.cardPrice}>{p.price}</Text>
                      <View style={ds.stockDotWrap}>
                        <View style={[ds.stockDot, { backgroundColor: statusColor }]} />
                        <Text style={ds.stockText}>{p.stock} uds.</Text>
                      </View>
                    </View>
                    <View style={ds.cardFooter}>
                      <TouchableOpacity style={ds.editBtn} onPress={() => router.push(`/editar-producto/${p.id}?from=/promocion` as any)}>
                        <Ionicons name="pencil-outline" size={16} color="#6366F1" />
                        <Text style={ds.editBtnText}>Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={ds.deleteBtn}>
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {paginated.length === 0 && (
            <View style={ds.emptyState}>
              <Ionicons name="pricetag-outline" size={48} color="#CBD5E1" />
              <Text style={ds.emptyText}>No hay productos en promoción</Text>
            </View>
          )}

          {totalPages > 1 && (
            <View style={ds.paginationRow}>
              <TouchableOpacity style={[ds.pageBtn, currentPage === 1 && ds.pageBtnDisabled]} onPress={() => setPage(currentPage - 1)} disabled={currentPage === 1} activeOpacity={0.7}>
                <Ionicons name="chevron-back" size={18} color={currentPage === 1 ? '#CBD5E1' : '#0F172A'} />
              </TouchableOpacity>
              <Text style={ds.pageLabel}>Página {currentPage} de {totalPages}</Text>
              <TouchableOpacity style={[ds.pageBtn, currentPage === totalPages && ds.pageBtnDisabled]} onPress={() => setPage(currentPage + 1)} disabled={currentPage === totalPages} activeOpacity={0.7}>
                <Ionicons name="chevron-forward" size={18} color={currentPage === totalPages ? '#CBD5E1' : '#0F172A'} />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
        <ProductTypeSelectorModal visible={showTypeSelector} onClose={() => setShowTypeSelector(false)} from="/promocion" />
      </View>
    );
  }

  return (
    <SafeAreaView style={ms.bg} edges={['top']}>
      <View style={ms.header}>
        <View style={[ms.headerSearch, isSearchFocused && ms.headerSearchFocused]}>
          <Ionicons name="search-outline" size={16} color="#94A3B8" />
          <TextInput
            style={ms.searchInput}
            placeholder="Buscar..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={changeSearch}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => changeSearch('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ms.catScroll} contentContainerStyle={ms.catContent}>
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <TouchableOpacity key={cat} style={[ms.catChip, isActive && ms.catChipActive]} onPress={() => changeFilter(cat)} activeOpacity={0.8}>
              {isActive ? <Ionicons name="checkmark" size={12} color="#fff" /> : (cat !== 'Todos' && <Ionicons name={CAT_ICONS[cat]} size={12} color="#64748B" />)}
              <Text style={[ms.catText, isActive && ms.catTextActive]}>{cat}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView style={ms.listScroll} contentContainerStyle={ms.listContent} showsVerticalScrollIndicator={false}>
        {paginated.map((p) => {
          return (
            <TouchableOpacity 
              key={p.id} 
              style={ms.card} 
              activeOpacity={0.9} 
              onPress={() => router.push(`/editar-producto/${p.id}?from=/promocion` as any)}
            >
              <View style={[ms.accentBar, { backgroundColor: '#F59E0B' }]} />
              <View style={ms.imgBox}>
                {p.image ? (
                  <Image source={{ uri: p.image }} style={ms.productImg} resizeMode="cover" />
                ) : (
                  <Ionicons name="cube-outline" size={24} color="#CBD5E1" />
                )}
              </View>
              <View style={ms.cardInfo}>
                <View style={ms.cardTop}>
                  <Text style={ms.cardName} numberOfLines={1}>🔥 {p.name}</Text>
                  <View style={[ms.statusPill, { backgroundColor: '#FFF7ED' }]}>
                    <Text style={[ms.statusPillText, { color: '#F59E0B' }]}>PROMO</Text>
                  </View>
                </View>
                
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, marginBottom: 8 }}>
                  <Text style={ms.cardCat}>{p.cat}</Text>
                  <Text style={[ms.cardCat, { color: '#6366F1' }]}>• {p.animal}</Text>
                </View>
                
                <Text style={ms.cardTipoMobile}>{p.tipo}</Text>
                
                <View style={ms.cardBot}>
                  <Text style={ms.cardPrice}>{p.price}</Text>
                  <Text style={ms.cardStock}>Stock: {p.stock}</Text>
                </View>
              </View>

              <View style={ms.cardActions}>
                <TouchableOpacity style={ms.actionBtn}>
                  <Ionicons name="pencil-outline" size={16} color="#6366F1" />
                </TouchableOpacity>
                <TouchableOpacity style={[ms.actionBtn, ms.actionBtnDanger]}>
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}

        {paginated.length === 0 && (
          <View style={ms.emptyState}>
            <Ionicons name="pricetag-outline" size={44} color="#CBD5E1" />
            <Text style={ms.emptyText}>No hay productos en promoción</Text>
          </View>
        )}
        {totalPages > 1 && (
          <View style={ms.paginationRow}>
            <TouchableOpacity style={[ms.pageBtn, currentPage === 1 && ms.pageBtnDisabled]} onPress={() => setPage(currentPage - 1)} disabled={currentPage === 1} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={20} color={currentPage === 1 ? '#CBD5E1' : '#0F172A'} />
            </TouchableOpacity>
            <Text style={ms.pageLabel}>Página {currentPage} de {totalPages}</Text>
            <TouchableOpacity style={[ms.pageBtn, currentPage === totalPages && ms.pageBtnDisabled]} onPress={() => setPage(currentPage + 1)} disabled={currentPage === totalPages} activeOpacity={0.7}>
              <Ionicons name="chevron-forward" size={20} color={currentPage === totalPages ? '#CBD5E1' : '#0F172A'} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const ds = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { flex: 1 },
  content: { padding: 32, paddingBottom: 60, width: '100%' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  pageTitle: { fontSize: 26, fontWeight: '900', color: '#0F172A', letterSpacing: -1 },
  pageSubtitle: { fontSize: 13, color: '#64748B', fontWeight: '500', marginTop: 4 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F59E0B', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerSearch: { width: 220, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 },
  headerSearchFocused: { borderColor: '#F59E0B', shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.1, shadowRadius: 10, backgroundColor: '#fff' },
  headerChips: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  catChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0' },
  catChipActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  catText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  catTextActive: { color: '#fff' },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A', outlineStyle: 'none' } as any,
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.02, shadowRadius: 10 },
  promoLabel: { backgroundColor: '#F59E0B', position: 'absolute', top: 8, left: 8, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5, zIndex: 11 },
  promoLabelText: { color: '#fff', fontSize: 8, fontWeight: '900' },
  statusBadge: { position: 'absolute', right: 8, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, zIndex: 10 },
  statusBadgeText: { fontSize: 9, fontWeight: '800' },
  imgBox: { height: 140, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC' },
  productImg: { width: '100%', height: '100%' },
  cardBody: { padding: 12 },
  tag: { backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5 },
  tagText: { fontSize: 8, fontWeight: '800', color: '#64748B', textTransform: 'uppercase' },
  cardCat: { fontSize: 8, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  cardName: { fontSize: 12, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  cardTipo: { fontSize: 10, color: '#64748B', marginBottom: 8, fontWeight: '500' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardPrice: { fontSize: 15, fontWeight: '900', color: '#0F172A' },
  stockDotWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stockDot: { width: 6, height: 6, borderRadius: 3 },
  stockText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  paginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 32, borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 24 },
  pageBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  pageBtnDisabled: { backgroundColor: '#F8FAFC', borderColor: '#F1F5F9' },
  pageLabel: { fontSize: 13, fontWeight: '700', color: '#475569' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 8 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F5F7FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  editBtnText: { fontSize: 11, fontWeight: '700', color: '#6366F1' },
  deleteBtn: { width: 26, height: 26, borderRadius: 6, backgroundColor: '#FFF5F5', alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 80, width: '100%' },
  emptyText: { fontSize: 16, color: '#94A3B8', fontWeight: '600', marginTop: 16 },
});

const ms = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#ffffff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, gap: 10 },
  headerSearch: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 },
  headerSearchFocused: { borderColor: '#F59E0B', shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.1, shadowRadius: 8, backgroundColor: '#fff' },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A', outlineStyle: 'none' } as any,
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F59E0B', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  catScroll: { marginBottom: 12, maxHeight: 52 },
  catContent: { paddingHorizontal: 20, gap: 10, alignItems: 'center' },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', alignSelf: 'flex-start' },
  catChipActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  catText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  catTextActive: { color: '#fff', fontWeight: '800' },
  listScroll: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 100, gap: 12 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8 },
  accentBar: { width: 3 },
  imgBox: { width: 64, height: 64, margin: 10, borderRadius: 10, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  productImg: { width: '100%', height: '100%' },
  cardInfo: { flex: 1, paddingVertical: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingRight: 8, marginBottom: 1 },
  cardName: { fontSize: 12, fontWeight: '800', color: '#0F172A', flex: 1 },
  statusPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, marginLeft: 6 },
  statusPillText: { fontSize: 8, fontWeight: '800' },
  cardCat: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },
  cardTipoMobile: { fontSize: 11, color: '#64748B', marginBottom: 4 },
  cardBot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 8 },
  cardPrice: { fontSize: 14, fontWeight: '900', color: '#0F172A' },
  cardStock: { fontSize: 11, color: '#64748B', fontWeight: '600' },
  cardActions: { gap: 8, padding: 10, justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#F1F5F9' },
  actionBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#F5F7FF', alignItems: 'center', justifyContent: 'center' },
  actionBtnDanger: { backgroundColor: '#FFF5F5' },
  emptyState: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { marginTop: 12, fontSize: 15, color: '#94A3B8', fontWeight: '600' },
  paginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, paddingVertical: 20 },
  pageBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  pageBtnDisabled: { backgroundColor: '#FAFAFA', borderColor: '#F1F5F9' },
  pageLabel: { fontSize: 15, fontWeight: '700', color: '#475569' },
});
