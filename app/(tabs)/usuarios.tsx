import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  useWindowDimensions, Platform, ActivityIndicator, Image, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { collection, query, onSnapshot, where, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface UserData {
  id: string;
  display_name?: string;
  apellido?: string;
  email?: string;
  phone_number?: string;
  photoURL?: string;
  isAdmin?: boolean;
  createdAt?: any;
}

function UserDetailModal({ user, onClose, isDesktop }: { user: UserData | null; onClose: () => void; isDesktop: boolean }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoadingOrders(true);
    const userRef = doc(db, 'users', user.id);
    const q = query(collection(db, 'Orden'), where('creador', '==', userRef));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          displayId: data.codigoRetiro || data.ID_orden || d.id,
          total: data.total || 0,
          status: data.estado || 'Pendiente',
          date: data.fechaCreacion || '',
          items: (data.items || []).length,
        };
      });
      list.sort((a, b) => (b.date > a.date ? 1 : -1));
      setOrders(list);
      setLoadingOrders(false);
    }, () => setLoadingOrders(false));
    return () => unsub();
  }, [user]);

  if (!user) return null;

  const fullName = `${user.display_name || ''} ${user.apellido || ''}`.trim() || 'Sin nombre';
  const initials = fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  const totalSpent = orders.reduce((s, o) => s + (o.total || 0), 0);

  const statusColor: Record<string, string> = {
    entregado: '#63348C', enviado: '#63348C', pendiente: '#F59E0B', cancelado: '#EF4444',
  };

  const panel = (
    <View style={[md.panel, isDesktop && md.panelDesktop]}>
      {/* Header gradient bar */}
      <View style={md.heroBar}>
        <TouchableOpacity onPress={onClose} style={md.closeBtn}>
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Avatar overlapping hero */}
      <View style={md.avatarWrap}>
        {user.photoURL ? (
          <Image source={{ uri: user.photoURL }} style={md.avatar} />
        ) : (
          <View style={[md.avatar, md.avatarFallback]}>
            <Text style={md.avatarText}>{initials}</Text>
          </View>
        )}
        <View style={md.onlineDot} />
      </View>

      <ScrollView contentContainerStyle={md.body} showsVerticalScrollIndicator={false}>
        {/* Name */}
        <Text style={md.name}>{fullName}</Text>
        <Text style={md.uid} numberOfLines={1}>ID: {user.id}</Text>

        {/* Stats Row */}
        <View style={md.statsRow}>
          <View style={md.statBox}>
            <Text style={md.statNum}>{orders.length}</Text>
            <Text style={md.statLbl}>Órdenes</Text>
          </View>
          <View style={md.statDivider} />
          <View style={md.statBox}>
            <Text style={md.statNum}>${totalSpent.toLocaleString("de-DE")}</Text>
            <Text style={md.statLbl}>Total Gastado</Text>
          </View>
          <View style={md.statDivider} />
          <View style={md.statBox}>
            <Text style={md.statNum}>{orders.filter(o => (o.status||'').toLowerCase() === 'entregado').length}</Text>
            <Text style={md.statLbl}>Completadas</Text>
          </View>
        </View>

        {/* Contact Info */}
        <View style={md.section}>
          <Text style={md.sectionTitle}>CONTACTO</Text>
          <View style={md.infoCard}>
            {[
              { icon: 'mail-outline', label: 'Email', value: user.email || 'No registrado' },
              { icon: 'call-outline', label: 'Teléfono', value: user.phone_number || 'No registrado' },
            ].map(({ icon, label, value }) => (
              <View key={label} style={md.infoRow}>
                <View style={md.infoIcon}>
                  <Ionicons name={icon as any} size={16} color="#63348C" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={md.infoLabel}>{label}</Text>
                  <Text style={md.infoValue} numberOfLines={1}>{value}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Orders */}
        <View style={md.section}>
          <Text style={md.sectionTitle}>HISTORIAL DE ÓRDENES</Text>
          {loadingOrders ? (
            <ActivityIndicator size="small" color="#63348C" style={{ marginVertical: 20 }} />
          ) : orders.length === 0 ? (
            <View style={md.emptyOrders}>
              <Ionicons name="bag-outline" size={36} color="#CBD5E1" />
              <Text style={md.emptyOrdersText}>Sin órdenes registradas</Text>
            </View>
          ) : (
            orders.slice(0, 8).map(o => {
              const sc = statusColor[(o.status || '').toLowerCase()] || '#9CA3AF';
              return (
                <TouchableOpacity
                  key={o.id}
                  style={md.orderRow}
                  onPress={() => { onClose(); router.push(`/orden/${encodeURIComponent(o.id)}` as any); }}
                  activeOpacity={0.8}
                >
                  <View style={[md.orderDot, { backgroundColor: sc }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={md.orderId} numberOfLines={1}>#{o.displayId}</Text>
                    <Text style={md.orderSub}>{o.items} producto{o.items !== 1 ? 's' : ''}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={md.orderTotal}>${o.total.toLocaleString("de-DE")}</Text>
                    <View style={[md.orderStatus, { backgroundColor: sc + '20' }]}>
                      <Text style={[md.orderStatusText, { color: sc }]}>{o.status}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color="#CBD5E1" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Action Buttons */}
        <View style={md.actions}>
          <TouchableOpacity
            style={md.actionPrimary}
            onPress={() => { if (user.email) { const url = `mailto:${user.email}`; if (Platform.OS === 'web') window.open(url); } }}
          >
            <Ionicons name="mail" size={16} color="#fff" />
            <Text style={md.actionPrimaryText}>Enviar Email</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );

  if (isDesktop) {
    return (
      <Modal visible={!!user} transparent animationType="fade" onRequestClose={onClose}>
        <TouchableOpacity style={md.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={md.desktopWrapper}>{panel}</View>
      </Modal>
    );
  }

  return (
    <Modal visible={!!user} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={md.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={md.mobileWrapper}>{panel}</View>
    </Modal>
  );
}

export default function UsuariosScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 860;

  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [focused, setFocused] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const PAGE_SIZE = 12;

  const getNumColumns = () => {
    if (!isDesktop) return 1;
    if (width > 1500) return 5;
    if (width > 1200) return 4;
    return 3;
  };
  const numColumns = getNumColumns();
  const cardWidth = isDesktop ? `${(100 / numColumns) - 1.5}%` : '100%';

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserData));
      const nonAdmins = list.filter(u => u.isAdmin !== true);
      setUsers(nonAdmins);
      setFilteredUsers(nonAdmins);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const f = users.filter(u => {
      const q = search.toLowerCase();
      return (u.display_name || '').toLowerCase().includes(q) ||
        (u.apellido || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phone_number || '').includes(search);
    });
    setFilteredUsers(f);
    setPage(1);
  }, [search, users]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPageUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const renderUserCard = (user: UserData) => {
    const fullName = `${user.display_name || ''} ${user.apellido || ''}`.trim() || 'Sin nombre';
    const initials = fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    return (
      <View key={user.id} style={[styles.userCard, { width: cardWidth as any }]}>
        <View style={styles.cardMain}>
          <View style={styles.avatarContainer}>
            {user.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarLabel}>{initials}</Text>
              </View>
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>{fullName}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>{user.email || 'Sin correo'}</Text>
          </View>
        </View>
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Ionicons name="call-outline" size={14} color="#64748B" />
            <Text style={styles.detailText} numberOfLines={1}>{user.phone_number || 'N/A'}</Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setSelectedUser(user)}>
            <Text style={styles.actionBtnText}>Detalles</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOutline]}>
            <Ionicons name="mail-outline" size={16} color="#63348C" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#E11D48" /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}>
        <View style={[styles.header, !isDesktop && styles.headerMobile]}>
          <View style={[styles.titleWrapper, !isDesktop && styles.titleWrapperMobile, isDesktop && { flex: 1, minWidth: 200 }]}>
            <TouchableOpacity style={[styles.inlineBackBtn, !isDesktop && styles.inlineBackBtnMobile]} onPress={() => router.push('/cuenta')} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={24} color="#0F172A" />
            </TouchableOpacity>
            <View style={!isDesktop ? { alignItems: 'center' } : undefined}>
              <Text style={[styles.title, !isDesktop && styles.titleMobile]}>Clientes</Text>
              {isDesktop && <Text style={styles.subtitle}>Gestiona la base de datos de usuarios</Text>}
            </View>
          </View>
          {isDesktop && (
            <View style={styles.headerStats}>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatVal}>{users.length}</Text>
                <Text style={styles.miniStatLabel}>Total Usuarios</Text>
              </View>
              <View style={[styles.miniStat, { borderLeftColor: '#E11D48' }]}>
                <Text style={styles.miniStatVal}>{filteredUsers.length}</Text>
                <Text style={styles.miniStatLabel}>Resultados</Text>
              </View>
            </View>
          )}
          <View style={[styles.searchBox, !isDesktop && styles.searchBoxMobile, focused && styles.searchBoxFocused]}>
            <Ionicons name="search-outline" size={20} color={focused ? '#63348C' : '#94A3B8'} />
            <TextInput style={styles.searchInput} placeholder="Buscar..." value={search} onChangeText={setSearch} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
            {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={20} color="#CBD5E1" /></TouchableOpacity>}
          </View>
        </View>

        {!isDesktop && (
          <View style={styles.statsRowMobile}>
            <View style={styles.statCardMobile}><Text style={styles.statVal}>{users.length}</Text><Text style={styles.statLabel}>Usuarios Totales</Text></View>
            <View style={[styles.statCardMobile, { borderLeftColor: '#E11D48' }]}><Text style={styles.statVal}>{filteredUsers.length}</Text><Text style={styles.statLabel}>Resultados encontrados</Text></View>
          </View>
        )}

        <View style={styles.grid}>
          {currentPageUsers.map(renderUserCard)}
          {currentPageUsers.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#CBD5E1" />
              <Text style={styles.emptyText}>No se encontraron clientes</Text>
            </View>
          )}
        </View>

        {totalPages > 1 && (
          <View style={styles.paginationRow}>
            <TouchableOpacity style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]} onPress={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <Ionicons name="chevron-back" size={18} color={page === 1 ? '#CBD5E1' : '#0F172A'} />
            </TouchableOpacity>
            <Text style={styles.pageText}>Página {page} de {totalPages}</Text>
            <TouchableOpacity style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]} onPress={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <Ionicons name="chevron-forward" size={18} color={page === totalPages ? '#CBD5E1' : '#0F172A'} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} isDesktop={isDesktop} />
    </SafeAreaView>
  );
}

