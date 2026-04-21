import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  useWindowDimensions, Platform, StyleSheet, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Shared Data (mirrors ORDERS in ordenes.tsx) ─────────
const ORDERS_DATA: Record<string, any> = {
  '#3024': { id: '#3024', client: 'Sofía', lastName: 'Martínez', phone: '+52 55 1234-5678', email: 'sofia.m@email.com', date: '23 Mar 2026', address: 'Calle Juárez 12, CDMX', payment: 'Tarjeta de crédito', shipping: 45, discount: 0, subtotal: 735, total: 780, status: 'Procesando', type: 'delivery', note: 'Dejar en recepción', carrier: '', items: [{ name: 'Alimento Premium Perro 🐶', qty: 2, price: 320 }, { name: 'Vitaminas Caninas 💊', qty: 1, price: 95 }] },
  '#3023': { id: '#3023', client: 'Diego', lastName: 'Herrera', phone: '+52 55 8765-4321', email: 'diego.h@email.com', date: '22 Mar 2026', address: 'Av. Reforma 45, MTY', payment: 'Transferencia', shipping: 0, discount: 0, subtotal: 350, total: 350, status: 'En camino', type: 'delivery', note: '', carrier: 'Carlos R.', items: [{ name: 'Juguete Mordedor 🦴', qty: 1, price: 350 }] },
  '#3022': { id: '#3022', client: 'Daniela', lastName: 'Cruz', phone: '+52 33 9876-5432', email: 'daniela.c@email.com', date: '21 Mar 2026', address: 'Blvd. Hidalgo 88, GDL', payment: 'Efectivo', shipping: 60, discount: 120, subtotal: 1180, total: 1240, status: 'Entregado', type: 'pickup', note: 'Llamar al llegar', carrier: 'Luis M.', items: [{ name: 'Cama Pet Luxury 🛏️', qty: 2, price: 450 }, { name: 'Collar Personalizado 🏷️', qty: 3, price: 93 }, { name: 'Pelota Interactiva 🎾', qty: 2, price: 97 }] },
  '#3021': { id: '#3021', client: 'Juan', lastName: 'García', phone: '+52 22 2345-6789', email: 'juan.g@email.com', date: '20 Mar 2026', address: 'Calle 5 de Mayo 7, PUE', payment: 'Efectivo', shipping: 30, discount: 0, subtotal: 310, total: 340, status: 'Entregado', type: 'delivery', note: '', carrier: 'Ana G.', items: [{ name: 'Arnés Reflectante 🐕', qty: 2, price: 155 }] },
  '#3020': { id: '#3020', client: 'María', lastName: 'López', phone: '+52 55 3456-7890', email: 'maria.l@email.com', date: '20 Mar 2026', address: 'Av. Insurgentes 200, CDMX', payment: 'Tarjeta', shipping: 0, discount: 0, subtotal: 125, total: 125, status: 'Cancelado', type: 'pickup', note: 'Cancelado por cliente', carrier: '', items: [{ name: 'Snacks Naturales 🥕', qty: 1, price: 125 }] },
  '#3019': { id: '#3019', client: 'Carlos', lastName: 'Ramírez', phone: '+52 55 4567-8901', email: 'carlos.r@email.com', date: '19 Mar 2026', address: 'Paseo de la Reforma 100, CDMX', payment: 'Tarjeta', shipping: 0, discount: 0, subtotal: 920, total: 920, status: 'Entregado', type: 'delivery', note: '', carrier: 'Miguel V.', items: [{ name: 'Kit Grooming Premium ✂️', qty: 4, price: 230 }] },
  '#3018': { id: '#3018', client: 'Ana', lastName: 'Gutiérrez', phone: '+52 81 5678-9012', email: 'ana.g@email.com', date: '19 Mar 2026', address: 'Av. Constitución 55, MTY', payment: 'Transferencia', shipping: 50, discount: 0, subtotal: 430, total: 480, status: 'Procesando', type: 'delivery', note: '', carrier: '', items: [{ name: 'Alimento Gato Senior 🐱', qty: 2, price: 215 }] },
  '#3017': { id: '#3017', client: 'Luis', lastName: 'Mendoza', phone: '+52 33 6789-0123', email: 'luis.m@email.com', date: '18 Mar 2026', address: 'Calle Morelos 23, GDL', payment: 'Efectivo', shipping: 0, discount: 0, subtotal: 210, total: 210, status: 'En camino', type: 'pickup', note: '', carrier: 'Karen S.', items: [{ name: 'Bebedero Automático 💧', qty: 1, price: 210 }] },
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; dot: string; icon: any }> = {
  'Procesando': { color: '#6366F1', bg: '#EEF2FF', dot: '#6366F1', icon: 'time-outline' },
  'En camino': { color: '#F59E0B', bg: '#FEF3C7', dot: '#F59E0B', icon: 'bicycle-outline' },
  'Entregado': { color: '#10B981', bg: '#DCFCE7', dot: '#10B981', icon: 'checkmark-circle-outline' },
  'Cancelado': { color: '#EF4444', bg: '#FEE2E2', dot: '#EF4444', icon: 'close-circle-outline' },
};

