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
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { collection, query, onSnapshot } from 'firebase/firestore';
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

export default function UsuariosScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 860;

  const [users, setUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [focused, setFocused] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  // Dynamic Grid calculation
  const getNumColumns = () => {
    if (!isDesktop) return 1;
    if (width > 2000) return 6;
    if (width > 1500) return 5;
    if (width > 1200) return 4;
    return 3;
  };

  const numColumns = getNumColumns();
  const cardWidth = isDesktop ? `${(100 / numColumns) - 1.5}%` : '100%';

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UserData));
      const nonAdmins = list.filter(u => u.isAdmin !== true);
      setUsers(nonAdmins);
      setFilteredUsers(nonAdmins);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const filtered = users.filter(u => {
      const nameMatch = (u.display_name || '').toLowerCase().includes(search.toLowerCase());
      const lastNameMatch = (u.apellido || '').toLowerCase().includes(search.toLowerCase());
      const emailMatch = (u.email || '').toLowerCase().includes(search.toLowerCase());
      const phoneMatch = (u.phone_number || '').includes(search);
      return nameMatch || lastNameMatch || emailMatch || phoneMatch;
    });
    setFilteredUsers(filtered);
    setPage(1); // Reset to first page on search
  }, [search, users]);

  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPageUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const renderUserCard = (user: UserData) => {
    const fullName = `${user.display_name || ''} ${user.apellido || ''}`.trim() || 'Sin nombre';
    
    return (
      <View key={user.id} style={[styles.userCard, { width: cardWidth }]}>
        <View style={styles.cardMain}>
          <View style={styles.avatarContainer}>
            {user.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarLabel}>{fullName[0].toUpperCase()}</Text>
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
          <TouchableOpacity style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>Detalles</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOutline]}>
            <Ionicons name="mail-outline" size={16} color="#6366F1" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E11D48" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
      >
        <View style={[styles.header, !isDesktop && styles.headerMobile]}>
          <View style={[styles.titleWrapper, !isDesktop && styles.titleWrapperMobile, isDesktop && { flex: 1, minWidth: 200 }]}>
            <TouchableOpacity 
              style={[styles.inlineBackBtn, !isDesktop && styles.inlineBackBtnMobile]} 
              onPress={() => router.push('/cuenta')}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={24} color="#0F172A" />
            </TouchableOpacity>
            
            <View style={!isDesktop && { alignItems: 'center' }}>
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
            <Ionicons name="search-outline" size={20} color={focused ? '#6366F1' : '#94A3B8'} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar..."
              value={search}
              onChangeText={setSearch}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={20} color="#CBD5E1" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {!isDesktop && (
          <View style={styles.statsRowMobile}>
            <View style={styles.statCardMobile}>
              <Text style={styles.statVal}>{users.length}</Text>
              <Text style={styles.statLabel}>Usuarios Totales</Text>
            </View>
            <View style={[styles.statCardMobile, { borderLeftColor: '#E11D48' }]}>
              <Text style={styles.statVal}>{filteredUsers.length}</Text>
              <Text style={styles.statLabel}>Resultados encontrados</Text>
            </View>
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
            <TouchableOpacity 
              style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]} 
              onPress={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <Ionicons name="chevron-back" size={18} color={page === 1 ? '#CBD5E1' : '#0F172A'} />
            </TouchableOpacity>
            
            <Text style={styles.pageText}>Página {page} de {totalPages}</Text>

            <TouchableOpacity 
              style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]} 
              onPress={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <Ionicons name="chevron-forward" size={18} color={page === totalPages ? '#CBD5E1' : '#0F172A'} />
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  content: { padding: 24, paddingBottom: 80 },
  contentDesktop: { width: '100%', padding: 40, paddingTop: 32 },
  titleWrapper: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  titleWrapperMobile: { width: '100%', justifyContent: 'center', alignItems: 'center', position: 'relative', minHeight: 44 },
  inlineBackBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  inlineBackBtnMobile: { position: 'absolute', left: 0, zIndex: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, flexWrap: 'wrap', gap: 24 },
  headerMobile: { flexDirection: 'column', gap: 20, marginBottom: 24 },
  title: { fontSize: 32, fontWeight: '900', color: '#0F172A', letterSpacing: -1 },
  titleMobile: { fontSize: 20, textAlign: 'center', fontWeight: '800' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 2, fontWeight: '500' },
  headerStats: { flexDirection: 'row', gap: 32, flex: 2, justifyContent: 'center' },
  miniStat: { borderLeftWidth: 3, borderLeftColor: '#F59E0B', paddingLeft: 12, justifyContent: 'center' },
  miniStatVal: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  miniStatLabel: { fontSize: 11, color: '#64748B', fontWeight: '700', textTransform: 'uppercase', marginTop: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#E2E8F0', gap: 12, width: Platform.OS === 'web' ? 320 : '100%', transitionProperty: 'all', transitionDuration: '0.2s' } as any,
  searchBoxMobile: { width: '100%' },
  searchBoxFocused: { borderColor: '#6366F1', backgroundColor: '#fff', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
  searchInput: { flex: 1, fontSize: 15, color: '#0F172A', fontWeight: '500', outlineStyle: 'none', border: 'none' } as any,
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  statsRowMobile: { gap: 12, marginBottom: 24 },
  statCard: { backgroundColor: '#F8FAFC', padding: 20, borderRadius: 20, borderLeftWidth: 4, borderLeftColor: '#E11D48', minWidth: 160 },
  statCardMobile: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, borderLeftWidth: 4, borderLeftColor: '#F59E0B', width: '100%' },
  statVal: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
  statLabel: { fontSize: 12, color: '#64748B', fontWeight: '700', marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  userCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.02, shadowRadius: 15 },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  avatarContainer: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' },
  avatar: { width: '100%', height: '100%' },
  avatarPlaceholder: { width: '100%', height: '100%', backgroundColor: '#E11D4810', alignItems: 'center', justifyContent: 'center' },
  avatarLabel: { fontSize: 18, fontWeight: '900', color: '#E11D48' },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  userEmail: { fontSize: 12, color: '#64748B', marginTop: 1 },
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
