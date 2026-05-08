import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  useWindowDimensions, Platform, StyleSheet, Image, ActivityIndicator, Alert, Modal, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  interpolate,
  Extrapolate
} from 'react-native-reanimated';
import { db } from '../../lib/firebase';
import { doc, onSnapshot, updateDoc, deleteDoc, Timestamp, addDoc, collection, getDoc, serverTimestamp } from 'firebase/firestore';

import * as Clipboard from 'expo-clipboard';

const formatDate = (ts: any) => {
  if (!ts) return '';
  const date = ts instanceof Timestamp ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
};

const mapToUIStatus = (dbStatus: string) => {
  const s = (dbStatus || 'pendiente').toLowerCase().trim();
  if (s === 'procesando' || s === 'en proceso' || s === 'pendiente' || s === 'en camino') return 'Pendiente';
  if (s === 'enviado') return 'Enviado';
  if (s === 'entregado') return 'Entregado';
  if (s === 'cancelado') return 'Cancelado';
  return 'Pendiente';
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: any }> = {
  'Pendiente': { color: '#F59E0B', bg: '#FEF3C7', icon: 'time-outline' },
  'Enviado':   { color: '#63348C', bg: '#EEF2FF', icon: 'bicycle-outline' },
  'Entregado': { color: '#63348C', bg: '#DCFCE7', icon: 'checkmark-circle-outline' },
  'Cancelado': { color: '#EF4444', bg: '#FEE2E2', icon: 'close-circle-outline' },
};

const getStepIndex = (status: string) => {
  if (status === 'Entregado') return 2;
  if (status === 'Enviado') return 1;
  return 0;
};

const StatusPulse = ({ color }: { color: string }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 2000 }),
      -1,
      false
    );
  }, []);

  const ringStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: interpolate(progress.value, [0, 1], [1, 2.5]) }],
      opacity: interpolate(progress.value, [0, 1], [0.5, 0]),
    };
  });

  return (
    <Animated.View 
      style={[
        {
          position: 'absolute',
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: color,
          zIndex: -1,
        },
        ringStyle
      ]} 
    />
  );
};

