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
import * as Clipboard from 'expo-clipboard';
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
      const parsedValue = parseFloat(value);
      const parsedMinAmount = minAmount ? parseFloat(minAmount) : 0;

      if (isNaN(parsedValue)) {
        showToast('El valor del cupón debe ser un número válido', 'error');
        setSaving(false);
        return;
      }

      const data = {
        code: code.toUpperCase().trim(),
        type,
        value: parsedValue,
        active,
        minAmount: parsedMinAmount,
        expiryDate: expiryDate || null,
        updatedAt: serverTimestamp(),
      };

      if (editId) {
        await setDoc(doc(db, 'Coupons', editId), data, { merge: true });
        showToast('¡Cupón actualizado!', 'success');
      } else {
        await addDoc(collection(db, 'Coupons'), {
          ...data,
          createdAt: serverTimestamp(),
        });
        showToast('¡Cupón creado con éxito!', 'success');
      }
      setModalVisible(false);
      resetForm();
    } catch (error) {
      console.error('Error saving coupon:', error);
      showToast('Error al guardar el cupón', 'error');
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

  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success'
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4000);
  };

  const handleCopy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    showToast('¡Código copiado al portapapeles!');
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
      {toast.visible && (
        <View style={[styles.toast, toast.type === 'success' ? styles.toastSuccess : styles.toastError]}>
          <Ionicons name={toast.type === 'success' ? "checkmark-circle" : "alert-circle"} size={20} color="#fff" />
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}
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
                <View style={[styles.statusBadge, { backgroundColor: c.active ? '#ECFDF5' : '#F1F5F9' }]}>
                  <View style={[styles.statusDot, { backgroundColor: c.active ? '#10B981' : '#94A3B8' }]} />
                  <Text style={[styles.statusText, { color: c.active ? '#065F46' : '#64748B' }]}>
                    {c.active ? 'Activo' : 'Inactivo'}
                  </Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => handleEdit(c)} style={styles.actionBtn}>
                    <Ionicons name="pencil" size={16} color="#6366F1" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(c.id)} style={[styles.actionBtn, styles.deleteAction]}>
                    <Ionicons name="trash" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.mainInfo}>
                <Text style={styles.discountDisplay}>
                  {c.type === 'percentage' ? `${c.value}%` : `$${c.value.toLocaleString()}`}
                  <Text style={styles.discountSub}> OFF</Text>
                </Text>
                 <View style={styles.codeContainer}>
                  <Text style={styles.couponCodeText}>{c.code}</Text>
                  <TouchableOpacity style={styles.copyBtn} onPress={() => handleCopy(c.code)}>
                    <Ionicons name="copy-outline" size={14} color="#6366F1" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.footerItem}>
                  <Ionicons name="cart-outline" size={14} color="#94A3B8" />
                  <Text style={styles.footerLabel}>Mín: <Text style={styles.footerValue}>${c.minAmount?.toLocaleString() || '0'}</Text></Text>
                </View>
                {c.expiryDate && (
                  <View style={styles.footerItem}>
                    <Ionicons name="calendar-outline" size={14} color="#94A3B8" />
                    <Text style={styles.footerLabel}>Exp: <Text style={styles.footerValue}>{c.expiryDate}</Text></Text>
                  </View>
                )}
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
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3B1E54', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, gap: 8, shadowColor: '#3B1E54', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 4 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 24 },
  
  couponCard: { backgroundColor: '#fff', borderRadius: 28, padding: 24, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.04, shadowRadius: 30 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  deleteAction: { backgroundColor: '#FEF2F2' },
  
  mainInfo: { alignItems: 'center', marginBottom: 24 },
  discountDisplay: { fontSize: 36, fontWeight: '900', color: '#0F172A', letterSpacing: -1 },
  discountSub: { fontSize: 16, color: '#64748B', fontWeight: '700' },
  codeContainer: { marginTop: 12, backgroundColor: '#F8FAFC', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  couponCodeText: { fontSize: 15, fontWeight: '800', color: '#6366F1', letterSpacing: 1 },
  copyBtn: { padding: 4 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F8FAFC', paddingTop: 20 },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  footerValue: { color: '#475569', fontWeight: '800' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 120, width: '100%' },
  emptyText: { fontSize: 18, color: '#94A3B8', fontWeight: '600', marginTop: 16 },
  emptyBtn: { marginTop: 24, backgroundColor: '#3B1E54', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  emptyBtnText: { color: '#fff', fontWeight: '700' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 32, width: '100%', maxWidth: 500, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.2, shadowRadius: 40 },
  modalContentDesktop: { maxWidth: 450 },
  modalHeader: { padding: 28, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
  modalBody: { padding: 28 },
  inputGroup: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '800', color: '#334155', marginBottom: 10 },
  input: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 15, color: '#0F172A', fontWeight: '700' } as any,
  row: { flexDirection: 'row' },
  typeToggle: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 14, padding: 4 },
  typeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  typeBtnActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  typeBtnText: { fontSize: 14, fontWeight: '800', color: '#94A3B8' },
  typeBtnTextActive: { color: '#6366F1' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, backgroundColor: '#F8FAFC', padding: 20, borderRadius: 20 },
  inputHint: { fontSize: 12, color: '#94A3B8', marginTop: 4, fontWeight: '500' },
  saveBtn: { backgroundColor: '#0F172A', paddingVertical: 18, borderRadius: 18, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 15 },
  saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 0.5 },
  
  toast: { position: 'absolute', top: 40, left: 20, right: 20, zIndex: 10000, backgroundColor: '#0F172A', padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20 },
  toastSuccess: { backgroundColor: '#10B981' },
  toastError: { backgroundColor: '#EF4444' },
  toastText: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '800' },
});
