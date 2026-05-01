import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Switch,
  Alert,
  ActivityIndicator,
  TextInput,
  useWindowDimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { DatePicker } from './DatePicker';

interface DayConfig {
  isOpen: boolean;
  start: string;
  end: string;
}

interface WeeklyConfig {
  [key: string]: DayConfig;
}

interface Holiday {
  date: string;
  reason: string;
}

const DAYS = [
  { id: 'lun', label: 'Lunes' },
  { id: 'mar', label: 'Martes' },
  { id: 'mie', label: 'Miércoles' },
  { id: 'jue', label: 'Jueves' },
  { id: 'vie', label: 'Viernes' },
  { id: 'sab', label: 'Sábado' },
  { id: 'dom', label: 'Domingo' },
];

const DEFAULT_CONFIG: WeeklyConfig = DAYS.reduce((acc, day) => {
  acc[day.id] = { isOpen: true, start: '09:00', end: '18:00' };
  return acc;
}, {} as WeeklyConfig);

export default function ShopScheduleModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const isMobile = width < 768;

  const [config, setConfig] = useState<WeeklyConfig>(DEFAULT_CONFIG);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'weekly' | 'holidays'>('weekly');
  
  // Time Picker State
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [pickingFor, setPickingFor] = useState<{ dayId: string; field: 'start' | 'end' } | null>(null);
  const [tempHour, setTempHour] = useState('09');
  const [tempMinute, setTempMinute] = useState('00');

  // Holiday State
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayReason, setNewHolidayReason] = useState('');

  useEffect(() => {
    if (visible) {
      loadConfig();
    }
  }, [visible]);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, 'Configuracion', 'tienda_horarios');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setConfig(data.weekly || DEFAULT_CONFIG);
        setHolidays(data.holidays || []);
      }
    } catch (error) {
      console.error("Error loading shop schedule:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await setDoc(doc(db, 'Configuracion', 'tienda_horarios'), {
        weekly: config,
        holidays: holidays,
        updatedAt: Timestamp.now()
      });
      Alert.alert("Éxito", "Configuración de la tienda actualizada");
      onClose();
    } catch (error) {
      console.error("Error saving shop schedule:", error);
      Alert.alert("Error", "No se pudo guardar la configuración");
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (dayId: string) => {
    setConfig(prev => ({
      ...prev,
      [dayId]: { ...prev[dayId], isOpen: !prev[dayId].isOpen }
    }));
  };

  const openTimePicker = (dayId: string, field: 'start' | 'end') => {
    const currentTime = config[dayId][field];
    const [h, m] = currentTime.split(':');
    setTempHour(h);
    setTempMinute(m);
    setPickingFor({ dayId, field });
    setTimePickerOpen(true);
  };

  const confirmTime = () => {
    if (pickingFor) {
      const timeStr = `${tempHour}:${tempMinute}`;
      setConfig(prev => ({
        ...prev,
        [pickingFor.dayId]: { ...prev[pickingFor.dayId], [pickingFor.field]: timeStr }
      }));
    }
    setTimePickerOpen(false);
  };

  const addHoliday = () => {
    if (!newHolidayDate) return Alert.alert("Error", "Ingresa una fecha");
    const exists = holidays.some(h => h.date === newHolidayDate);
    if (exists) return Alert.alert("Aviso", "Esta fecha ya está agregada");
    
    setHolidays(prev => [...prev, { date: newHolidayDate, reason: newHolidayReason || 'Día feriado' }]);
    setNewHolidayDate('');
    setNewHolidayReason('');
  };

  const removeHoliday = (date: string) => {
    setHolidays(prev => prev.filter(h => h.date !== date));
  };

  return (
    <>
      <Modal visible={visible} transparent animationType={isMobile ? "slide" : "fade"}>
        <View style={[styles.overlay, isMobile && styles.overlayMobile]}>
          <View style={[styles.modal, isMobile && styles.modalMobile]}>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Horarios de la tienda</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={[styles.tabContainer, isMobile && styles.tabContainerMobile]}>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'weekly' && styles.tabActive]} 
                onPress={() => setActiveTab('weekly')}
              >
                <Ionicons name="calendar-outline" size={18} color={activeTab === 'weekly' ? '#63348C' : '#94A3B8'} />
                <Text style={[styles.tabText, activeTab === 'weekly' && styles.tabTextActive]}>Horarios Semanales</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tab, activeTab === 'holidays' && styles.tabActive]} 
                onPress={() => setActiveTab('holidays')}
              >
                <Ionicons name="airplane-outline" size={18} color={activeTab === 'holidays' ? '#63348C' : '#94A3B8'} />
                <Text style={[styles.tabText, activeTab === 'holidays' && styles.tabTextActive]}>Feriados y Descansos</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.body} showsVerticalScrollIndicator={true}>
              {loading ? (
                <ActivityIndicator size="large" color="#63348C" style={{ marginTop: 40 }} />
              ) : activeTab === 'weekly' ? (
                <View style={styles.weeklyContent}>
                  <View style={styles.bulkActions}>
                    <TouchableOpacity 
                      style={styles.bulkBtn}
                      onPress={() => {
                        const mon = config['lun'];
                        const newConfig = { ...config };
                        ['mar', 'mie', 'jue', 'vie'].forEach(d => {
                          newConfig[d] = { ...mon };
                        });
                        setConfig(newConfig);
                        Alert.alert("Éxito", "Horario del Lunes copiado a Martes-Viernes");
                      }}
                    >
                      <Ionicons name="copy-outline" size={14} color="#63348C" />
                      <Text style={styles.bulkBtnText}>Copiar Lunes a Viernes</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.daysGrid}>
                    {DAYS.map(day => (
                      <View key={day.id} style={[styles.compactDayCard, isMobile && styles.compactDayCardMobile]}>
                        <View style={styles.compactDayHeader}>
                          <View>
                            <Text style={styles.compactDayLabel}>{day.label}</Text>
                            <Text style={[styles.compactStatusText, config[day.id].isOpen ? styles.statusOpen : styles.statusClosed]}>
                              {config[day.id].isOpen ? 'Abierto' : 'Cerrado'}
                            </Text>
                          </View>
                          <Switch 
                            value={config[day.id].isOpen}
                            onValueChange={() => toggleDay(day.id)}
                            scaleX={0.8} scaleY={0.8}
                            trackColor={{ false: '#E2E8F0', true: '#C7D2FE' }}
                            thumbColor={config[day.id].isOpen ? '#63348C' : '#94A3B8'}
                          />
                        </View>

                        {config[day.id].isOpen && (
                          <View style={styles.compactTimeRow}>
                            <TouchableOpacity 
                              style={styles.compactTimeBtn}
                              onPress={() => openTimePicker(day.id, 'start')}
                            >
                              <Text style={styles.compactTimeText}>{config[day.id].start}</Text>
                            </TouchableOpacity>
                            <Text style={styles.compactTimeDash}>-</Text>
                            <TouchableOpacity 
                              style={styles.compactTimeBtn}
                              onPress={() => openTimePicker(day.id, 'end')}
                            >
                              <Text style={styles.compactTimeText}>{config[day.id].end}</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={styles.holidaysContent}>
                  <Text style={styles.sectionSubtitle}>Días específicos donde la tienda estará cerrada</Text>
                  
                  <View style={styles.holidayForm}>
                    <View style={{ flex: 1.5 }}>
                      <Text style={styles.inputLabel}>Fecha del Feriado</Text>
                      <DatePicker 
                        hideLabel
                        value={newHolidayDate}
                        onChange={setNewHolidayDate}
                        containerStyle={{ marginBottom: 0 }}
                      />
                    </View>
                    <View style={{ flex: 1.5 }}>
                      <Text style={styles.inputLabel}>Motivo del Descanso</Text>
                      <TextInput 
                        style={[styles.input, { height: 50 }]}
                        placeholder="Navidad, Feriado..."
                        value={newHolidayReason}
                        onChangeText={setNewHolidayReason}
                      />
                    </View>
                    <TouchableOpacity style={styles.addHolidayBtn} onPress={addHoliday}>
                      <Ionicons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.holidayList}>
                    {holidays.map((h, i) => (
                      <View key={`${h.date}-${i}`} style={styles.holidayItem}>
                        <View style={styles.holidayInfo}>
                          <Text style={styles.holidayDateText}>{h.date}</Text>
                          <Text style={styles.holidayReasonText}>{h.reason}</Text>
                        </View>
                        <TouchableOpacity onPress={() => removeHoliday(h.date)}>
                          <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    {holidays.length === 0 && (
                      <Text style={styles.emptyHolidaysText}>No hay feriados programados</Text>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]} 
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Guardar Todo</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Internal Time Picker Modal */}
      <Modal visible={timePickerOpen} transparent animationType="fade">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerModal}>
            <Text style={styles.pickerTitle}>Selecciona la Hora</Text>
            <View style={styles.pickerSelectors}>
              <View style={styles.pickerCol}>
                <Text style={styles.pickerColLabel}>HORA</Text>
                <ScrollView showsVerticalScrollIndicator={false} style={{ height: 150 }}>
                  {Array.from({ length: 24 }).map((_, h) => {
                    const val = h < 10 ? `0${h}` : `${h}`;
                    return (
                      <TouchableOpacity 
                        key={h} 
                        style={[styles.pickerItem, tempHour === val && styles.pickerItemActive]}
                        onPress={() => setTempHour(val)}
                      >
                        <Text style={[styles.pickerItemText, tempHour === val && styles.pickerItemTextActive]}>{val}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
              <Text style={styles.pickerDots}>:</Text>
              <View style={styles.pickerCol}>
                <Text style={styles.pickerColLabel}>MIN</Text>
                <ScrollView showsVerticalScrollIndicator={false} style={{ height: 150 }}>
                  {['00', '15', '30', '45'].map(m => (
                    <TouchableOpacity 
                      key={m} 
                      style={[styles.pickerItem, tempMinute === m && styles.pickerItemActive]}
                      onPress={() => setTempMinute(m)}
                    >
                      <Text style={[styles.pickerItemText, tempMinute === m && styles.pickerItemTextActive]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
            <View style={styles.pickerFooter}>
              <TouchableOpacity style={styles.pickerCancel} onPress={() => setTimePickerOpen(false)}>
                <Text style={styles.pickerCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pickerConfirm} onPress={confirmTime}>
                <Text style={styles.pickerConfirmText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  overlayMobile: { padding: 0 },
  modal: { backgroundColor: '#fff', borderRadius: 24, width: '100%', maxWidth: 650, maxHeight: '90%', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },
  modalMobile: { borderRadius: 0, maxHeight: '100%', height: '100%' },
  header: { paddingHorizontal: 24, paddingVertical: 28, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '900', color: '#000', letterSpacing: -0.6 },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 4 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#F8FAFC', padding: 4, marginHorizontal: 24, marginTop: 12, borderRadius: 14, gap: 4 },
  tabContainerMobile: { marginHorizontal: 16 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 8 },
  tabActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '700', color: '#94A3B8' },
  tabTextActive: { color: '#63348C' },

  body: { paddingHorizontal: 24, paddingTop: 20 },
  weeklyContent: { paddingBottom: 20 },
  bulkActions: { marginBottom: 16, alignItems: 'flex-end' },
  bulkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#EEF2FF', borderRadius: 8 },
  bulkBtnText: { fontSize: 11, fontWeight: '700', color: '#63348C' },

  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  compactDayCard: { width: '48.5%', backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4 },
  compactDayCardMobile: { width: '100%' },
  compactDayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  compactDayLabel: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  compactStatusText: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  
  compactTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F8FAFC', padding: 8, borderRadius: 10 },
  compactTimeBtn: { flex: 1, backgroundColor: '#fff', paddingVertical: 6, alignItems: 'center', borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0' },
  compactTimeText: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  compactTimeDash: { color: '#94A3B8', fontWeight: '800' },

  holidaysContent: { paddingBottom: 20 },
  sectionSubtitle: { fontSize: 13, color: '#64748B', marginBottom: 20 },
  holidayForm: { flexDirection: 'row', gap: 10, alignItems: 'flex-end', marginBottom: 24 },
  inputLabel: { fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1E293B', fontWeight: '600' },
  addHolidayBtn: { backgroundColor: '#63348C', width: 50, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  
  holidayList: { gap: 8 },
  holidayItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#F1F5F9' },
  holidayInfo: { gap: 2 },
  holidayDateText: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  holidayReasonText: { fontSize: 12, color: '#64748B' },
  emptyHolidaysText: { fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingVertical: 40 },
  
  footer: { padding: 24, borderTopWidth: 1, borderTopColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  cancelBtnText: { color: '#64748B', fontWeight: '700' },
  saveBtn: { backgroundColor: '#63348C', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12, minWidth: 160, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // Picker Modal
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  pickerModal: { backgroundColor: '#fff', borderRadius: 20, padding: 24, width: 300 },
  pickerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 20 },
  pickerSelectors: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 15 },
  pickerCol: { alignItems: 'center' },
  pickerColLabel: { fontSize: 10, fontWeight: '800', color: '#94A3B8', marginBottom: 8 },
  pickerDots: { fontSize: 24, fontWeight: '900', color: '#CBD5E1', marginTop: 15 },
  pickerItem: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8, marginBottom: 4 },
  pickerItemActive: { backgroundColor: '#EEF2FF' },
  pickerItemText: { fontSize: 16, fontWeight: '600', color: '#64748B' },
  pickerItemTextActive: { color: '#63348C', fontWeight: '800' },
  pickerFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 15, marginTop: 25 },
  pickerCancel: { padding: 10 },
  pickerCancelText: { color: '#64748B', fontWeight: '700' },
  pickerConfirm: { backgroundColor: '#63348C', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  pickerConfirmText: { color: '#fff', fontWeight: '800' },
});