export default function OrdenDetalleScreen() {
  const { id, from } = useLocalSearchParams<{ id: string, from?: string }>();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setOrder(null);
    const orderDoc = doc(db, 'Orden', decodeURIComponent(id));
    const unsubscribe = onSnapshot(orderDoc, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const userName = data.nombre || data.nombreCliente || data.clienteNombre || data.clientName || 'Sin nombre';
        setOrder({
          id: snapshot.id,
          displayId: data.codigoRetiro || data.ID_orden || snapshot.id,
          client: userName,
          phone: data.telefono || data.numerodetelefono || '',
          email: data.email || '',
          date: formatDate(data.timestamp || data.fechaCreacion),
          address: data.direccion?.texto || data.direccion?.main || 'Retiro en Sucursal',
          instructions: data.direccion?.instructions || '',
          payment: data.metodoPago === 'cash' ? 'Efectivo / Transfer' : 'Tarjeta Bancaria',
          shipping: data.envio || 0,
          discount: data.descuento || 0,
          subtotal: data.subtotal || data.total || 0,
          total: data.total || 0,
          status: mapToUIStatus(data.estado),
          type: data.tipoEntrega === 'home' ? 'Entrega a Domicilio' : 'Retiro en Sucursal',
          note: data.puntoReferencia || data.puntodereferencia || '',
          carrier: data.carrier || '',
          items: data.items || [],
          coords: data.direccion?.lat && data.direccion?.lng ? { lat: data.direccion.lat, lng: data.direccion.lng } : null
        });
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateStatus = async (newStatus: string) => {
    if (!id) return;
    setSaving(true);
    try {
      const orderDocRef = doc(db, 'Orden', decodeURIComponent(id));
      await updateDoc(orderDocRef, { estado: newStatus });

      // Create notification for the client
      const notifMessages: Record<string, { title: string; body: string }> = {
        'Pendiente':  { title: '⏳ Orden recibida', body: 'Hemos recibido tu pedido y está siendo procesado.' },
        'Enviado':    { title: '🚴 ¡Tu pedido está en camino!', body: `Tu orden #${order?.displayId || decodeURIComponent(id)} ha sido enviada y está en camino.` },
        'Entregado':  { title: '✅ ¡Pedido entregado!', body: `Tu orden #${order?.displayId || decodeURIComponent(id)} ha sido entregada. ¡Gracias por tu compra!` },
        'Cancelado':  { title: '❌ Orden cancelada', body: `Tu orden #${order?.displayId || decodeURIComponent(id)} ha sido cancelada. Contáctanos si tienes dudas.` },
      };

      const msg = notifMessages[newStatus] ?? { title: 'Actualización de orden', body: `El estado de tu orden cambió a ${newStatus}.` };

      // Get creador reference from the order document
      const orderSnap = await getDoc(orderDocRef);
      const creadorRef = orderSnap.exists() ? (orderSnap.data().creador ?? null) : null;

      await addDoc(collection(db, 'notificaciones'), {
        creador: creadorRef,
        ordenRef: orderDocRef,
        ordenId: decodeURIComponent(id),
        displayId: order?.displayId || decodeURIComponent(id),
        estado: newStatus,
        titulo: msg.title,
        mensaje: msg.body,
        leida: false,
        creadaEn: Timestamp.now(),
      });

      // Send Push Notification if it's an important status change
      if (['Enviado', 'Entregado', 'Cancelado'].includes(newStatus) && creadorRef) {
        const creatorId = creadorRef.id;
        await addDoc(collection(db, 'ff_user_push_notifications'), {
          initial_page_name: 'orders',
          notification_text: msg.body,
          notification_title: msg.title,
          num_sent: 1,
          parameter_data: JSON.stringify({ orderId: decodeURIComponent(id) }),
          sender: doc(db, 'users', 'system_admin'), // Or auth.currentUser?.uid
          status: 'pending',
          app_target: 'tienda',
          timestamp: serverTimestamp(),
          user_refs: `users/${creatorId}`
        });
      }
    } catch (e) {
      console.log('Error updating order:', e);
    } finally {
      setSaving(false);
    }
  };


  const performDelete = async () => {
    setShowDeleteModal(false);
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'Orden', decodeURIComponent(id)));
      router.push(from ? (from as any) : '/ordenes');
    } catch (e) {
      console.log("Error deleting order:", e);
      setSaving(false);
    } finally {
      // If we push, we don't necessarily need to setSaving(false) but it's safer
      // especially if the push is delayed or the screen is reused.
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <Text style={{ fontSize: 18, fontWeight: '800' }}>Orden no encontrada</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: '#63348C', fontWeight: '900' }}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const steps = [
    { label: 'Pendiente', icon: 'time-outline' as const },
    { label: 'Enviado', icon: 'bicycle-outline' as const },
    { label: 'Entregado', icon: 'home-outline' as const }
  ];
  const stepIndex = getStepIndex(order.status);
  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG['Pendiente'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView 
        contentContainerStyle={{ 
          paddingHorizontal: isDesktop ? 40 : 20, 
          paddingTop: 20,
          paddingBottom: 60, 
          width: '100%' 
        }}
        showsVerticalScrollIndicator={false}
      >
        
        {/* Main Status Header Card */}
        <View style={s.headerCard}>
          <View style={{ flexDirection: isDesktop ? 'row' : 'column', justifyContent: 'space-between', gap: isDesktop ? 30 : 20 }}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16, position: 'relative', minHeight: 40 }}>
                <TouchableOpacity 
                  onPress={() => from ? router.push(from as any) : router.back()}
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', position: 'absolute', left: 0, zIndex: 10 }}
                >
                  <Ionicons name="arrow-back" size={22} color="#111827" />
                </TouchableOpacity>

                <Text style={{ fontSize: isDesktop ? 26 : 19, fontWeight: '900', color: '#111827', textAlign: 'center' }}>Detalles de Orden</Text>

                <TouchableOpacity 
                  onPress={() => setShowDeleteModal(true)}
                  disabled={saving}
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', position: 'absolute', right: 0, zIndex: 10 }}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                <TouchableOpacity 
                  onPress={() => copyToClipboard(order.id)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#F1F5F9' }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#63348C', letterSpacing: 0.5 }} numberOfLines={1}>{order.id}</Text>
                  {copied ? <Ionicons name="checkmark" size={14} color="#10B981" /> : <Ionicons name="copy-outline" size={14} color="#94A3B8" />}
                </TouchableOpacity>
                <Text style={s.headerMeta}>{order.type} • {order.date}</Text>
              </View>
            </View>

            {/* Status Steps Tracker */}
            <View style={{ flex: 1.5, justifyContent: 'center', marginTop: isDesktop ? 0 : 30 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                <View style={s.timelineBgLine} />
                <View style={[s.timelineActiveLine, { 
                  width: `${(stepIndex / 2) * 90}%`,
                  backgroundColor: order.status === 'Entregado' ? '#10B981' : '#111827',
                  height: 4,
                  top: 15
                }]} />

                {steps.map((step, idx) => {
                  const isActive = idx <= stepIndex;
                  const isCurrent = idx === stepIndex;
                  const isSuccess = order.status === 'Entregado' && isActive;
                  const themeColor = isSuccess ? '#10B981' : (isActive ? '#111827' : '#9CA3AF');
                  const bgColor = isSuccess ? '#10B981' : (isActive ? '#111827' : '#FFFFFF');

                  return (
                    <View key={idx} style={{ alignItems: 'center', gap: 8 }}>
                      <View style={{ position: 'relative', justifyContent: 'center', alignItems: 'center' }}>
                        {isCurrent && <StatusPulse color={order.status === 'Entregado' ? '#10B981' : '#63348C'} />}
                        
                        {/* Success Badge integrated */}
                        {order.status === 'Entregado' && idx === 2 && (
                          <View style={{ position: 'absolute', top: -12, right: -4, backgroundColor: '#059669', borderRadius: 10, padding: 2, borderWidth: 2, borderColor: '#FFF', zIndex: 20 }}>
                            <Ionicons name="checkmark" size={10} color="#FFF" />
                          </View>
                        )}

                        <View style={[
                          s.timelineDot, 
                          isActive && { backgroundColor: bgColor, borderColor: bgColor, shadowColor: bgColor, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
                          isCurrent && { borderWidth: 3, borderColor: order.status === 'Entregado' ? '#059669' : '#111827' }
                        ]}>
                          {isCurrent && order.status !== 'Entregado' ? (
                             <View style={[s.timelineDotCurrent, { backgroundColor: '#63348C' }]} />
                          ) : (
                             <Ionicons name={step.icon} size={16} color={isActive ? '#FFFFFF' : '#9CA3AF'} />
                          )}
                        </View>
                      </View>
                      <Text style={[s.timelineLabel, isActive && { color: themeColor, fontWeight: '900', fontSize: 11 }]}>{step.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 20 }}>
          
          {/* Column 1: QR & Status (Compact) */}
          <View style={{ flex: isDesktop ? 0.8 : undefined, gap: 20, height: isDesktop ? 550 : undefined }}>
            {/* Compact QR Card */}
            <View style={[s.qrCard, { borderRadius: 24, flex: isDesktop ? 0.5 : undefined }]}>
              <View style={[s.qrCardHeader, { padding: 12 }]}>
                <Text style={[s.qrCardTitle, { fontSize: 13 }]}>QR de Verificación</Text>
              </View>
              <View style={[s.qrCardBody, { padding: 15, flex: 1, justifyContent: 'center' }]}>
                <View style={[s.qrBox, { padding: 10 }]}>
                  <Image 
                    source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${order.id}&bgcolor=ffffff&color=0B1B3D` }} 
                    style={{ width: 120, height: 120, alignSelf: 'center' }} 
                    resizeMode="contain"
                  />
                  <View style={[s.qrDivider, { marginVertical: 10 }]} />
                  <TouchableOpacity 
                    onPress={() => copyToClipboard(order.displayId)}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    <Text style={[s.qrDisplayId, { fontSize: 13 }]}>{order.displayId}</Text>
                    <Ionicons name="copy-outline" size={14} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Compact Status Panel */}
            <View style={[s.card, { padding: 15, flex: isDesktop ? 0.5 : undefined }]}>
              <Text style={s.sectionLabel}>ESTADO</Text>
              <View style={{ gap: 6, flex: 1 }}>
                {['Pendiente', 'Enviado', 'Entregado'].map(st => {
                  const c = STATUS_CONFIG[st];
                  const active = order.status === st;
                  return (
                    <TouchableOpacity key={st} style={[s.statusChip, { padding: 8 }, active && { backgroundColor: c.bg, borderColor: c.color }]} onPress={() => updateStatus(st)} activeOpacity={0.7}>
                      <Ionicons name={c.icon} size={14} color={active ? c.color : '#94A3B8'} />
                      <Text style={[s.statusChipText, { fontSize: 12 }, active && { color: c.color }]}>{st}</Text>
                      {active && <Ionicons name="checkmark-circle" size={14} color={c.color} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity style={[s.saveBtn, { paddingVertical: 10, marginTop: 10 }, saving && { opacity: 0.5 }]} disabled={saving} onPress={() => updateStatus(order.status)}>
                <Ionicons name="sync-outline" size={14} color="#fff" style={{ marginRight: 6 }} />
                <Text style={[s.saveBtnText, { fontSize: 13 }]}>Actualizar</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Column 2: Products (Main Area) */}
          <View style={{ flex: isDesktop ? 1.4 : undefined, height: isDesktop ? 550 : undefined }}>
            <View style={[s.card, { flex: 1 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <Text style={s.cardTitle}>Productos</Text>
                <View style={s.countBadge}>
                   <Text style={s.countBadgeText}>{order.items.length} ítems</Text>
                </View>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                <View style={{ gap: 8 }}>
                  {order.items.map((item: any, idx: number) => (
                    <View key={idx} style={[s.productRow, { padding: 8 }]}>
                      <Image source={{ uri: item.foto || item.image }} style={[s.productImage, { width: 34, height: 34 }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[s.productName, { fontSize: 12 }]} numberOfLines={1}>{item.nombre || item.name}</Text>
                        <Text style={[s.productMeta, { fontSize: 10 }]}>x{item.cantidad} • ${ (item.precio || 0).toLocaleString("de-DE") }</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>

              {order.note ? (
                <View style={[s.noteBox, { marginTop: 10, padding: 8 }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={14} color="#63348C" />
                  <Text style={[s.noteText, { fontSize: 11 }]}>{order.note}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Column 3: Info & Totals */}
          <View style={{ flex: isDesktop ? 1 : undefined, gap: 20, height: isDesktop ? 550 : undefined }}>
            <View style={[s.card, { padding: 15, flex: 1 }]}>
              <View style={{ gap: 15, flex: 1 }}>
                {/* Branch / Delivery */}
                <View>
                    <Text style={[s.sectionLabel, { marginBottom: 8 }]}>ENTREGA</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                       <View style={[s.infoIconWrap, { width: 24, height: 24 }]}>
                          <Ionicons name={order.type.includes('Retiro') ? 'storefront-outline' : 'location-outline'} size={12} color="#111827" />
                       </View>
                       <View style={{ flex: 1 }}>
                          <Text style={[s.infoMainText, { fontSize: 12 }]}>{order.type.includes('Retiro') ? 'Saku Store Central' : order.address}</Text>
                          {order.instructions ? (
                            <Text style={[s.infoSubText, { fontSize: 11 }]}>Instrucciones: {order.instructions}</Text>
                          ) : null}
                          
                          {order.coords && (
                            <TouchableOpacity 
                              onPress={() => {
                                const url = Platform.select({
                                  ios: `maps:0,0?q=${order.coords.lat},${order.coords.lng}`,
                                  android: `geo:0,0?q=${order.coords.lat},${order.coords.lng}`,
                                  default: `https://www.google.com/maps/search/?api=1&query=${order.coords.lat},${order.coords.lng}`
                                });
                                if (url) Linking.openURL(url);
                              }}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, backgroundColor: '#F1F5F9', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}
                            >
                              <Ionicons name="map-outline" size={12} color="#63348C" />
                              <Text style={{ fontSize: 11, fontWeight: '700', color: '#63348C' }}>Abrir Ubicación</Text>
                            </TouchableOpacity>
                          )}
                       </View>
                    </View>
                </View>

                {/* Client */}
                <View>
                   <Text style={[s.sectionLabel, { marginBottom: 8 }]}>CLIENTE</Text>
                   <View style={{ gap: 6 }}>
                     <View style={s.infoLine}>
                        <Ionicons name="person-outline" size={12} color="#6B7280" />
                        <Text style={[s.infoLineText, { fontSize: 12 }]}>{order.client}</Text>
                     </View>
                     <View style={s.infoLine}>
                        <Ionicons name="call-outline" size={12} color="#6B7280" />
                        <Text style={[s.infoLineText, { fontSize: 12 }]}>{order.phone}</Text>
                     </View>
                   </View>
                </View>

                {/* Payment */}
                <View>
                   <Text style={[s.sectionLabel, { marginBottom: 8 }]}>PAGO</Text>
                   <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={[s.infoIconWrap, { width: 24, height: 24 }]}>
                         <Ionicons name="card-outline" size={12} color="#111827" />
                      </View>
                      <Text style={[s.infoMainText, { fontSize: 12 }]}>{order.payment}</Text>
                   </View>
                </View>

                <View style={{ flex: 1 }} />

                <View style={[s.divider, { marginVertical: 0 }]} />

                {/* Totals */}
                <View style={{ gap: 6 }}>
                   <View style={s.totalRow}>
                      <Text style={[s.totalRowLabel, { fontSize: 11 }]}>Subtotal</Text>
                      <Text style={[s.totalRowValue, { fontSize: 12 }]}>${order.subtotal.toLocaleString("de-DE")}</Text>
                   </View>
                   <View style={s.totalRow}>
                      <Text style={[s.totalRowLabel, { fontSize: 11 }]}>Envío</Text>
                      <Text style={[s.totalRowValue, { fontSize: 12, color: '#63348C' }]}>{order.shipping === 0 ? 'Gratis' : `$${order.shipping.toLocaleString("de-DE")}`}</Text>
                   </View>
                </View>

                <View style={[s.totalCard, { padding: 10 }]}>
                   <Text style={[s.totalCardLabel, { fontSize: 9 }]}>TOTAL</Text>
                   <Text style={[s.totalCardAmount, { fontSize: 20 }]}>${order.total.toLocaleString("de-DE")}</Text>
                </View>
              </View>
            </View>
          </View>

        </View>

      </ScrollView>

      {/* Delete Confirmation Overlay */}
      {showDeleteModal && (
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalIcon}>
              <Ionicons name="warning-outline" size={32} color="#EF4444" />
            </View>
            <Text style={s.modalTitle}>¿Eliminar Orden?</Text>
            <Text style={s.modalDesc}>Esta acción es permanente y no se puede deshacer. ¿Estás seguro de que deseas continuar?</Text>
            
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowDeleteModal(false)}>
                <Text style={s.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.deleteBtn} onPress={performDelete}>
                <Text style={s.deleteBtnText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  headerCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 20 },
  headerMeta: { fontSize: 13, color: '#9CA3AF', fontWeight: '600', marginTop: 8 },
  
  timelineBgLine: { position: 'absolute', left: '5%', right: '5%', top: 15, height: 4, backgroundColor: '#F3F4F6', zIndex: -1, borderRadius: 2 },
  timelineActiveLine: { position: 'absolute', left: '5%', top: 15, height: 4, backgroundColor: '#111827', zIndex: -1, borderRadius: 2 },
  timelineDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#F3F4F6' },
  timelineDotActive: { backgroundColor: '#111827', borderColor: '#111827' },
  timelineDotCurrent: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#63348C' },
  timelineLabel: { fontSize: 10, fontWeight: '600', color: '#9CA3AF' },
  timelineLabelActive: { fontWeight: '800', color: '#111827' },

  qrCard: { backgroundColor: '#111827', borderRadius: 32, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 30, shadowOffset: { width: 0, height: 20 } },
  qrCardHeader: { padding: 20, alignItems: 'center', backgroundColor: '#1F2937' },
  qrCardTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  qrCardBody: { padding: 25, alignItems: 'center' },
  qrBox: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 24, width: '100%' },
  qrDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 15, borderStyle: 'dashed', borderWidth: 1, borderColor: '#E5E7EB' },
  qrDisplayId: { fontSize: 18, fontWeight: '900', color: '#111827', textAlign: 'center', letterSpacing: 2 },
  
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 20, borderWidth: 1, borderColor: '#F3F4F6' },
  cardTitle: { fontSize: 16, fontWeight: '900', color: '#111827' },
  countBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  countBadgeText: { fontSize: 11, fontWeight: '800', color: '#6B7280' },
  
  modalOverlay: { 
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)', 
    justifyContent: 'center', 
    alignItems: 'center',
    zIndex: 1000,
    elevation: 100
  },
  modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '90%', maxWidth: 400, alignItems: 'center' },
  modalIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#111827', marginBottom: 8 },
  modalDesc: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' },
  cancelBtnText: { color: '#4B5563', fontWeight: '800', fontSize: 14 },
  deleteBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#EF4444', alignItems: 'center' },
  deleteBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  productRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F9FAFB', padding: 10, borderRadius: 12 },
  productImage: { width: 40, height: 40, borderRadius: 8 },
  productName: { fontSize: 13, fontWeight: '800', color: '#111827' },
  productMeta: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginTop: 1 },
  
  noteBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EEF2FF', padding: 12, borderRadius: 12, marginTop: 15 },
  noteText: { fontSize: 12, color: '#63348C', fontWeight: '600', flex: 1 },

  sectionLabel: { color: '#9CA3AF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginBottom: 12, textTransform: 'uppercase' },
  infoIconWrap: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  infoMainText: { fontSize: 13, fontWeight: '800', color: '#111827' },
  infoSubText: { fontSize: 11, color: '#6B7280', fontWeight: '600', marginTop: 1 },
  
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoLineText: { fontSize: 13, color: '#4B5563', fontWeight: '600' },

  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 4 },
  
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalRowLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  totalRowValue: { fontSize: 13, fontWeight: '800', color: '#111827' },
  
  totalCard: { backgroundColor: '#F9FAFB', padding: 15, borderRadius: 16, alignItems: 'center' },
  totalCardLabel: { fontSize: 10, fontWeight: '800', color: '#9CA3AF', marginBottom: 2, letterSpacing: 0.5 },
  totalCardAmount: { fontSize: 24, fontWeight: '900', color: '#111827' },

  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: '#F3F4F6' },
  statusChipText: { fontSize: 13, fontWeight: '700', color: '#64748B', flex: 1 },
  saveBtn: { backgroundColor: '#111827', paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 15 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' }
});
