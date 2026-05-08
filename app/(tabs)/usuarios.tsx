import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput,
  useWindowDimensions, Platform, ActivityIndicator, Image, Modal, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { collection, query, onSnapshot, where, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
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
  banned?: boolean;
}

function UserDetailModal({ user, onClose, isDesktop }: { user: UserData | null; onClose: () => void; isDesktop: boolean }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [customPushTitle, setCustomPushTitle] = useState('Saku Tienda');
  const [customPush, setCustomPush] = useState('');
  const [sendingPush, setSendingPush] = useState(false);
  const [showPushInput, setShowPushInput] = useState(false);

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
    entregado: '#10B981', enviado: '#63348C', pendiente: '#F59E0B', cancelado: '#EF4444',
  };

  const panel = (
    <View style={[md.panel, isDesktop && md.panelDesktop]}>
      <View style={md.heroBar}>
        <TouchableOpacity onPress={onClose} style={md.closeBtn}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={md.avatarWrap}>
        {user.photoURL ? (
          <Image source={{ uri: user.photoURL }} style={md.avatar} />
        ) : (
          <View style={[md.avatar, md.avatarFallback]}>
            <Text style={md.avatarText}>{initials}</Text>
          </View>
        )}
        <View style={[md.onlineDot, user.banned && { backgroundColor: '#EF4444' }]} />
      </View>

      <ScrollView 
        contentContainerStyle={md.body} 
        showsVerticalScrollIndicator={Platform.OS === 'web'}
        persistentScrollbar={true}
      >
        <Text style={md.name}>{fullName}</Text>
        <Text style={md.uid}>ID: {user.id}</Text>

        <View style={md.statsRow}>
          <View style={md.statBox}>
            <Text style={md.statNum}>{orders.length}</Text>
            <Text style={md.statLbl}>Órdenes</Text>
          </View>
          <View style={md.statDivider} />
          <View style={md.statBox}>
            <Text style={md.statNum}>${totalSpent.toLocaleString("de-DE")}</Text>
            <Text style={md.statLbl}>Gastado</Text>
          </View>
          <View style={md.statDivider} />
          <View style={md.statBox}>
            <Text style={md.statNum}>{orders.filter(o => (o.status||'').toLowerCase() === 'entregado').length}</Text>
            <Text style={md.statLbl}>Éxito</Text>
          </View>
        </View>

        <View style={md.section}>
          <Text style={md.sectionTitle}>CONTACTO</Text>
          <View style={md.infoCard}>
            <View style={md.infoRow}>
              <View style={md.infoIcon}><Ionicons name="mail-outline" size={18} color="#63348C" /></View>
              <View style={{ flex: 1 }}>
                <Text style={md.infoLabel}>EMAIL</Text>
                <Text style={md.infoValue}>{user.email || 'No registrado'}</Text>
              </View>
            </View>
            <View style={md.infoRow}>
              <View style={md.infoIcon}><Ionicons name="call-outline" size={18} color="#63348C" /></View>
              <View style={{ flex: 1 }}>
                <Text style={md.infoLabel}>TELÉFONO</Text>
                <Text style={md.infoValue}>{user.phone_number || 'No registrado'}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={md.section}>
          <Text style={md.sectionTitle}>ACCIONES RÁPIDAS</Text>
          <View style={{ gap: 10 }}>
            {!showPushInput ? (
              <TouchableOpacity style={md.actionBtn} onPress={() => setShowPushInput(true)}>
                <Ionicons name="notifications-outline" size={18} color="#fff" />
                <Text style={md.actionBtnText}>Enviar Notificación Push</Text>
              </TouchableOpacity>
            ) : (
              <View style={md.pushInputContainer}>
                <Text style={{ fontSize: 10, fontWeight: '900', color: '#63348C', marginBottom: 5 }}>TÍTULO</Text>
                <TextInput
                  style={[md.pushInput, { minHeight: 45, marginBottom: 10 }]}
                  placeholder="Título de la notificación..."
                  value={customPushTitle}
                  onChangeText={setCustomPushTitle}
                />
                <Text style={{ fontSize: 10, fontWeight: '900', color: '#63348C', marginBottom: 5 }}>MENSAJE</Text>
                <TextInput
                  style={md.pushInput}
                  placeholder="Escribe el mensaje aquí..."
                  multiline
                  value={customPush}
                  onChangeText={setCustomPush}
                />
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <TouchableOpacity style={md.cancelBtn} onPress={() => { setShowPushInput(false); setCustomPush(''); setCustomPushTitle('Saku Tienda'); }}>
                    <Text style={md.cancelBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[md.sendBtn, (!customPush.trim() || sendingPush) && { opacity: 0.5 }]}
                    disabled={!customPush.trim() || sendingPush}
                    onPress={async () => {
                      setSendingPush(true);
                      try {
                        await addDoc(collection(db, 'ff_user_push_notifications'), {
                          initial_page_name: 'index',
                          notification_text: customPush.trim(),
                          notification_title: customPushTitle.trim(),
                          num_sent: 1,
                          parameter_data: JSON.stringify({}),
                          sender: doc(db, 'users', 'system_admin'),
                          status: 'pending',
                          app_target: 'tienda',
                          timestamp: serverTimestamp(),
                          user_refs: `users/${user.id}`
                        });
                        Alert.alert("Éxito", "Notificación enviada.");
                        setShowPushInput(false);
                        setCustomPush('');
                        setCustomPushTitle('Saku Tienda');
                      } catch (e) {
                        Alert.alert("Error", "Error al enviar.");
                      } finally { setSendingPush(false); }
                    }}
                  >
                    {sendingPush ? <ActivityIndicator size="small" color="#fff" /> : <Text style={md.sendBtnText}>Enviar</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity 
              style={[md.actionBtn, { backgroundColor: '#EF4444' }]}
              onPress={() => {
                Alert.alert("Eliminar Cliente", "¿Estás seguro?", [
                  { text: "No" },
                  { text: "Sí, Eliminar", style: 'destructive', onPress: async () => {
                    await updateDoc(doc(db, 'users', user.id), { banned: true });
                    onClose();
                  }}
                ]);
              }}
            >
              <Ionicons name="trash-outline" size={18} color="#fff" />
              <Text style={md.actionBtnText}>Eliminar y Banear</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={md.section}>
          <Text style={md.sectionTitle}>HISTORIAL DE ÓRDENES</Text>
          {loadingOrders ? <ActivityIndicator color="#63348C" /> : orders.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#94A3B8', marginTop: 10 }}>Sin órdenes</Text>
          ) : (
            orders.map(o => (
              <TouchableOpacity key={o.id} style={md.orderCard} onPress={() => { onClose(); router.push(`/orden/${o.id}` as any); }}>
                <View style={[md.statusDot, { backgroundColor: statusColor[o.status.toLowerCase()] || '#94A3B8' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={md.orderId}>#{o.displayId}</Text>
                  <Text style={md.orderItems}>{o.items} productos</Text>
                </View>
                <Text style={md.orderTotal}>${o.total.toLocaleString("de-DE")}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <Modal visible={!!user} transparent animationType={isDesktop ? 'fade' : 'slide'} onRequestClose={onClose}>
      <TouchableOpacity style={md.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={isDesktop ? md.desktopWrapper : md.mobileWrapper}>{panel}</View>
    </Modal>
  );
}

export default function UsuariosScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'users')), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as UserData)).filter(u => !u.isAdmin);
      setUsers(list);
      setFilteredUsers(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFilteredUsers(users.filter(u => 
      (u.display_name || '').toLowerCase().includes(q) || 
      (u.apellido || '').toLowerCase().includes(q) || 
      (u.email || '').toLowerCase().includes(q)
    ));
    setPage(1); // Reset page on search
  }, [search, users]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPageUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Sticky Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Clientes</Text>
          
          <View style={styles.statBadge}>
            <Text style={styles.statBadgeText}>{filteredUsers.length}</Text>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nombre o email..."
            value={search}
            onChangeText={setSearch}
            placeholderTextColor="#94A3B8"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color="#CBD5E1" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#63348C" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
            {currentPageUsers.map(user => {
              const name = `${user.display_name || ''} ${user.apellido || ''}`.trim() || 'Sin nombre';
              const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
              return (
                <TouchableOpacity key={user.id} style={[styles.card, isDesktop && styles.cardDesktop]} onPress={() => setSelectedUser(user)}>
                  <View style={styles.cardHeader}>
                    {user.photoURL ? (
                      <Image source={{ uri: user.photoURL }} style={styles.cardAvatar} />
                    ) : (
                      <View style={styles.cardAvatarPlaceholder}><Text style={styles.cardAvatarText}>{initials}</Text></View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardName} numberOfLines={1}>{name}</Text>
                      <Text style={styles.cardEmail} numberOfLines={1}>{user.email || 'N/A'}</Text>
                    </View>
                    {user.banned && <View style={styles.bannedBadge}><Text style={styles.bannedText}>BANEADO</Text></View>}
                  </View>
                  
                  <View style={styles.cardInfo}>
                    <View style={styles.cardInfoItem}>
                      <Ionicons name="call-outline" size={14} color="#64748B" />
                      <Text style={styles.cardInfoText}>{user.phone_number || 'Sin teléfono'}</Text>
                    </View>
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={styles.cardActionLabel}>Ver detalles</Text>
                    <Ionicons name="chevron-forward" size={16} color="#63348C" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          {filteredUsers.length === 0 && (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={60} color="#CBD5E1" />
              <Text style={styles.emptyText}>No se encontraron clientes</Text>
            </View>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <View style={styles.paginationRow}>
              <TouchableOpacity 
                style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]} 
                onPress={() => setPage(p => Math.max(1, p - 1))} 
                disabled={page === 1}
              >
                <Ionicons name="chevron-back" size={18} color={page === 1 ? '#CBD5E1' : '#111827'} />
              </TouchableOpacity>
              
              <View style={styles.pageIndicator}>
                <Text style={styles.pageText}>Página <Text style={{ fontWeight: '900' }}>{page}</Text> de {totalPages}</Text>
              </View>

              <TouchableOpacity 
                style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]} 
                onPress={() => setPage(p => Math.min(totalPages, p + 1))} 
                disabled={page === totalPages}
              >
                <Ionicons name="chevron-forward" size={18} color={page === totalPages ? '#CBD5E1' : '#111827'} />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} isDesktop={isDesktop} />
    </SafeAreaView>
  );
}

const gn = StyleSheet.create({
  modal: { width: '90%', maxWidth: 480, backgroundColor: '#fff', borderRadius: 32, padding: 0, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 24, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  iconCircle: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#63348C', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '900', color: '#111827' },
  subtitle: { fontSize: 13, color: '#94A3B8', marginTop: 2, fontWeight: '500' },
  closeBtn: { padding: 8 },
  body: { padding: 24 },
  label: { fontSize: 13, fontWeight: '800', color: '#111827', marginBottom: 8 },
  input: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, fontSize: 15, borderWidth: 1, borderColor: '#E2E8F0', color: '#111827' },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  charCount: { alignSelf: 'flex-end', fontSize: 11, color: '#CBD5E1', marginTop: 6, fontWeight: '700' },
  infoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F3FF', padding: 14, borderRadius: 16, marginTop: 15, gap: 10 },
  infoText: { fontSize: 13, color: '#63348C', fontWeight: '500' },
  footer: { flexDirection: 'row', padding: 24, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 12 },
  cancelBtn: { flex: 1, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: '#475569' },
  sendBtn: { flex: 2, height: 56, backgroundColor: '#10B981', borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  sendBtnText: { fontSize: 16, fontWeight: '900', color: '#fff' },
});

const md = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  mobileWrapper: { flex: 1, backgroundColor: '#fff' },
  desktopWrapper: { position: 'absolute', top: 0, right: 0, bottom: 0, width: 450, backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20 },
  panel: { flex: 1, backgroundColor: '#fff' },
  panelDesktop: { borderTopLeftRadius: 24, borderBottomLeftRadius: 24, overflow: 'hidden' },
  heroBar: { height: 120, backgroundColor: '#111827', padding: 20, paddingTop: Platform.OS === 'ios' ? 50 : 20 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  avatarWrap: { alignSelf: 'center', marginTop: -50, marginBottom: 15, position: 'relative' },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: '#fff' },
  avatarFallback: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#fff' },
  avatarText: { fontSize: 32, fontWeight: '900', color: '#63348C' },
  onlineDot: { position: 'absolute', bottom: 5, right: 5, width: 18, height: 18, borderRadius: 9, backgroundColor: '#10B981', borderWidth: 3, borderColor: '#fff' },
  body: { padding: 24, paddingBottom: 50 },
  name: { fontSize: 24, fontWeight: '900', color: '#111827', textAlign: 'center' },
  uid: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 4, letterSpacing: 1 },
  statsRow: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 20, padding: 20, marginVertical: 25, borderWidth: 1, borderColor: '#F1F5F9' },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 18, fontWeight: '900', color: '#111827' },
  statLbl: { fontSize: 10, color: '#64748B', fontWeight: '800', marginTop: 2, textTransform: 'uppercase' },
  statDivider: { width: 1, backgroundColor: '#E2E8F0', height: '80%' },
  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 12, fontWeight: '900', color: '#94A3B8', letterSpacing: 1.5, marginBottom: 15 },
  infoCard: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  infoIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  infoLabel: { fontSize: 9, fontWeight: '800', color: '#94A3B8' },
  infoValue: { fontSize: 14, fontWeight: '700', color: '#111827', marginTop: 2 },
  actionBtn: { backgroundColor: '#111827', borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  orderCard: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#F8FAFC', borderRadius: 16, marginBottom: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  orderId: { fontSize: 14, fontWeight: '800', color: '#111827' },
  orderItems: { fontSize: 12, color: '#64748B', marginTop: 2 },
  orderTotal: { fontSize: 15, fontWeight: '900', color: '#111827' },
  pushInputContainer: { backgroundColor: '#F8FAFC', padding: 15, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  pushInput: { backgroundColor: '#fff', borderRadius: 12, padding: 15, fontSize: 14, minHeight: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: '#CBD5E1' },
  cancelBtn: { flex: 1, padding: 14, alignItems: 'center' },
  cancelBtnText: { color: '#64748B', fontWeight: '700' },
  sendBtn: { flex: 2, backgroundColor: '#63348C', padding: 14, borderRadius: 12, alignItems: 'center' },
  sendBtnText: { color: '#fff', fontWeight: '800' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { backgroundColor: '#fff', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTop: { flexDirection: 'row', alignItems: 'center', height: 60, gap: 15 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '900', color: '#111827', flex: 1 },
  statBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  statBadgeText: { fontSize: 14, fontWeight: '900', color: '#63348C' },
  globalNotifyBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F3FF', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12, gap: 8, borderWidth: 1, borderColor: '#E0E7FF' },
  globalNotifyText: { color: '#63348C', fontSize: 13, fontWeight: '800' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, paddingHorizontal: 15, height: 50, borderWidth: 1, borderColor: '#F1F5F9' },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#111827', fontWeight: '500' },
  scrollContent: { padding: 20 },
  grid: { gap: 15 },
  gridDesktop: { flexDirection: 'row', flexWrap: 'wrap' },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 10, elevation: 2 },
  cardDesktop: { width: '31%' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 15 },
  cardAvatar: { width: 50, height: 50, borderRadius: 18 },
  cardAvatarPlaceholder: { width: 50, height: 50, borderRadius: 18, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center' },
  cardAvatarText: { fontSize: 18, fontWeight: '900', color: '#63348C' },
  cardName: { fontSize: 16, fontWeight: '900', color: '#111827' },
  cardEmail: { fontSize: 13, color: '#64748B', marginTop: 2 },
  cardInfo: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F8FAFC', paddingVertical: 12, gap: 8, marginBottom: 12 },
  cardInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardInfoText: { fontSize: 13, color: '#475569', fontWeight: '600' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardActionLabel: { fontSize: 12, fontWeight: '800', color: '#63348C' },
  bannedBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  bannedText: { fontSize: 9, fontWeight: '900', color: '#EF4444' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyText: { fontSize: 16, color: '#94A3B8', fontWeight: '600', marginTop: 15 },
  paginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 30, marginBottom: 20, gap: 15 },
  pageBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  pageBtnDisabled: { backgroundColor: '#fff', borderColor: '#F8FAFC' },
  pageIndicator: { backgroundColor: '#F3F4F6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  pageText: { fontSize: 13, color: '#475569', fontWeight: '600' },
});
