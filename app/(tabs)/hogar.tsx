import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const KPI_DATA = [
  { label: 'Ventas Totales', value: '$284.5k', change: '+12%', color: '#10B981', icon: 'cash-outline' },
  { label: 'Usuarios Activos', value: '12,840', change: '+5%', color: '#6366F1', icon: 'people-outline' },
  { label: 'Productos', value: '542', change: '+2%', color: '#F59E0B', icon: 'cube-outline' },
  { label: 'Pedidos Hoy', value: '124', change: '+18%', color: '#EC4899', icon: 'cart-outline' },
];

const PERIOD_OPTIONS = ['Diarios', 'Semanal', 'Mensual', 'Trimestral', 'Anual'];

export default function HogarScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1024;
  const [viewType, setViewType] = useState('Semanal');
  const [showPicker, setShowPicker] = useState(false);

  const renderWaveChart = () => (
    <View style={styles.waveChart}>
      {[30, 45, 35, 60, 40, 75, 50, 85, 65, 95, 70, 100, 80, 90, 85].map((h, i) => (
        <View key={i} style={[styles.waveBar, { height: `${h}%` }]}>
           <View style={[styles.waveCap, { backgroundColor: '#10B981' }]} />
        </View>
      ))}
    </View>
  );

  const renderPeriodPicker = () => (
    <Modal visible={showPicker} transparent animationType="fade">
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={() => setShowPicker(false)}
      >
        <View style={styles.pickerContent}>
          {PERIOD_OPTIONS.map(opt => (
            <TouchableOpacity 
              key={opt} 
              style={[styles.pickerItem, viewType === opt && styles.pickerItemActive]}
              onPress={() => { setViewType(opt); setShowPicker(false); }}
            >
              <Text style={[styles.pickerText, viewType === opt && styles.pickerTextActive]}>{opt}</Text>
              {viewType === opt && <Ionicons name="checkmark" size={18} color="#10B981" />}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
      >
        {/* Header Compacto - Ancho Completo */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Dashboard Principal</Text>
            <Text style={styles.subtitle}>Vista general de rendimiento</Text>
          </View>
          <TouchableOpacity 
            style={styles.filterBtn}
            onPress={() => setShowPicker(true)}
          >
            <Ionicons name="calendar-outline" size={18} color="#0F172A" />
            <Text style={styles.filterText}>{viewType}</Text>
            <Ionicons name="chevron-down" size={14} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* KPI Grid - Ancho Completo */}
        <View style={[styles.kpiGrid, isDesktop && styles.kpiGridDesktop]}>
          {KPI_DATA.map((kpi) => (
            <View key={kpi.label} style={styles.kpiCard}>
              <View style={styles.kpiHeader}>
                <View style={[styles.kpiIcon, { backgroundColor: `${kpi.color}15` }]}>
                  <Ionicons name={kpi.icon as any} size={18} color={kpi.color} />
                </View>
                <View style={[styles.changeBadge, { backgroundColor: `${kpi.color}10` }]}>
                  <Text style={[styles.changeText, { color: kpi.color }]}>{kpi.change}</Text>
                </View>
              </View>
              <Text style={styles.kpiValue}>{kpi.value}</Text>
              <Text style={styles.kpiLabel}>{kpi.label}</Text>
            </View>
          ))}
        </View>

        {/* Revenue Evolution - Hidden on 'Diarios' */}
        {viewType !== 'Diarios' && (
          <View style={styles.chartCard}>
            <View style={styles.chartCardHeader}>
              <View>
                <Text style={styles.chartTitle}>Evolución de Ingresos ({viewType})</Text>
                <Text style={styles.chartSubtitle}>Rendimiento comparativo del periodo seleccionado</Text>
              </View>
              <View style={styles.chartLegend}>
                  <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
                  <Text style={styles.legendText}>Ventas</Text>
              </View>
            </View>
            {renderWaveChart()}
            <View style={styles.xAxis}>
               {['01', '03', '05', '07', '09', '11', '13', '15'].map(d => (
                 <Text key={d} style={styles.xText}>{d} Mar</Text>
               ))}
            </View>
          </View>
        )}

        {/* In the 'Diarios' view, we can show more detailed KPIs or simply the list */}
        {viewType === 'Diarios' && (
          <View style={styles.dailyMessageCard}>
             <Ionicons name="analytics" size={32} color="#10B981" />
             <Text style={styles.dailyMessageTitle}>Vista Diaria Detallada</Text>
             <Text style={styles.dailyMessageText}>
               El gráfico de evolución está oculto. Revisa las métricas superiores para el rendimiento de hoy.
             </Text>
          </View>
        )}

        {/* Recent Activity Section */}
        <View style={styles.activitySection}>
          <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Actividad Reciente</Text>
              <TouchableOpacity><Text style={styles.seeMore}>Ver Detalle</Text></TouchableOpacity>
          </View>
          <View style={[styles.activityList, isDesktop && styles.activityListDesktop]}>
              {[
                { id: '1', name: 'Alimento Premium', time: 'hace 5m', amt: '$120' },
                { id: '2', name: 'Juguete Mordedor', time: 'hace 12m', amt: '$45' },
                { id: '3', name: 'Consulta Médica', time: 'hace 30m', amt: '$300' },
                { id: '4', name: 'Higiene Canina', time: 'hace 1h', amt: '$150' },
              ].map((item) => (
                <View key={item.id} style={styles.activityRow}>
                  <View style={styles.activityDot} />
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityName}>{item.name}</Text>
                    <Text style={styles.activityTime}>{item.time}</Text>
                  </View>
                  <Text style={styles.activityAmt}>{item.amt}</Text>
                </View>
              ))}
          </View>
        </View>

      </ScrollView>
      {renderPeriodPicker()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  content: { padding: 16, paddingBottom: 100 },
  contentDesktop: { padding: 32, width: '100%' },
  
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    marginBottom: 24, flexWrap: 'wrap', gap: 12
  },
  title: { fontSize: 22, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  
  filterBtn: { 
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    borderWidth: 1, borderColor: '#F1F5F9'
  },
  filterText: { fontSize: 13, fontWeight: '700', color: '#0F172A' },

  kpiGrid: { gap: 12, marginBottom: 24 },
  kpiGridDesktop: { flexDirection: 'row' },
  kpiCard: { 
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 10
  },
  kpiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  kpiIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  changeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  changeText: { fontSize: 11, fontWeight: '800' },
  kpiValue: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  kpiLabel: { fontSize: 12, color: '#64748B', fontWeight: '600', marginTop: 2 },

  chartCard: { 
    backgroundColor: '#fff', borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 24
  },
  chartCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  chartTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  chartSubtitle: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  chartLegend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  
  waveChart: { 
    height: 180, flexDirection: 'row', alignItems: 'flex-end', gap: 8, 
    borderBottomWidth: 1, borderBottomColor: '#F8FAFC' 
  },
  waveBar: { flex: 1, backgroundColor: '#ECFDF5', borderRadius: 6, position: 'relative' },
  waveCap: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderRadius: 1.5 },
  
  xAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingHorizontal: 4 },
  xText: { fontSize: 10, fontWeight: '700', color: '#94A3B8' },

  dailyMessageCard: { 
    padding: 32, alignItems: 'center', justifyContent: 'center', 
    backgroundColor: '#F8FAFC', borderRadius: 24, marginBottom: 24,
    borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1'
  },
  dailyMessageTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginTop: 12 },
  dailyMessageText: { fontSize: 13, color: '#64748B', marginTop: 4, textAlign: 'center' },

  activitySection: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  seeMore: { fontSize: 12, fontWeight: '700', color: '#10B981' },
  activityList: { gap: 8 },
  activityListDesktop: { flexDirection: 'row', flexWrap: 'wrap' },
  activityRow: { 
    flex: 1, minWidth: Platform.OS === 'web' ? '48%' : '100%',
    flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12,
    backgroundColor: '#F8FAFC', borderRadius: 12
  },
  activityDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#CBD5E1' },
  activityInfo: { flex: 1 },
  activityName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  activityTime: { fontSize: 12, color: '#94A3B8' },
  activityAmt: { fontSize: 14, fontWeight: '800', color: '#0F172A' },

  /* Modal Picker */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  pickerContent: { 
    width: Platform.OS === 'web' ? 300 : '100%', backgroundColor: '#fff', 
    borderRadius: 20, padding: 8, overflow: 'hidden' 
  },
  pickerItem: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12 
  },
  pickerItemActive: { backgroundColor: '#F8FAFC' },
  pickerText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  pickerTextActive: { color: '#0F172A' },
});