const getStepIndex = (status: string) => {
  if (status === 'Entregado') return 4;
  if (status === 'En camino') return 3;
  if (status === 'Procesando') return 2;
  return 1;
};

// ─── Timeline Step ───────────────────────────────────────
function TimelineStep({ label, icon, done, current }: { label: string; icon: any; done: boolean; current: boolean }) {
  return (
    <View style={{ alignItems: 'center', minWidth: 56 }}>
      <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: done || current ? '#111' : '#F3F4F6', alignItems: 'center', justifyContent: 'center' }}>
        {done && !current
          ? <Ionicons name="checkmark" size={18} color="#fff" />
          : current
            ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' }} />
            : <Ionicons name={icon} size={16} color="#9CA3AF" />}
      </View>
      <Text style={{ fontSize: 10, fontWeight: current || done ? '800' : '600', color: current || done ? '#111' : '#9CA3AF', textAlign: 'center', marginTop: 6 }}>{label}</Text>
    </View>
  );
}

function TimelineConnector({ active }: { active: boolean }) {
  return <View style={{ flex: 1, height: 2, backgroundColor: active ? '#111' : '#E5E7EB', marginHorizontal: 4, marginTop: 19 }} />;
}

// ─── Main Screen ─────────────────────────────────────────
export default function OrdenDetalleScreen() {
  const { id, from } = useLocalSearchParams<{ id: string, from?: string }>();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 900;

  const order = ORDERS_DATA[decodeURIComponent(id ?? '')] ?? ORDERS_DATA['#3024'];
  const [carrier, setCarrier] = useState(order.carrier);
  const [currentStatus, setCurrentStatus] = useState(order.status);
  const stepIndex = getStepIndex(currentStatus);
  const cfg = STATUS_CONFIG[currentStatus] ?? STATUS_CONFIG['Procesando'];

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFF' }}>
      {/* Top Nav */}
      <View style={[s.topNav, isDesktop && { height: 100, borderBottomWidth: 0, backgroundColor: '#F8FAFF' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => from ? router.push(from as any) : router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={16} color="#111" />
            <Text style={s.backText}>Volver</Text>
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' }}>Detalle de Orden</Text>
            <Text style={[s.orderId, isDesktop && { fontSize: 26, fontWeight: '900' }]}>{order.id}</Text>
          </View>
        </View>
        <View style={s.topRight}>
          <TouchableOpacity style={s.helpBtn} activeOpacity={0.7}>
            <Ionicons name="print-outline" size={18} color="#475569" />
          </TouchableOpacity>
          <TouchableOpacity style={[s.helpBtn, { backgroundColor: '#FEE2E2' }]} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: isDesktop ? 32 : 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* ── 1. STATUS HEADER + TIMELINE ─────────────────── */}
        <View style={[s.card, { marginBottom: 24 }]}>
          <View style={{ flexDirection: isDesktop ? 'row' : 'column', justifyContent: 'space-between', alignItems: isDesktop ? 'center' : 'flex-start', gap: 24 }}>
            {/* Identity */}
            <View style={{ flex: isDesktop ? 0.4 : undefined }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <Text style={s.orderId}>{order.id}</Text>
                <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: cfg.dot }} />
                  <Text style={[s.statusBadgeText, { color: cfg.color }]}>{currentStatus}</Text>
                </View>
              </View>
              <Text style={s.orderMeta}>
                {order.type === 'pickup' ? 'Retiro en Sucursal' : 'Entrega a Domicilio'} · {order.date}
              </Text>
            </View>

            {/* Timeline */}
            <View style={{ flex: isDesktop ? 0.6 : undefined, width: isDesktop ? undefined : '100%', paddingBottom: isDesktop ? 20 : 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <TimelineStep label="Pagado" icon="card-outline" done={stepIndex >= 1} current={stepIndex === 1} />
                <TimelineConnector active={stepIndex >= 2} />
                <TimelineStep label="Preparando" icon="cube-outline" done={stepIndex >= 3} current={stepIndex === 2} />
                <TimelineConnector active={stepIndex >= 3} />
                <TimelineStep label={order.type === 'pickup' ? 'Listo' : 'En Camino'} icon={order.type === 'pickup' ? 'storefront-outline' : 'bicycle-outline'} done={stepIndex >= 4} current={stepIndex === 3} />
                <TimelineConnector active={stepIndex >= 4} />
                <TimelineStep label="Entregado" icon="home-outline" done={stepIndex === 4} current={stepIndex === 4} />
              </View>
            </View>
          </View>
        </View>

        {/* ── 2. THREE-COLUMN GRID ────────────────────────── */}
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 20 }}>

          {/* COLUMN 1 — QR / Barcode */}
          <View style={[s.darkCard, { flex: 1 }]}>
            <Ionicons name="paw" size={180} color="rgba(16,185,129,0.04)" style={{ position: 'absolute', top: -30, right: -30 }} />
            <Text style={s.darkLabel}>{order.type === 'pickup' ? 'Pase de Retiro Digital' : 'Identificador de Orden'}</Text>
            <Text style={s.darkTitle}>{order.type === 'pickup' ? 'Código de Retiro' : 'Comprobante Digital'}</Text>

            <View style={s.qrBox}>
              {order.type === 'pickup' ? (
                <Image source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${order.id}&bgcolor=ffffff&color=0B1B3D` }} style={{ width: 160, height: 160 }} resizeMode="contain" />
              ) : (
                <View style={{ width: '100%', height: 80, flexDirection: 'row', gap: 2, marginBottom: 8 }}>
                  {[1, 3, 2, 1, 4, 1, 2, 3, 1, 2, 4, 1, 3, 1, 2, 4, 1, 2, 1, 3].map((w, i) => (
                    <View key={i} style={{ flex: w, height: '100%', backgroundColor: '#111827', borderRadius: 1 }} />
                  ))}
                </View>
              )}
              <View style={{ height: 1, borderStyle: 'dashed', borderWidth: 1, borderColor: '#E5E7EB', marginVertical: 12, width: '100%' }} />
              <Text style={s.qrId}>{order.id}</Text>
            </View>

            {/* Carrier Assignment */}
            <View style={s.carrierRow}>
              <Ionicons name="bicycle" size={18} color="rgba(255,255,255,0.5)" />
              <TextInput
                style={s.carrierInput}
                placeholder="Asignar repartidor..."
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={carrier}
                onChangeText={setCarrier}
              />
              <TouchableOpacity style={s.carrierSendBtn} activeOpacity={0.8}>
                <Text style={s.carrierSendText}>Asignar</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* COLUMN 2 — Products */}
          <View style={[s.card, { flex: 1 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={s.colTitle}>Productos</Text>
              <View style={s.countBadge}>
                <Text style={s.countBadgeText}>{order.items.length} ítem{order.items.length > 1 ? 's' : ''}</Text>
              </View>
            </View>

            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 12 }}>
                {order.items.map((item: any, i: number) => (
                  <View key={i} style={s.productRow}>
                    <View style={s.productEmoji}>
                      <Text style={{ fontSize: 24 }}>{item.name.match(/[\u{1F300}-\u{1F9FF}]/u)?.[0] ?? '📦'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.productName} numberOfLines={1}>{item.name.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim()}</Text>
                      <Text style={s.productMeta}>x{item.qty} · ${(item.price * item.qty).toLocaleString('es-CL')}</Text>
                    </View>
                    <Text style={s.productPrice}>${item.price.toLocaleString('es-CL')}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            {order.note ? (
              <View style={s.noteBox}>
                <Ionicons name="chatbubble-outline" size={14} color="#6366F1" />
                <Text style={s.noteText}>{order.note}</Text>
              </View>
            ) : null}
          </View>

          {/* COLUMN 3 — Financials + Actions */}
          <View style={{ flex: 1, gap: 16 }}>
            {/* Address + Payment */}
            <View style={s.card}>
              <Text style={s.sectionLabel}>{order.type === 'pickup' ? 'SUCURSAL DE RETIRO' : 'DIRECCIÓN DE ENTREGA'}</Text>
              <View style={s.infoRow}>
                <View style={s.infoIcon}><Ionicons name={order.type === 'pickup' ? 'storefront' : 'location'} size={16} color="#475569" /></View>
                <Text style={s.infoText}>{order.type === 'pickup' ? 'Saku Store Central\nAv. Principal 100, Local 5' : order.address}</Text>
              </View>

              <View style={s.divider} />

              <Text style={s.sectionLabel}>CLIENTE</Text>
              <View style={s.infoRow}>
                <View style={s.infoIcon}><Ionicons name="person" size={16} color="#475569" /></View>
                <Text style={s.infoText}>{order.client} {order.lastName}</Text>
              </View>
              <View style={s.infoRow}>
                <View style={s.infoIcon}><Ionicons name="call" size={16} color="#475569" /></View>
                <Text style={s.infoText}>{order.phone}</Text>
              </View>
              <View style={s.infoRow}>
                <View style={s.infoIcon}><Ionicons name="mail" size={16} color="#475569" /></View>
                <Text style={s.infoText}>{order.email}</Text>
              </View>

              <View style={s.divider} />

              <Text style={s.sectionLabel}>MÉTODO DE PAGO</Text>
              <View style={s.infoRow}>
                <View style={s.infoIcon}><Ionicons name="card" size={16} color="#475569" /></View>
                <Text style={s.infoText}>{order.payment}</Text>
              </View>

              <View style={s.divider} />

              {/* Financial Summary */}
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={s.financeLabel}>Subtotal</Text>
                  <Text style={s.financeValue}>${order.subtotal.toLocaleString('es-CL')}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={s.financeLabel}>Envío</Text>
                  <Text style={[s.financeValue, { color: order.shipping > 0 ? '#0F172A' : '#10B981' }]}>
                    {order.shipping > 0 ? `$${order.shipping.toLocaleString('es-CL')}` : 'Gratis'}
                  </Text>
                </View>
                {order.discount > 0 && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={s.financeLabel}>Descuento</Text>
                    <Text style={[s.financeValue, { color: '#10B981' }]}>-${order.discount.toLocaleString('es-CL')}</Text>
                  </View>
                )}
              </View>

              {/* Total */}
              <View style={s.totalBox}>
                <Text style={s.totalLabel}>Total Pagado</Text>
                <Text style={s.totalAmount}>${order.total.toLocaleString('es-CL')}</Text>
              </View>
            </View>

            {/* Status Change Panel */}
            <View style={s.card}>
              <Text style={s.sectionLabel}>CAMBIAR ESTADO</Text>
              <View style={{ gap: 8 }}>
                {['Procesando', 'En camino', 'Entregado', 'Cancelado'].map(st => {
                  const c = STATUS_CONFIG[st];
                  const active = currentStatus === st;
                  return (
                    <TouchableOpacity key={st} style={[s.statusChip, active && { backgroundColor: c.bg, borderColor: c.color }]} onPress={() => setCurrentStatus(st)} activeOpacity={0.7}>
                      <Ionicons name={c.icon} size={16} color={active ? c.color : '#94A3B8'} />
                      <Text style={[s.statusChipText, active && { color: c.color }]}>{st}</Text>
                      {active && <Ionicons name="checkmark-circle" size={16} color={c.color} style={{ marginLeft: 'auto' as any }} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity style={s.saveBtn} activeOpacity={0.8}>
                <Ionicons name="save-outline" size={16} color="#fff" />
                <Text style={s.saveBtnText}>Guardar Cambios</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────
const s = StyleSheet.create({
  topNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F8FAFC', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 100, borderWidth: 1, borderColor: '#E2E8F0' },
  backText: { fontSize: 13, fontWeight: '700', color: '#111' },
  topRight: { flexDirection: 'row', gap: 8 },
  helpBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  darkCard: { backgroundColor: '#0B1B3D', borderRadius: 24, padding: 28, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24 },
  orderId: { fontSize: 40, fontWeight: '900', color: '#111', letterSpacing: -1.5 },
  orderMeta: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  statusBadgeText: { fontSize: 12, fontWeight: '800' },
  darkLabel: { fontSize: 11, fontWeight: '900', color: '#10B981', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6 },
  darkTitle: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: -0.5, lineHeight: 28, marginBottom: 20 },
  qrBox: { backgroundColor: '#fff', borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 20 },
  qrId: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 18, fontWeight: '900', color: '#111', letterSpacing: 4 },
  carrierRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  carrierInput: { flex: 1, fontSize: 14, color: '#fff', outlineWidth: 0 } as any,
  carrierSendBtn: { backgroundColor: '#6366F1', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10 },
  carrierSendText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  colTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A', letterSpacing: -0.3 },
  countBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100 },
  countBadgeText: { fontSize: 12, fontWeight: '800', color: '#475569' },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F8FAFC', borderRadius: 14, padding: 12 },
  productEmoji: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4 },
  productName: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  productMeta: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  productPrice: { fontSize: 14, fontWeight: '800', color: '#6366F1' },
  noteBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EEF2FF', borderRadius: 10, padding: 10, marginTop: 14 },
  noteText: { fontSize: 13, color: '#6366F1', fontWeight: '500', flex: 1 },
  sectionLabel: { fontSize: 10, fontWeight: '900', color: '#94A3B8', letterSpacing: 1.5, marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  infoIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  infoText: { fontSize: 14, color: '#0F172A', fontWeight: '500', flex: 1, lineHeight: 20 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 14 },
  financeLabel: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  financeValue: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  totalBox: { marginTop: 16, padding: 20, backgroundColor: '#F8FAFF', borderRadius: 20, alignItems: 'center' },
  totalLabel: { fontSize: 11, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
  totalAmount: { fontSize: 34, fontWeight: '900', color: '#0F172A', letterSpacing: -1.5 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: '#E2E8F0' },
  statusChipText: { fontSize: 14, fontWeight: '700', color: '#94A3B8', flex: 1 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#6366F1', borderRadius: 14, paddingVertical: 14, marginTop: 12, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 },
  saveBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
});
