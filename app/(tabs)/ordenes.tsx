import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, useWindowDimensions, Platform, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { collection, query, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

// ─── Choice Chip Filters (from saku-tienda-web) ─────────
const FILTERS = ['Entregado', 'En proceso', 'Cancelado'];

const PAGE_SIZE = 6;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; bg: string; dot: string }> = {
  'En proceso': { label: 'En proceso', color: '#6366F1', bg: '#EEF2FF', dot: '#6366F1', icon: 'time-outline' },
  'Entregado':  { label: 'Entregado',  color: '#10B981', bg: '#DCFCE7', dot: '#10B981', icon: 'checkmark-circle-outline' },
  'Cancelado':  { label: 'Cancelado',  color: '#EF4444', bg: '#FEE2E2', dot: '#EF4444', icon: 'close-circle-outline' },
};

// Date Formatter
const formatDate = (ts: any) => {
  if (!ts) return '';
  const date = ts instanceof Timestamp ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Map DB status to UI status
const mapToUIStatus = (dbStatus: string) => {
  if (dbStatus === 'Procesando' || dbStatus === 'En camino') return 'En proceso';
  return dbStatus || 'En proceso';
};

// ─── Order Detail Panel ─────────────────────────────────
function OrderDetailPanel({ order, onClose }: { order: any; onClose: () => void }) {
  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG['En proceso'];
  
  const ITEMS_MOCK = [
    { name: 'Alimento Premium Perro', qty: 1, price: '$320', image: '🐶' },
    { name: 'Juguete Mordedor', qty: 2, price: '$130', image: '🦴' },
    { name: 'Vitaminas Caninas', qty: 1, price: '$180', image: '💊' },
  ].slice(0, order.items);

  return (
    <View style={detail.container}>
      {/* Header */}
      <View style={detail.header}>
        <View style={{ flex: 1 }}>
          <Text style={detail.orderId}>{order.id}</Text>
          <Text style={detail.orderDate}>{order.date}</Text>
        </View>
        <View style={[detail.statusBadge, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={14} color={cfg.color} />
          <Text style={[detail.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={detail.closeBtn}>
          <Ionicons name="close" size={20} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Client Info */}
        <View style={detail.section}>
          <Text style={detail.sectionTitle}>CLIENTE</Text>
          <View style={detail.infoCard}>
            <View style={detail.infoRow}>
              <Ionicons name="person-outline" size={16} color="#6366F1" />
              <Text style={detail.infoText}>{order.client}</Text>
            </View>
            <View style={detail.infoRow}>
              <Ionicons name="call-outline" size={16} color="#6366F1" />
              <Text style={detail.infoText}>{order.phone}</Text>
            </View>
            <View style={detail.infoRow}>
              <Ionicons name="mail-outline" size={16} color="#6366F1" />
              <Text style={detail.infoText}>{order.email}</Text>
            </View>
          </View>
        </View>

        {/* Delivery Info */}
        <View style={detail.section}>
          <Text style={detail.sectionTitle}>ENTREGA</Text>
          <View style={detail.infoCard}>
            <View style={detail.infoRow}>
              <Ionicons name={order.type === 'pickup' ? 'storefront-outline' : 'bicycle-outline'} size={16} color="#6366F1" />
              <Text style={detail.infoText}>{order.type === 'pickup' ? 'Retiro en tienda' : 'Delivery'}</Text>
            </View>
            <View style={detail.infoRow}>
              <Ionicons name="location-outline" size={16} color="#6366F1" />
              <Text style={detail.infoText}>{order.address}</Text>
            </View>
            {order.note ? (
              <View style={detail.infoRow}>
                <Ionicons name="chatbubble-outline" size={16} color="#6366F1" />
                <Text style={detail.infoText}>{order.note}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Products */}
        <View style={detail.section}>
          <Text style={detail.sectionTitle}>PRODUCTOS ({order.items})</Text>
          {ITEMS_MOCK.map((item, i) => (
            <View key={i} style={detail.productRow}>
              <View style={detail.productEmoji}><Text style={{ fontSize: 22 }}>{item.image}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={detail.productName}>{item.name}</Text>
                <Text style={detail.productQty}>Qty: {item.qty}</Text>
              </View>
              <Text style={detail.productPrice}>{item.price}</Text>
            </View>
          ))}
        </View>

        {/* Total */}
        <View style={detail.totalRow}>
          <Text style={detail.totalLabel}>Total de la orden</Text>
          <Text style={detail.totalAmount}>{order.amount}</Text>
        </View>

        {/* Status Actions */}
        <View style={detail.section}>
          <Text style={detail.sectionTitle}>CAMBIAR ESTADO</Text>
          <View style={detail.actionGrid}>
            {['En proceso', 'Entregado', 'Cancelado'].map(s => {
              const c = STATUS_CONFIG[s];
              const active = order.status === s;
              return (
                <TouchableOpacity key={s} style={[detail.actionChip, active && { backgroundColor: c.bg, borderColor: c.color }]} activeOpacity={0.7}>
                  <Ionicons name={c.icon} size={16} color={active ? c.color : '#94A3B8'} />
                  <Text style={[detail.actionChipText, active && { color: c.color }]}>{c.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────
export default function OrdenesScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 860;
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('Entregado');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'Orden'), orderBy('fechaCreacion', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: data.ID_orden || doc.id,
          client: data.nombre || 'Sin nombre',
          items: (data.listPRODUCTS || []).length,
          amount: `$${(data.amount || 0).toLocaleString()}`,
          status: mapToUIStatus(data.estado),
          date: formatDate(data.fechaCreacion),
          address: data.direccion || '',
          phone: data.numerodetelefono || '',
          email: '',
          type: data.direccion ? 'delivery' : 'pickup',
          note: data.puntodereferencia || '',
        };
      });
      setOrders(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filtered = orders.filter((o) => {
    const matchFilter = o.status === activeFilter;
    const matchSearch = search === '' || o.id.toLowerCase().includes(search.toLowerCase()) || o.client.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const changeFilter = (f: string) => { setActiveFilter(f); setPage(1); };
  const changeSearch = (t: string) => { setSearch(t); setPage(1); };

  // ── CHOICE CHIPS BAR (shared) ──────────────────────
  const FilterChips = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
      {FILTERS.map((f) => {
        const count = orders.filter(o => o.status === f).length;
        const active = activeFilter === f;
        return (
          <TouchableOpacity key={f} style={[chip.pill, active && chip.pillActive]} onPress={() => changeFilter(f)} activeOpacity={0.7}>
            <Text style={[chip.text, active && chip.textActive]}>{f}</Text>
            <View style={[chip.badge, { backgroundColor: active ? 'rgba(255,255,255,0.25)' : '#E2E8F0' }]}>
              <Text style={[chip.badgeText, { color: active ? '#fff' : '#64748B' }]}>{count}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  // ── LOADING ───────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={{ marginTop: 12, color: '#94A3B8', fontWeight: '600' }}>Cargando órdenes...</Text>
      </View>
    );
  }

  // ── DESKTOP ───────────────────────────────────────
  if (isDesktop) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={ds.content} showsVerticalScrollIndicator>
            {/* Header */}
            <View style={ds.headerRow}>
              <View>
                <Text style={ds.pageTitle}>Gestión de Órdenes</Text>
                <Text style={ds.pageSubtitle}>Listado completo de pedidos y operaciones de la tienda.</Text>
              </View>
              <TouchableOpacity style={ds.codeBtn} activeOpacity={0.8}>
                <Ionicons name="keypad" size={18} color="#fff" />
                <Text style={ds.codeBtnText}>Código Manual</Text>
              </TouchableOpacity>
            </View>

            {/* Control Bar */}
            <View style={ds.controlBar}>
              <View style={[ds.searchBox, isSearchFocused && { borderColor: '#6366F1', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.1, shadowRadius: 8 }]}>
                <Ionicons name="search-outline" size={18} color={isSearchFocused ? '#6366F1' : '#94A3B8'} />
                <TextInput
                  style={ds.searchInput}
                  placeholder="Buscar cliente o ID..."
                  placeholderTextColor="#94A3B8"
                  value={search}
                  onChangeText={changeSearch}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                />
              </View>
              <FilterChips />
            </View>

            {/* Table */}
            <View style={ds.tableWrap}>
              <View style={ds.tableHeaderRow}>
                <Text style={[ds.th, { flex: 1.5 }]}>Fecha</Text>
                <Text style={[ds.th, { flex: 2 }]}>Cliente</Text>
                <Text style={[ds.th, { flex: 1.2 }]}>Monto</Text>
                <Text style={[ds.th, { flex: 1.4 }]}>Estado</Text>
                <Text style={[ds.th, { width: 60, textAlign: 'center' }]}>Ver</Text>
              </View>

              {paginated.map((order, idx) => {
                const cfg = STATUS_CONFIG[order.status];
                return (
                  <TouchableOpacity
                    key={order.id}
                    style={[ds.tableRow, idx === paginated.length - 1 && { borderBottomWidth: 0 }]}
                    onPress={() => router.push(`/orden/${encodeURIComponent(order.id)}?from=/ordenes` as any)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1.5 }}><Text style={ds.td}>{order.date}</Text></View>
                    <View style={{ flex: 2, paddingRight: 12 }}>
                      <Text style={ds.tdBold}>{order.client}</Text>
                      <Text style={ds.tdSub} numberOfLines={1}>{order.address}</Text>
                    </View>
                    <View style={{ flex: 1.2 }}>
                      <Text style={ds.tdBold}>{order.amount}</Text>
                      <Text style={ds.tdSub}>{order.items} producto(s)</Text>
                    </View>
                    <View style={{ flex: 1.4, alignItems: 'flex-start' }}>
                      <View style={[ds.statusBadge, { backgroundColor: cfg.bg }]}>
                        <Ionicons name={cfg.icon} size={13} color={cfg.color} />
                        <Text style={[ds.statusText, { color: cfg.color }]}>{order.status}</Text>
                      </View>
                    </View>
                    <View style={{ width: 60, alignItems: 'center' }}>
                      <View style={ds.actionBtn}>
                        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {paginated.length === 0 && (
                <View style={ds.emptyState}>
                  <Ionicons name="search-outline" size={40} color="#CBD5E1" />
                  <Text style={ds.emptyStateText}>No se encontraron órdenes</Text>
                </View>
              )}

              <View style={ds.paginationRow}>
                <TouchableOpacity style={[ds.pageBtn, currentPage === 1 && ds.pageBtnDisabled]} onPress={() => setPage(currentPage - 1)} disabled={currentPage === 1} activeOpacity={0.7}>
                  <Ionicons name="chevron-back" size={18} color={currentPage === 1 ? '#CBD5E1' : '#0F172A'} />
                </TouchableOpacity>
                <Text style={ds.pageLabel}>Página {currentPage} de {totalPages}</Text>
                <TouchableOpacity style={[ds.pageBtn, currentPage === totalPages && ds.pageBtnDisabled]} onPress={() => setPage(currentPage + 1)} disabled={currentPage === totalPages} activeOpacity={0.7}>
                  <Ionicons name="chevron-forward" size={18} color={currentPage === totalPages ? '#CBD5E1' : '#0F172A'} />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    );
  }

  // ── MOBILE ────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }} edges={['top']}>
      {/* Top Header */}
      <View style={ms.topHeader}>
        <Text style={ms.mobileTitle}>Órdenes</Text>
        <TouchableOpacity style={ms.qrBtn} activeOpacity={0.8}>
          <Ionicons name="qr-code-outline" size={20} color="#fff" />
          <Text style={ms.qrBtnText}>Escanear QR</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
        <View style={[ms.searchBox, isSearchFocused && { borderColor: '#6366F1', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.1, shadowRadius: 8 }]}>
          <Ionicons name="search-outline" size={20} color={isSearchFocused ? '#6366F1' : '#94A3B8'} />
          <TextInput
            style={ms.searchInput}
            placeholder="Buscar ID de orden o cliente..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={changeSearch}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
          {search.length > 0 && <TouchableOpacity onPress={() => changeSearch('')}><Ionicons name="close-circle" size={18} color="#CBD5E1" /></TouchableOpacity>}
        </View>
      </View>

      {/* Filter Chips */}
      <View style={{ marginBottom: 12, paddingLeft: 20 }}>
        <FilterChips />
      </View>

      {/* Orders List */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, gap: 14 }} showsVerticalScrollIndicator={false}>
        {paginated.map((order) => {
          const cfg = STATUS_CONFIG[order.status];
          return (
            <TouchableOpacity key={order.id} style={ms.card} activeOpacity={0.9} onPress={() => router.push(`/orden/${encodeURIComponent(order.id)}?from=/ordenes` as any)}>
              <View style={ms.cardTop}>
                <View style={ms.cardIdentity}>
                  <View style={[ms.cardIconWrap, { backgroundColor: cfg.bg }]}>
                    <Ionicons name={cfg.icon} size={18} color={cfg.color} />
                  </View>
                  <View>
                    <Text style={ms.cardDate}>{order.date}</Text>
                  </View>
                </View>
                <Text style={ms.cardAmount}>{order.amount}</Text>
              </View>
              <View style={ms.cardMid}>
                <Text style={ms.clientName}>{order.client}</Text>
                <Text style={ms.clientAddress} numberOfLines={1}>{order.address}</Text>
              </View>
              <View style={ms.cardBot}>
                <View style={[ms.statusBadge, { backgroundColor: cfg.bg }]}>
                  <Text style={[ms.statusText, { color: cfg.color }]}>{order.status}</Text>
                </View>
                <Text style={ms.itemCount}>{order.items} producto(s)</Text>
              </View>
            </TouchableOpacity>
          );
        })}
        {paginated.length === 0 && (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Text style={{ fontSize: 15, color: '#94A3B8', fontWeight: '500' }}>Sin resultados</Text>
          </View>
        )}
        <View style={ms.paginationRow}>
          <TouchableOpacity style={[ms.pageBtn, currentPage === 1 && ms.pageBtnDisabled]} onPress={() => setPage(currentPage - 1)} disabled={currentPage === 1} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={20} color={currentPage === 1 ? '#CBD5E1' : '#0F172A'} />
          </TouchableOpacity>
          <Text style={ms.pageLabel}>Página {currentPage} de {totalPages}</Text>
          <TouchableOpacity style={[ms.pageBtn, currentPage === totalPages && ms.pageBtnDisabled]} onPress={() => setPage(currentPage + 1)} disabled={currentPage === totalPages} activeOpacity={0.7}>
            <Ionicons name="chevron-forward" size={20} color={currentPage === totalPages ? '#CBD5E1' : '#0F172A'} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Choice Chip Styles ──────────────────────────────────
const chip = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 100, backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#E2E8F0' },
  pillActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  text: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  textActive: { color: '#fff' },
  badge: { borderRadius: 100, paddingHorizontal: 6, paddingVertical: 1 },
  badgeText: { fontSize: 11, fontWeight: '800' },
});

// ─── Order Detail Styles ─────────────────────────────────
const detail = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 12 },
  orderId: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  orderDate: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '800' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  section: { paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: { fontSize: 10, fontWeight: '900', color: '#94A3B8', letterSpacing: 1.5, marginBottom: 10 },
  infoCard: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, gap: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { fontSize: 14, color: '#1E293B', fontWeight: '500', flex: 1 },
  productRow: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#F8FAFC', borderRadius: 14, marginBottom: 8, gap: 12 },
  productEmoji: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  productName: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  productQty: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  productPrice: { fontSize: 14, fontWeight: '800', color: '#6366F1' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, marginTop: 16, padding: 16, backgroundColor: '#0F172A', borderRadius: 16 },
  totalLabel: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  totalAmount: { fontSize: 20, fontWeight: '900', color: '#fff' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0' },
  actionChipText: { fontSize: 13, fontWeight: '700', color: '#94A3B8' },
});

// ─── Desktop Styles ──────────────────────────────────────
const ds = StyleSheet.create({
  content: { padding: 32, alignSelf: 'center', width: '100%', maxWidth: 1400 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  pageTitle: { fontSize: 26, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5, marginBottom: 4 },
  pageSubtitle: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  codeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 8 },
  codeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  controlBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 8 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, width: 280, borderWidth: 1, borderColor: '#E2E8F0', gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A', outlineStyle: 'none', borderWidth: 0 } as any,
  tableWrap: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 12, paddingBottom: 4 },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#F8FAFC', paddingVertical: 14, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  th: { fontSize: 11, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { flexDirection: 'row', paddingVertical: 16, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#F8FAFC', alignItems: 'center' },
  tableRowSelected: { backgroundColor: '#F8FAFF' },
  td: { fontSize: 14, color: '#475569', fontWeight: '500' },
  tdBold: { fontSize: 14, color: '#0F172A', fontWeight: '800', marginBottom: 2 },
  tdSub: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
  statusText: { fontSize: 11, fontWeight: '800' },
  actionBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  emptyState: { padding: 48, alignItems: 'center', justifyContent: 'center' },
  emptyStateText: { marginTop: 12, fontSize: 14, color: '#94A3B8', fontWeight: '600' },
  paginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  pageBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  pageBtnDisabled: { backgroundColor: '#fff', borderColor: '#F1F5F9' },
  pageLabel: { fontSize: 13, fontWeight: '700', color: '#475569' },
});

// ─── Mobile Styles ───────────────────────────────────────
const ms = StyleSheet.create({
  topHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  mobileTitle: { fontSize: 26, fontWeight: '800', color: '#0F172A' },
  qrBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#6366F1', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 },
  qrBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4 },
  searchInput: { flex: 1, fontSize: 15, color: '#0F172A', outlineStyle: 'none', borderWidth: 0 } as any,
  card: { backgroundColor: '#ffffff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  cardIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardId: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  cardDate: { fontSize: 12, color: '#64748B', fontWeight: '500' },
  cardAmount: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  cardMid: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 14 },
  clientName: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  clientAddress: { fontSize: 13, color: '#64748B' },
  cardBot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  statusText: { fontSize: 12, fontWeight: '800' },
  itemCount: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  paginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, paddingVertical: 20 },
  pageBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  pageBtnDisabled: { backgroundColor: '#FAFAFA', borderColor: '#F1F5F9' },
  pageLabel: { fontSize: 15, fontWeight: '700', color: '#475569' },
});
