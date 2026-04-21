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
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function ShippingConfigScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 860;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [baseCost, setBaseCost] = useState('0');
  const [costPerKm, setCostPerKm] = useState('0');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('0');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const docRef = doc(db, 'Settings', 'shipping');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setBaseCost(data.baseCost?.toString() || '0');
        setCostPerKm(data.costPerKm?.toString() || '0');
        setFreeShippingThreshold(data.freeShippingThreshold?.toString() || '0');
        setLat(data.originLocation?.lat?.toString() || '');
        setLng(data.originLocation?.lng?.toString() || '');
        setAddress(data.originLocation?.address || '');
      }
    } catch (error) {
      console.error('Error fetching shipping config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const config = {
        baseCost: parseFloat(baseCost) || 0,
        costPerKm: parseFloat(costPerKm) || 0,
        freeShippingThreshold: parseFloat(freeShippingThreshold) || 0,
        originLocation: {
          lat: parseFloat(lat) || 0,
          lng: parseFloat(lng) || 0,
          address: address,
        },
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'Settings', 'shipping'), config);
      
      if (Platform.OS === 'web') {
        alert('Configuración guardada exitosamente');
      } else {
        Alert.alert('Éxito', 'Configuración guardada exitosamente');
      }
    } catch (error) {
       console.error('Error saving shipping config:', error);
       if (Platform.OS === 'web') {
         alert('Error al guardar la configuración');
       } else {
         Alert.alert('Error', 'No se pudo guardar la configuración');
       }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
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
              <Text style={[styles.title, !isDesktop && styles.titleMobile]}>Configuración de Envío</Text>
              {isDesktop && <Text style={styles.subtitle}>Define las tarifas y el origen de los pedidos</Text>}
            </View>
          </View>
          
          {isDesktop && (
            <TouchableOpacity 
              style={styles.saveBtn} 
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Ionicons name="save-outline" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Guardar Cambios</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.mainGrid, isDesktop && styles.mainGridDesktop]}>
          
          <View style={isDesktop ? styles.column : null}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Calculadora de Costos</Text>
              <View style={styles.card}>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Costo Base ($ CLP)</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="cash-outline" size={20} color="#94A3B8" />
                    <TextInput
                      style={styles.input}
                      value={baseCost}
                      onChangeText={setBaseCost}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>
                  <Text style={styles.inputHint}>Monto mínimo que se cobrará por cualquier envío.</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Costo por Kilómetro ($ CLP)</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="navigate-outline" size={20} color="#94A3B8" />
                    <TextInput
                      style={styles.input}
                      value={costPerKm}
                      onChangeText={setCostPerKm}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>
                  <Text style={styles.inputHint}>Se multiplicará por la distancia entre el origen y el cliente.</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Envío Gratis desde ($ CLP)</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="gift-outline" size={20} color="#94A3B8" />
                    <TextInput
                      style={styles.input}
                      value={freeShippingThreshold}
                      onChangeText={setFreeShippingThreshold}
                      keyboardType="numeric"
                      placeholder="0"
                    />
                  </View>
                  <Text style={styles.inputHint}>Si el total de la compra supera este monto, el envío será gratis.</Text>
                </View>

              </View>
            </View>
          </View>

          <View style={isDesktop ? styles.column : null}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ubicación de la Veterinaria (Origen)</Text>
              <View style={styles.card}>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Dirección Exacta</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="location-outline" size={20} color="#94A3B8" />
                    <TextInput
                      style={styles.input}
                      value={address}
                      onChangeText={setAddress}
                      placeholder="Ej: Av. Principal 123, Santiago"
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Latitud</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        value={lat}
                        onChangeText={setLat}
                        keyboardType="numeric"
                        placeholder="-33.4489"
                      />
                    </View>
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 16 }]}>
                    <Text style={styles.label}>Longitud</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        value={lng}
                        onChangeText={setLng}
                        keyboardType="numeric"
                        placeholder="-70.6693"
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.infoBox}>
                  <Ionicons name="information-circle" size={20} color="#6366F1" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoTitle}>¿Por qué son importantes estos datos?</Text>
                    <Text style={styles.infoText}>
                      Estas coordenadas se utilizarán para calcular la distancia aérea precisa entre tu veterinaria y la ubicación del cliente mediante la API de Google Maps.
                    </Text>
                  </View>
                </View>

              </View>
            </View>
          </View>

        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 80,
  },
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
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  mainGrid: {
    flexDirection: 'column',
    gap: 24,
  },
  mainGridDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 32,
  },
  column: {
    flex: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 32,
    padding: 28,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.04,
    shadowRadius: 40,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 28,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    gap: 14,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: '#0F172A',
    fontWeight: '900',
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
    }),
  },
  inputHint: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 10,
    lineHeight: 18,
    fontWeight: '500',
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: '#EEF2FF',
    padding: 20,
    borderRadius: 24,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#4338CA',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoText: {
    fontSize: 13,
    color: '#6366F1',
    lineHeight: 20,
    fontWeight: '600',
  },
});
