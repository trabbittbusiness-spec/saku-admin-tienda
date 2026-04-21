import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface Props {
  visible: boolean;
  onClose: () => void;
  from?: string;
}

const TYPES = [
  {
    id: 'perro-gato',
    label: 'Gato o Perro',
    icon: 'paw' as const,
    color: '#6366F1',
    bg: '#EEF2FF',
    desc: 'Productos para perros y gatos',
  },
  {
    id: 'exotico',
    label: 'Animales Exóticos',
    icon: 'fish' as const,
    color: '#10B981',
    bg: '#ECFDF5',
    desc: 'Aves, peces, reptiles y más',
  },
];

export default function ProductTypeSelectorModal({ visible, onClose, from = '/productos' }: Props) {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 860;

  const handleSelect = (id: string) => {
    onClose();
    router.push(`/nuevo-producto/${id}?from=${from}` as any);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.container, isDesktop ? styles.containerDesktop : styles.containerMobile]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <View style={styles.backdrop} />
        </Pressable>
        
        <View style={[styles.sheet, isDesktop ? styles.sheetDesktop : styles.sheetMobile]}>
          {!isDesktop && <View style={styles.handle} />}
          
          <Text style={styles.title}>¿Qué tipo de producto?</Text>
          <Text style={styles.subtitle}>Selecciona el tipo para configurar los campos correctos</Text>

          <View style={styles.optionsRow}>
            {TYPES.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[styles.optionCard, { borderColor: type.color + '40' }]}
                onPress={() => handleSelect(type.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.optionIcon, { backgroundColor: type.bg }]}>
                  <Ionicons name={type.icon} size={36} color={type.color} />
                </View>
                <Text style={[styles.optionLabel, { color: type.color }]}>{type.label}</Text>
                <Text style={styles.optionDesc}>{type.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  containerMobile: { justifyContent: 'flex-end' },
  containerDesktop: { justifyContent: 'center', alignItems: 'center' },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  sheetMobile: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    width: '100%',
  },
  sheetDesktop: {
    borderRadius: 28,
    width: 600,
    maxWidth: '90%',
    paddingTop: 32,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#0F172A', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 4, marginBottom: 24 },
  optionsRow: { flexDirection: 'row', gap: 14, marginBottom: 20 },
  optionCard: {
    flex: 1, borderRadius: 20, borderWidth: 1.5,
    padding: 20, alignItems: 'center', gap: 10,
    backgroundColor: '#FAFAFA',
  },
  optionIcon: {
    width: 72, height: 72, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  optionLabel: { fontSize: 15, fontWeight: '800', textAlign: 'center' },
  optionDesc: { fontSize: 11, color: '#94A3B8', textAlign: 'center' },
  cancelBtn: {
    alignItems: 'center', paddingVertical: 14,
    backgroundColor: '#F1F5F9', borderRadius: 12,
  },
  cancelText: { color: '#64748B', fontWeight: '600', fontSize: 15 },
});