const md = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  desktopWrapper: { position: 'absolute', top: 0, right: 0, bottom: 0, width: 480, justifyContent: 'center' },
  mobileWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  panel: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden', maxHeight: '92%' },
  panelDesktop: { borderRadius: 28, marginVertical: 20, marginRight: 20, maxHeight: '95%', flex: 1 },
  heroBar: { height: 90, backgroundColor: '#0F172A', flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-start', padding: 16 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  avatarWrap: { alignSelf: 'center', marginTop: -44, marginBottom: 12, position: 'relative' },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 4, borderColor: '#fff' },
  avatarFallback: { backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 32, fontWeight: '900', color: '#63348C' },
  onlineDot: { position: 'absolute', bottom: 4, right: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#63348C', borderWidth: 2, borderColor: '#fff' },
  body: { paddingHorizontal: 24, paddingBottom: 40 },
  name: { fontSize: 22, fontWeight: '900', color: '#0F172A', textAlign: 'center', marginBottom: 4 },
  uid: { fontSize: 11, color: '#94A3B8', textAlign: 'center', fontWeight: '600', marginBottom: 20 },
  statsRow: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 20, padding: 16, marginBottom: 24 },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  statLbl: { fontSize: 10, color: '#64748B', fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
  statDivider: { width: 1, backgroundColor: '#E2E8F0', marginVertical: 4 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  infoCard: { backgroundColor: '#F8FAFC', borderRadius: 16, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  infoIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' },
  infoValue: { fontSize: 14, color: '#0F172A', fontWeight: '700', marginTop: 1 },
  emptyOrders: { alignItems: 'center', paddingVertical: 30 },
  emptyOrdersText: { color: '#94A3B8', fontWeight: '600', marginTop: 8 },
  orderRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, padding: 12, marginBottom: 8, gap: 10 },
  orderDot: { width: 8, height: 8, borderRadius: 4 },
  orderId: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  orderSub: { fontSize: 11, color: '#94A3B8', fontWeight: '600', marginTop: 1 },
  orderTotal: { fontSize: 14, fontWeight: '900', color: '#0F172A', marginBottom: 3 },
  orderStatus: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  orderStatusText: { fontSize: 10, fontWeight: '800' },
  actions: { gap: 10 },
  actionPrimary: { backgroundColor: '#0F172A', borderRadius: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  content: { padding: 24, paddingBottom: 80 },
  contentDesktop: { width: '100%', padding: 40, paddingTop: 32 },
  titleWrapper: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  titleWrapperMobile: { width: '100%', justifyContent: 'center', alignItems: 'center', position: 'relative', minHeight: 44 },
  inlineBackBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  inlineBackBtnMobile: { position: 'absolute', left: 0, zIndex: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 24 },
  headerMobile: { flexDirection: 'column', gap: 20, marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  titleMobile: { fontSize: 20, textAlign: 'center', fontWeight: '800' },
  subtitle: { fontSize: 12, color: '#64748B', marginTop: 2, fontWeight: '500' },
  headerStats: { flexDirection: 'row', gap: 24, flex: 2, justifyContent: 'center' },
  miniStat: { borderLeftWidth: 3, borderLeftColor: '#F59E0B', paddingLeft: 10, justifyContent: 'center' },
  miniStatVal: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  miniStatLabel: { fontSize: 10, color: '#64748B', fontWeight: '700', textTransform: 'uppercase', marginTop: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#E2E8F0', gap: 10, width: Platform.OS === 'web' ? 280 : '100%' } as any,
  searchBoxMobile: { width: '100%' },
  searchBoxFocused: { borderColor: '#63348C', backgroundColor: '#fff', shadowColor: '#63348C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10 },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A', fontWeight: '500', outlineStyle: 'none' } as any,
  statsRowMobile: { gap: 12, marginBottom: 24 },
  statCardMobile: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: '#F59E0B', width: '100%' },
  statVal: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
  statLabel: { fontSize: 12, color: '#64748B', fontWeight: '700', marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  userCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.02, shadowRadius: 15 },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  avatarContainer: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden' },
  avatar: { width: '100%', height: '100%' },
  avatarPlaceholder: { width: '100%', height: '100%', backgroundColor: '#E11D4810', alignItems: 'center', justifyContent: 'center' },
  avatarLabel: { fontSize: 14, fontWeight: '900', color: '#E11D48' },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  userEmail: { fontSize: 11, color: '#64748B', marginTop: 1 },
  detailsRow: { flexDirection: 'row', gap: 16, marginBottom: 16, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F8FAFC' },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, backgroundColor: '#0F172A', paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  actionBtnOutline: { flex: 0, width: 38, backgroundColor: '#EEF2FF', borderWidth: 1, borderColor: '#E0E7FF', height: 34, justifyContent: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 100, width: '100%' },
  emptyText: { fontSize: 16, color: '#94A3B8', fontWeight: '600', marginTop: 16 },
  paginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginTop: 40, paddingVertical: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  pageBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  pageBtnDisabled: { backgroundColor: '#F8FAFC', borderColor: '#F1F5F9' },
  pageText: { fontSize: 13, fontWeight: '700', color: '#475569' },
});
