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
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import OriginLocationModal from '../../components/OriginLocationModal';
import SuccessModal from '../../components/SuccessModal';


export default function ShippingConfigScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 860;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({ 
    visible: false, 
    title: '', 
    message: '', 
    type: 'success' as 'success' | 'error' | 'warning' 
  });

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
      }

      // Fetch Origin separately as requested
      const originRef = doc(db, 'ClinicOrigin', 'origin');
      const originSnap = await getDoc(originRef);
      if (originSnap.exists()) {
        const originData = originSnap.data();
        setLat(originData.lat?.toString() || '');
        setLng(originData.lng?.toString() || '');
        setAddress(originData.address || '');
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

      // Save origin to a separate collection as requested
      await setDoc(doc(db, 'ClinicOrigin', 'origin'), {
        address,
        lat: parseFloat(lat) || 0,
        lng: parseFloat(lng) || 0,
        updatedAt: new Date().toISOString(),
      });
      
      setModalConfig({
        visible: true,
        title: "Configuración Guardada",
        message: "Las tarifas de envío y la ubicación de origen se han actualizado correctamente.",
        type: 'success'
      });
    } catch (error) {
      console.error('Error saving shipping config:', error);
      setModalConfig({
        visible: true,
        title: "Error al guardar",
        message: "No se pudo actualizar la configuración. Por favor intenta de nuevo.",
        type: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#63348C" />
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
            
            <View style={!isDesktop ? { alignItems: 'center' } : undefined}>
              <Text style={[styles.title, !isDesktop && styles.titleMobile]}>Configuración de Envío</Text>
              {isDesktop && <Text style={styles.subtitle}>Define las tarifas y el origen de los pedidos</Text>}
            </View>
          </View>
          
          {isDesktop && (
            <TouchableOpacity 
              style={styles.saveBtn} 
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color="#fff" />
                  <Text style={styles.saveBtnText}>Guardar Cambios</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.mainGrid, isDesktop && styles.mainGridDesktop]}>
          <View style={isDesktop ? styles.column : undefined}>
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

          <View style={isDesktop ? styles.column : undefined}>
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

                <TouchableOpacity 
                  style={styles.mapTriggerBtn}
                  onPress={() => setMapVisible(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="map-outline" size={20} color="#10B981" />
                  <Text style={styles.mapTriggerText}>Seleccionar en Mapa</Text>
                </TouchableOpacity>

                <View style={styles.infoBox}>
                  <Ionicons name="information-circle" size={20} color="#63348C" />
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

      <OriginLocationModal 
        visible={mapVisible}
        onClose={() => setMapVisible(false)}
        onSave={(loc) => {
          setAddress(loc.address);
          setLat(loc.lat.toString());
          setLng(loc.lng.toString());
        }}
      />

      {!isDesktop && (
        <View style={styles.mobileFooter}>
          <TouchableOpacity 
            style={styles.mobileSaveBtn} 
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color="#fff" />
                <Text style={styles.mobileSaveBtnText}>Guardar Cambios</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <SuccessModal 
        visible={modalConfig.visible}
        onClose={() => setModalConfig(prev => ({ ...prev, visible: false }))}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
      />
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
  inlineBackBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  inlineBackBtnMobile: { position: 'absolute', left: 0, zIndex: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 24 },
  headerMobile: { flexDirection: 'column', gap: 20, marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  titleMobile: { fontSize: 20, textAlign: 'center', fontWeight: '800' },
  subtitle: { fontSize: 12, color: '#64748B', marginTop: 2, fontWeight: '500' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
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
    fontSize: 12,
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
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.04,
    shadowRadius: 30,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 28,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '800',
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
    }),
  },
  inputHint: {
    fontSize: 10.5,
    color: '#94A3B8',
    marginTop: 8,
    lineHeight: 16,
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
    color: '#63348C',
    lineHeight: 20,
    fontWeight: '600',
  },
  mapTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCFCE7',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    gap: 10,
    marginTop: -8,
    marginBottom: 20
  },
  mapTriggerText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  mobileFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  mobileSaveBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  mobileSaveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  }
});
