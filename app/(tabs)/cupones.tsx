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
  Modal,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { collection, query, onSnapshot, doc, setDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  active: boolean;
  minAmount?: number;
  expiryDate?: string;
}

export default function CuponesScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 860;

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [editId, setEditId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [active, setActive] = useState(true);
  const [expiryDate, setExpiryDate] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'Coupons'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Coupon));
      setCoupons(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setEditId(null);
    setCode('');
    setType('percentage');
    setValue('');
    setMinAmount('');
    setActive(true);
    setExpiryDate('');
  };

  const handleOpenAdd = () => {
    resetForm();
    setModalVisible(true);
  };

  const handleEdit = (coupon: Coupon) => {
    setEditId(coupon.id);
    setCode(coupon.code);
    setType(coupon.type);
    setValue(coupon.value.toString());
    setMinAmount(coupon.minAmount?.toString() || '');
    setActive(coupon.active);
    setExpiryDate(coupon.expiryDate || '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!code || !value) {
      alert('Por favor completa los campos básicos');
      return;
    }

    setSaving(true);
    try {
      const data = {
        code: code.toUpperCase().trim(),
        type,
        value: parseFloat(value),
        active,
        minAmount: minAmount ? parseFloat(minAmount) : 0,
        expiryDate: expiryDate || null,
        updatedAt: serverTimestamp(),
      };

      if (editId) {
        await setDoc(doc(db, 'Coupons', editId), data, { merge: true });
      } else {
        await addDoc(collection(db, 'Coupons'), {
          ...data,
          createdAt: serverTimestamp(),
        });
      }
      setModalVisible(false);
      resetForm();
    } catch (error) {
      console.error('Error saving coupon:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = Platform.OS === 'web' 
      ? window.confirm('¿Estás seguro de eliminar este cupón?')
      : true; // In Native would use Alert.alert

    if (confirmed) {
      try {
        await deleteDoc(doc(db, 'Coupons', id));
      } catch (error) {
        console.error('Error deleting coupon:', error);
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F59E0B" />
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
              <Text style={[styles.title, !isDesktop && styles.titleMobile]}>Gestión de Cupones</Text>
              {isDesktop && <Text style={styles.subtitle}>Crea y administra códigos de descuento</Text>}
            </View>
          </View>
          
          <TouchableOpacity 
            style={[styles.addBtn, !isDesktop && { width: '100%', marginTop: 8 }]} 
            onPress={handleOpenAdd}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={24} color="#fff" />
            <Text style={styles.addBtnText}>Crear Nuevo Cupón</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {coupons.map((c) => (
            <View key={c.id} style={[styles.couponCard, { width: isDesktop ? '31%' : '100%' }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.statusIndicator, { backgroundColor: c.active ? '#10B981' : '#CBD5E1' }]} />
                <Text style={styles.typeBadge}>
                  {c.type === 'percentage' ? `${c.value}% OFF` : `$${c.value.toLocaleString()} OFF`}
                </Text>
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => handleEdit(c)}>
                    <Ionicons name="pencil-outline" size={18} color="#64748B" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(c.id)} style={{ marginLeft: 12 }}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.codeBox}>
                <Text style={styles.couponCode}>{c.code}</Text>
                <Ionicons name="copy-outline" size={14} color="#94A3B8" />
              </View>

              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.footerLabel}>Mínimo compra</Text>
                  <Text style={styles.footerValue}>${c.minAmount?.toLocaleString() || '0'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.footerLabel}>Estado</Text>
                  <Text style={[styles.footerValue, { color: c.active ? '#10B981' : '#64748B' }]}>
                    {c.active ? 'Activo' : 'Inactivo'}
                  </Text>
                </View>
              </View>
            </View>
          ))}

          {coupons.length === 0 && (
            <View style={styles.emptyState}>
              <Ionicons name="pricetags-outline" size={64} color="#CBD5E1" />
              <Text style={styles.emptyText}>No hay cupones creados</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={handleOpenAdd}>
                <Text style={styles.emptyBtnText}>Crear el primero</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal de Creación/Edición */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && styles.modalContentDesktop]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editId ? 'Editar Cupón' : 'Nuevo Cupón'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Código del Cupón</Text>
                <TextInput
                  style={styles.input}
                  value={code}
                  onChangeText={setCode}
                  placeholder="EJ: SAKU10OFF"
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Tipo de Descuento</Text>
                  <View style={styles.typeToggle}>
                    <TouchableOpacity 
                      style={[styles.typeBtn, type === 'percentage' && styles.typeBtnActive]} 
                      onPress={() => setType('percentage')}
                    >
                      <Text style={[styles.typeBtnText, type === 'percentage' && styles.typeBtnTextActive]}>%</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.typeBtn, type === 'fixed' && styles.typeBtnActive]} 
                      onPress={() => setType('fixed')}
                    >
                      <Text style={[styles.typeBtnText, type === 'fixed' && styles.typeBtnTextActive]}>$</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 16 }]}>
                  <Text style={styles.label}>Valor</Text>
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={setValue}
                    keyboardType="numeric"
                    placeholder="0"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Monto Mínimo de Compra</Text>
                <TextInput
                  style={styles.input}
                  value={minAmount}
                  onChangeText={setMinAmount}
                  keyboardType="numeric"
                  placeholder="$ 0"
                />
              </View>

              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.label}>Cupón Activo</Text>
                  <Text style={styles.inputHint}>Permitir que los clientes usen este código</Text>
                </View>
                <Switch value={active} onValueChange={setActive} trackColor={{ true: '#F59E0B' }} />
              </View>

              <TouchableOpacity 
                style={styles.saveBtn} 
                onPress={handleSave} 
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{editId ? 'Guardar Cambios' : 'Crear Cupón'}</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  headerMobile: { flexDirection: 'column', gap: 12, marginBottom: 24 },
  title: { fontSize: 32, fontWeight: '900', color: '#0F172A', letterSpacing: -1 },
  titleMobile: { fontSize: 20, textAlign: 'center', fontWeight: '800' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 2, fontWeight: '500' },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 6, shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
  couponCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.03, shadowRadius: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  statusIndicator: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  typeBadge: { flex: 1, fontSize: 13, fontWeight: '800', color: '#F59E0B', backgroundColor: '#FFFBEB', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  cardActions: { flexDirection: 'row', alignItems: 'center' },
  codeBox: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderStyle: 'dashed', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20 },
  couponCode: { fontSize: 18, fontWeight: '900', color: '#0F172A', letterSpacing: 1 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16 },
  footerLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  footerValue: { fontSize: 14, fontWeight: '700', color: '#334155' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 120, width: '100%' },
  emptyText: { fontSize: 18, color: '#94A3B8', fontWeight: '600', marginTop: 16 },
  emptyBtn: { marginTop: 24, backgroundColor: '#EEF2FF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  emptyBtnText: { color: '#6366F1', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 32, width: '100%', maxWidth: 500, overflow: 'hidden' },
  modalContentDesktop: { maxWidth: 450 },
  modalHeader: { padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  modalBody: { padding: 24 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 8 },
  input: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 15, color: '#0F172A', fontWeight: '600' } as any,
  row: { flexDirection: 'row' },
  typeToggle: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  typeBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  typeBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  typeBtnText: { fontSize: 14, fontWeight: '700', color: '#94A3B8' },
  typeBtnTextActive: { color: '#F59E0B' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16 },
  inputHint: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  saveBtn: { backgroundColor: '#0F172A', paddingVertical: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
