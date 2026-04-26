import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  Image,
  Modal,
  Alert,
  Dimensions,
  Linking,
} from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, onSnapshot, orderBy, where, Timestamp, getDocs, updateDoc, doc, addDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export default function AgendaScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1200;
  const router = useRouter();
  
  const [citas, setCitas] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState('Pendientes');
  
  // Agenda Configuration
  const [customHours, setCustomHours] = useState<string[]>(['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [newHour, setNewHour] = useState(9);
  const [newMinute, setNewMinute] = useState(0);
  
  const [selectedCita, setSelectedCita] = useState<any>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const openMap = (address: string, lat?: number | null, lng?: number | null) => {
    let url: string;
    if (lat && lng) {
      // Use exact coordinates for precise navigation
      url = Platform.select({
        ios: `maps:${lat},${lng}?q=${lat},${lng}`,
        android: `geo:${lat},${lng}?q=${lat},${lng}`,
        default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      }) || `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    } else {
      // Fallback to address text search
      url = Platform.select({
        ios: `maps:0,0?q=${encodeURIComponent(address || '')}`,
        android: `geo:0,0?q=${encodeURIComponent(address || '')}`,
        default: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || '')}`
      }) || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || '')}`;
    }
    Linking.openURL(url).catch(err => console.error("Error opening maps", err));
  };

  const markAsCompleted = async (id: string) => {
    try {
      const agendaRef = doc(db, 'Agendas', id);
      const agendaSnap = await getDoc(agendaRef);
      
      if (agendaSnap.exists()) {
        const data = agendaSnap.data();
        const usuarioId = data.usuarioId;
        const servicioNombre = data.servicioNombre || data.servicio || 'Servicio';

        await updateDoc(agendaRef, { estado: 'Completadas' });

        if (usuarioId) {
          // Send notification to the user in the store app
          const userRef = doc(db, 'users', usuarioId);
          await addDoc(collection(db, 'notificaciones'), {
            titulo: 'Servicio Completado',
            mensaje: `¡Tu servicio de ${servicioNombre} ha sido completado con éxito!`,
            creadaEn: serverTimestamp(),
            leida: false,
            tipo: 'personal',
            estado: 'completado',
            creador: userRef // Reference to the user in the store
          });
        }
      }

      setDetailModalOpen(false);
      Alert.alert("Éxito", "Cita marcada como completada");
    } catch (error) {
      console.error("Error marking as completed:", error);
      Alert.alert("Error", "No se pudo actualizar el estado");
    }
  };

  // Load Config
  useEffect(() => {
    const q = query(collection(db, 'Configuracion'), where('tipo', '==', 'agenda'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        if (data.customHours) {
          // Sort hours chronologically
          const sorted = [...data.customHours].sort((a, b) => a.localeCompare(b));
          setCustomHours(sorted);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const saveConfig = async (hoursList: string[]) => {
    try {
      const q = query(collection(db, 'Configuracion'), where('tipo', '==', 'agenda'));
      const snapshot = await getDocs(q);
      
      const sortedList = [...hoursList].sort((a, b) => a.localeCompare(b));
      const configData = { 
        tipo: 'agenda', 
        customHours: sortedList,
        updatedAt: Timestamp.now() 
      };
      
      if (snapshot.empty) {
        await addDoc(collection(db, 'Configuracion'), configData);
      } else {
        await updateDoc(doc(db, 'Configuracion', snapshot.docs[0].id), configData);
      }
      setCustomHours(sortedList);
      Alert.alert("Éxito", "Horarios personalizados guardados");
    } catch (error) {
      console.error("Error saving config:", error);
      Alert.alert("Error", "No se pudo guardar");
    }
  };

  useEffect(() => {
    const startRange = new Date(selectedDate);
    if (isDesktop) {
      startRange.setDate(1);
      startRange.setHours(0, 0, 0, 0);
    } else {
      startRange.setHours(0, 0, 0, 0);
    }
    
    const endRange = new Date(selectedDate);
    if (isDesktop) {
      endRange.setMonth(endRange.getMonth() + 1);
      endRange.setDate(0);
      endRange.setHours(23, 59, 59, 999);
    } else {
      endRange.setDate(endRange.getDate() + 3);
      endRange.setHours(23, 59, 59, 999);
    }

    const q = query(
      collection(db, 'Agendas'),
      where('fecha', '>=', Timestamp.fromDate(startRange)),
      where('fecha', '<=', Timestamp.fromDate(endRange)),
      orderBy('fecha', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCitas(list);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching agenda:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedDate, isDesktop]);

  const getWeekDays = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Ajuste para que empiece en lunes
    start.setDate(diff);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const weekDays = getWeekDays(selectedDate);
  
  // Custom Time Slots from list
  const timeSlots = customHours.map(timeStr => {
    const [h, m] = timeStr.split(':').map(Number);
    return { h, m, label: timeStr };
  });

  const filteredCitas = citas.filter(c => {
    if (statusFilter === 'Todas') return true;
    return c.estado === statusFilter;
  });

  const renderDesktopGrid = () => {
    return (
      <View style={styles.canvasContainer}>
        <View style={styles.topControlBar}>
          <View style={styles.topBarLeft}>
            <Text style={styles.canvasTitle}>Agenda Semanal</Text>
            <View style={styles.dateSelector}>
              <TouchableOpacity onPress={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() - 7);
                setSelectedDate(d);
              }} style={styles.navBtn}>
                <Ionicons name="chevron-back" size={18} color="#0F172A" />
              </TouchableOpacity>
              <Text style={styles.dateRangeText}>
                {weekDays[0].toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} — {weekDays[6].toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </Text>
              <TouchableOpacity onPress={() => {
                const d = new Date(selectedDate);
                d.setDate(d.getDate() + 7);
                setSelectedDate(d);
              }} style={styles.navBtn}>
                <Ionicons name="chevron-forward" size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.topBarRight}>
            <View style={styles.filterChipGroup}>
              {['Todas', 'Pendientes', 'Completadas'].map(f => (
                <TouchableOpacity 
                  key={f} 
                  style={[styles.filterChip, statusFilter === f && styles.filterChipActive]}
                  onPress={() => setStatusFilter(f)}
                >
                  <Text style={[styles.filterChipText, statusFilter === f && styles.filterChipTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity 
              style={styles.settingsBtn}
              onPress={() => setConfigModalOpen(true)}
            >
              <Ionicons name="settings-outline" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>


        <View style={styles.canvasGridWrapper}>
          <View style={styles.canvasGridHeader}>
            <View style={styles.hourGutterHeader} />
            {weekDays.map((d, i) => {
              const isToday = d.toDateString() === new Date().toDateString();
              return (
                <View key={i} style={styles.canvasDayHeader}>
                  <Text style={[styles.canvasDayName, isToday && { color: '#6366F1' }]}>
                    {d.toLocaleDateString('es-ES', { weekday: 'long' }).toUpperCase()}
                  </Text>
                  <Text style={[styles.canvasDayNum, isToday && styles.canvasDayNumToday]}>{d.getDate()}</Text>
                </View>
              );
            })}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            <View style={styles.canvasGridBody}>
              {timeSlots.map(slot => (
                <View key={slot.label} style={styles.canvasRow}>
                  <View style={styles.hourGutter}>
                    <Text style={styles.hourText}>
                      {slot.h === 0 ? '12' : slot.h > 12 ? slot.h - 12 : slot.h}:{slot.m < 10 ? `0${slot.m}` : slot.m} {slot.h >= 12 ? 'PM' : 'AM'}
                    </Text>
                  </View>
                  {weekDays.map((day, i) => {
                    const appointments = filteredCitas.filter(c => {
                      const cDate = c.fecha instanceof Timestamp ? c.fecha.toDate() : new Date(c.fecha);
                      return cDate.toDateString() === day.toDateString() && 
                             cDate.getHours() === slot.h && 
                             cDate.getMinutes() === slot.m;
                    });

                    return (
                      <View key={i} style={styles.canvasCell}>
                        {appointments.map(cita => (
                          <TouchableOpacity 
                            key={cita.id} 
                            activeOpacity={0.9}
                            onPress={() => {
                              setSelectedCita(cita);
                              setDetailModalOpen(true);
                            }}
                            style={[styles.canvasCitaCard, { borderLeftColor: cita.estado === 'Completadas' ? '#10B981' : (cita.color || '#6366F1') }]}
                          >
                            <Text style={styles.citaCardTime}>{formatTime(cita.fecha)}</Text>
                            <Text style={styles.citaCardClient} numberOfLines={1}>{cita.clienteNombre || 'Usuario'}</Text>
                            <Text style={styles.citaCardService} numberOfLines={1}>{cita.servicioNombre || 'Servicio'}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    );
  };

  const renderMobileGrid = () => {
    const mobileDays = Array.from({ length: 3 }).map((_, i) => {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + i);
      return d;
    });

    return (
      <View style={styles.mobileContainer}>
        {/* Mobile Header */}
        <View style={styles.mobileHeader}>
          <View style={styles.mobileHeaderSide}>
            <TouchableOpacity onPress={() => router.push('/cuenta')} style={styles.mobileBackBtn}>
              <Ionicons name="arrow-back" size={24} color="#0F172A" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.mobileDateInfo}>
            <Text style={styles.mobileTitle}>Mi Agenda</Text>
            <Text style={styles.mobileSubtitle}>
              {selectedDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
            </Text>
          </View>
          
          <View style={[styles.mobileHeaderSide, { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }]}>
            <TouchableOpacity onPress={() => setConfigModalOpen(true)}>
              <Ionicons name="settings-outline" size={22} color="#64748B" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSelectedDate(new Date())} style={styles.mobileTodayBtn}>
              <Text style={styles.mobileTodayBtnText}>Hoy</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Mobile Status Filter: Added this for user request */}
        <View style={styles.mobileFilterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mobileFilterScroll}>
            {['Todas', 'Pendientes', 'Completadas'].map(f => (
              <TouchableOpacity 
                key={f} 
                style={[styles.mobileFilterChip, statusFilter === f && styles.mobileFilterChipActive]}
                onPress={() => setStatusFilter(f)}
              >
                <View style={[styles.mobileStatusDot, { backgroundColor: f === 'Pendientes' ? '#6366F1' : f === 'Completadas' ? '#10B981' : '#94A3B8' }]} />
                <Text style={[styles.mobileFilterChipText, statusFilter === f && styles.mobileFilterChipTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 3-Day Grid Header */}
        <View style={styles.mobileGridHeader}>
          <View style={styles.mobileTimeGutter} />
          {mobileDays.map((d, i) => {
            const isToday = d.toDateString() === new Date().toDateString();
            return (
              <View key={i} style={styles.mobileDayColHeader}>
                <Text style={[styles.mobileDayName, isToday && { color: '#6366F1' }]}>
                  {d.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()}
                </Text>
                <View style={[styles.mobileDayCircle, isToday && styles.mobileDayCircleToday]}>
                  <Text style={[styles.mobileDayNum, isToday && { color: '#fff' }]}>{d.getDate()}</Text>
                </View>
              </View>
            );
          })}
        </View>


        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={styles.mobileGridBody}>
            {timeSlots.map(slot => (
              <View key={slot.label} style={styles.mobileGridRow}>
                <View style={styles.mobileTimeGutter}>
                  <Text style={styles.mobileHourText}>
                    {slot.h > 12 ? slot.h - 12 : slot.h === 0 ? 12 : slot.h}:{slot.m < 10 ? `0${slot.m}` : slot.m}
                  </Text>
                </View>
                {mobileDays.map((day, i) => {
                  const appointments = filteredCitas.filter(c => {
                    const cDate = c.fecha instanceof Timestamp ? c.fecha.toDate() : new Date(c.fecha);
                    return cDate.toDateString() === day.toDateString() && 
                           cDate.getHours() === slot.h && 
                           cDate.getMinutes() === slot.m;
                  });

                  return (
                    <View key={i} style={styles.mobileGridCell}>
                      {appointments.map(cita => (
                        <TouchableOpacity 
                          onPress={() => {
                            setSelectedCita(cita);
                            setDetailModalOpen(true);
                          }}
                          key={cita.id} 
                          style={[styles.mobileCitaCard, { backgroundColor: cita.estado === 'Completadas' ? '#10B98120' : `${cita.color || '#6366F1'}20`, borderLeftColor: cita.estado === 'Completadas' ? '#10B981' : (cita.color || '#6366F1') }]}
                        >
                          <Text style={styles.mobileCitaTime}>{formatTime(cita.fecha)}</Text>
                          <Text style={styles.mobileCitaClient} numberOfLines={1}>{cita.clienteNombre || 'User'}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };


  const formatTime = (timestamp: any) => {
    if (!timestamp) return '--:--';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const renderConfigModal = () => (
    <Modal
      visible={configModalOpen}
      transparent
      animationType="fade"
      onRequestClose={() => setConfigModalOpen(false)}
    >
      <View style={styles.premiumOverlay}>
        <View style={[styles.premiumModal, isDesktop && styles.premiumModalWide]}>
          <View style={styles.premiumHeader}>
            <View>
              <Text style={styles.premiumModalTitle}>Personalizar Agenda</Text>
              <Text style={styles.premiumModalSubtitle}>Define tus horarios disponibles uno por uno</Text>
            </View>
            <TouchableOpacity onPress={() => setConfigModalOpen(false)} style={styles.premiumCloseBtn}>
              <Ionicons name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={[styles.premiumBody, isDesktop && styles.premiumBodyDesktop]}>
            {/* Column 1: Time Selector Grid */}
            <View style={styles.gridSelectorColumn}>
              <Text style={styles.columnLabel}>1. Selecciona la Hora</Text>
              <View style={styles.hourGridContainer}>
                {Array.from({ length: 24 }).map((_, h) => {
                  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
                  const ampm = h >= 12 ? 'PM' : 'AM';
                  return (
                    <TouchableOpacity 
                      key={h} 
                      style={[styles.gridHourBtn, newHour === h && styles.gridHourBtnActive]}
                      onPress={() => setNewHour(h)}
                    >
                      <Text style={[styles.gridHourText, newHour === h && styles.gridHourTextActive]}>
                        {displayH} {ampm}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.columnLabel, { marginTop: 24 }]}>2. Selecciona los Minutos</Text>
              <View style={styles.minuteRow}>
                {[0, 15, 30, 45].map(m => (
                  <TouchableOpacity 
                    key={m} 
                    style={[styles.gridMinBtn, newMinute === m && styles.gridMinBtnActive]}
                    onPress={() => setNewMinute(m)}
                  >
                    <Text style={[styles.gridMinText, newMinute === m && styles.gridMinTextActive]}>
                      {m < 10 ? `0${m}` : m} min
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity 
                style={styles.actionAddBtn}
                onPress={() => {
                  const timeStr = `${newHour < 10 ? `0${newHour}` : newHour}:${newMinute < 10 ? `0${newMinute}` : newMinute}`;
                  if (customHours.includes(timeStr)) return Alert.alert("Aviso", "Este horario ya existe");
                  saveConfig([...customHours, timeStr]);
                }}
              >
                <Ionicons name="add-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.actionAddBtnText}>Agregar Horario</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => saveConfig(['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'])}
                style={styles.quickFillLink}
              >
                <Text style={styles.quickFillLinkText}>O pre-llenar de 9 AM a 6 PM</Text>
              </TouchableOpacity>
            </View>

            {/* Column 2: List Management */}
            <View style={styles.gridListColumn}>
              <View style={styles.columnHeaderRow}>
                <Text style={styles.columnLabel}>Horarios en la Agenda ({customHours.length})</Text>
                {customHours.length > 0 && (
                  <TouchableOpacity onPress={() => saveConfig([])}>
                    <Text style={styles.dangerLink}>Limpiar</Text>
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={styles.hourListScroll}>
                <View style={styles.hourCardsRow}>
                  {customHours.map(time => {
                    const [h, m] = time.split(':').map(Number);
                    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    return (
                      <View key={time} style={styles.hourBadge}>
                        <Text style={styles.hourBadgeText}>{displayH}:{m < 10 ? `0${m}` : m} {ampm}</Text>
                        <TouchableOpacity 
                          onPress={() => saveConfig(customHours.filter(h => h !== time))}
                          style={styles.hourBadgeClose}
                        >
                          <Ionicons name="close" size={14} color="#64748B" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                  {customHours.length === 0 && (
                    <View style={styles.gridEmptyState}>
                      <Ionicons name="time-outline" size={44} color="#E2E8F0" />
                      <Text style={styles.gridEmptyText}>No hay horarios</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>

          <View style={styles.gridFooter}>
            <TouchableOpacity 
              style={styles.gridDoneBtn}
              onPress={() => setConfigModalOpen(false)}
            >
              <Text style={styles.gridDoneBtnText}>Guardar y Finalizar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderMobileDetail = () => (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={[styles.mobileDetailHeader, { backgroundColor: selectedCita?.color || '#6366F1' }]}>
        <TouchableOpacity onPress={() => setDetailModalOpen(false)} style={styles.mobileDetailBack}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={styles.mobileDetailCategory}>{selectedCita?.categoria || 'SERVICIO'}</Text>
          <Text style={styles.mobileDetailTitle} numberOfLines={1}>{selectedCita?.servicioNombre || 'Servicio'}</Text>
        </View>
        <View style={[styles.mobileStatusPill, { backgroundColor: selectedCita?.estado === 'Completadas' ? '#10B981' : 'rgba(255,255,255,0.25)' }]}>
          <Text style={styles.mobileStatusPillText}>{selectedCita?.estado || 'Pendiente'}</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        <View style={styles.mobileInfoGroup}>
          <View style={styles.mobileInfoRow}>
            <View style={[styles.mobileInfoIcon, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="person" size={18} color="#6366F1" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mobileInfoLabel}>Cliente</Text>
              <Text style={styles.mobileInfoValue}>{selectedCita?.clienteNombre || 'Usuario'}</Text>
            </View>
          </View>
          <View style={styles.mobileInfoDivider} />
          <View style={styles.mobileInfoRow}>
            <View style={[styles.mobileInfoIcon, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="calendar" size={18} color="#6366F1" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mobileInfoLabel}>Fecha y Hora</Text>
              <Text style={styles.mobileInfoValue}>{selectedCita?.fecha ? (selectedCita.fecha instanceof Timestamp ? selectedCita.fecha.toDate() : new Date(selectedCita.fecha)).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : ''} — {formatTime(selectedCita?.fecha)}</Text>
            </View>
          </View>
          <View style={styles.mobileInfoDivider} />
          <View style={styles.mobileInfoRow}>
            <View style={[styles.mobileInfoIcon, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="location" size={18} color="#6366F1" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mobileInfoLabel}>Dirección</Text>
              <Text style={styles.mobileInfoValue}>{selectedCita?.clienteUbicacion || 'Sin ubicación'}</Text>
            </View>
          </View>
          {selectedCita?.animal ? (
            <>
              <View style={styles.mobileInfoDivider} />
              <View style={styles.mobileInfoRow}>
                <View style={[styles.mobileInfoIcon, { backgroundColor: '#EEF2FF' }]}>
                  <Ionicons name="paw" size={18} color="#6366F1" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mobileInfoLabel}>Mascota</Text>
                  <Text style={styles.mobileInfoValue}>{selectedCita.animal}</Text>
                </View>
              </View>
            </>
          ) : null}
          {selectedCita?.descripcion ? (
            <>
              <View style={styles.mobileInfoDivider} />
              <View style={styles.mobileInfoRow}>
                <View style={[styles.mobileInfoIcon, { backgroundColor: '#EEF2FF' }]}>
                  <Ionicons name="document-text" size={18} color="#6366F1" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mobileInfoLabel}>Descripción</Text>
                  <Text style={styles.mobileInfoValue}>{selectedCita.descripcion}</Text>
                </View>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.mobileDetailFooter}>
        <TouchableOpacity style={[styles.primaryActionButton, { flex: 1 }]} onPress={() => openMap(selectedCita?.clienteUbicacion, selectedCita?.clienteLat, selectedCita?.clienteLng)}>
          <Ionicons name="navigate" size={18} color="#fff" />
          <Text style={styles.primaryActionButtonText}>Trazar Ruta</Text>
        </TouchableOpacity>
        {selectedCita?.estado !== 'Completadas' ? (
          <TouchableOpacity style={[styles.secondaryActionButton, { flex: 1 }]} onPress={() => markAsCompleted(selectedCita.id)}>
            <Ionicons name="checkmark-done" size={18} color="#10B981" />
            <Text style={styles.secondaryActionButtonText}>Completado</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  const renderDetailContent = () => (
    <ScrollView bounces={false} contentContainerStyle={{ flexGrow: 1 }} style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', flex: 1 }}>
        <View style={[styles.modalVisualSide, { backgroundColor: selectedCita?.color || '#6366F1', width: 320, padding: 40 }]}>
          <TouchableOpacity onPress={() => setDetailModalOpen(false)} style={styles.modalVisualClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ marginTop: 20 }}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{selectedCita?.categoria || 'SERVICIO'}</Text>
            </View>
            <Text style={styles.visualServiceName}>{selectedCita?.servicioNombre || 'Servicio'}</Text>
            <View style={styles.visualStatusRow}>
              <View style={[styles.statusDot, { backgroundColor: selectedCita?.estado === 'Completadas' ? '#10B981' : '#fff' }]} />
              <Text style={styles.visualStatusText}>{selectedCita?.estado || 'Pendiente'}</Text>
            </View>
          </View>
        </View>
        <View style={[styles.modalContentSide, { flex: 1, padding: 50 }]}>
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Información del Cliente</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoIconBox}><Ionicons name="person" size={20} color="#6366F1" /></View>
              <View><Text style={styles.infoLabel}>Nombre Completo</Text><Text style={styles.infoValue}>{selectedCita?.clienteNombre || 'Usuario'}</Text></View>
            </View>
            <View style={styles.infoCard}>
              <View style={styles.infoIconBox}><Ionicons name="time" size={20} color="#6366F1" /></View>
              <View><Text style={styles.infoLabel}>Horario Reservado</Text><Text style={styles.infoValue}>{selectedCita?.fecha ? (selectedCita.fecha instanceof Timestamp ? selectedCita.fecha.toDate() : new Date(selectedCita.fecha)).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : ''} a las {formatTime(selectedCita?.fecha)}</Text></View>
            </View>
            <View style={styles.infoCard}>
              <View style={styles.infoIconBox}><Ionicons name="location" size={20} color="#6366F1" /></View>
              <View style={{ flex: 1 }}><Text style={styles.infoLabel}>Ubicación del Servicio</Text><Text style={styles.infoValue} numberOfLines={2}>{selectedCita?.clienteUbicacion || 'Sin ubicación'}</Text></View>
            </View>
            {selectedCita?.animal ? (<View style={styles.infoCard}><View style={styles.infoIconBox}><Ionicons name="paw" size={20} color="#6366F1" /></View><View><Text style={styles.infoLabel}>Mascota</Text><Text style={styles.infoValue}>{selectedCita.animal}</Text></View></View>) : null}
            {selectedCita?.descripcion ? (<View style={styles.infoCard}><View style={styles.infoIconBox}><Ionicons name="document-text" size={20} color="#6366F1" /></View><View style={{ flex: 1 }}><Text style={styles.infoLabel}>Descripción</Text><Text style={styles.infoValue}>{selectedCita.descripcion}</Text></View></View>) : null}
          </View>
          <View style={[styles.actionGroup, { marginTop: 40 }]}>
            <TouchableOpacity style={styles.primaryActionButton} onPress={() => openMap(selectedCita?.clienteUbicacion, selectedCita?.clienteLat, selectedCita?.clienteLng)}>
              <Ionicons name="navigate" size={20} color="#fff" /><Text style={styles.primaryActionButtonText}>Trazar Ruta (Maps/Waze)</Text>
            </TouchableOpacity>
            {selectedCita?.estado !== 'Completadas' ? (
              <TouchableOpacity style={styles.secondaryActionButton} onPress={() => markAsCompleted(selectedCita.id)}>
                <Ionicons name="checkmark-done" size={20} color="#10B981" /><Text style={styles.secondaryActionButtonText}>Marcar como Completado</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderDetailModal = () => {
    if (isDesktop) {
      return (
        <Modal visible={detailModalOpen} transparent animationType="fade" onRequestClose={() => setDetailModalOpen(false)}>
          <View style={styles.premiumOverlay}>
            <View style={[styles.premiumModal, styles.premiumModalDesktop]}>
              {renderDetailContent()}
            </View>
          </View>
        </Modal>
      );
    }
    if (!detailModalOpen) return null;
    return (
      <View style={styles.mobileDetailOverlay}>
        {renderMobileDetail()}
      </View>
    );
  };

  return (
    <>
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        {isDesktop ? renderDesktopGrid() : renderMobileGrid()}
        {renderConfigModal()}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#6366F1" />
          </View>
        )}
      </SafeAreaView>
      {renderDetailModal()}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  canvasContainer: { flex: 1, backgroundColor: '#FFFFFF', padding: 32 },
  topControlBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 40 },
  canvasTitle: { fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: -1 },
  dateSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 6, borderWidth: 1, borderColor: '#E2E8F0' },
  navBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  dateRangeText: { fontSize: 15, fontWeight: '700', color: '#0F172A', paddingHorizontal: 16 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  filterChipGroup: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  filterChipActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  filterChipTextActive: { color: '#0F172A', fontWeight: '800' },
  primaryActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#6366F1', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  primaryActionBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  canvasGridWrapper: { flex: 1, backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden' },
  canvasGridHeader: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  hourGutterHeader: { width: 100 },
  canvasDayHeader: { flex: 1, paddingVertical: 20, alignItems: 'center', borderLeftWidth: 1, borderLeftColor: '#F1F5F9' },
  canvasDayName: { fontSize: 11, fontWeight: '800', color: '#94A3B8', marginBottom: 4 },
  canvasDayNum: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  canvasDayNumToday: { color: '#6366F1' },
  canvasGridBody: { backgroundColor: '#fff' },
  canvasRow: { flexDirection: 'row', minHeight: 110, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  hourGutter: { width: 100, alignItems: 'center', paddingTop: 12 },
  hourText: { fontSize: 12, fontWeight: '800', color: '#475569' },
  canvasCell: { flex: 1, borderLeftWidth: 1, borderLeftColor: '#F1F5F9', padding: 6, gap: 6 },
  canvasCitaCard: { backgroundColor: '#fff', borderRadius: 10, padding: 10, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  citaCardTime: { fontSize: 10, fontWeight: '900', color: '#94A3B8', marginBottom: 4 },
  citaCardClient: { fontSize: 13, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  citaCardService: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  
  mobileContainer: { flex: 1, backgroundColor: '#fff' },
  mobileHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  mobileHeaderSide: { width: 60 },
  mobileBackBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#F8FAFC' },
  mobileDateInfo: { flex: 1, alignItems: 'center' },
  mobileTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A', textAlign: 'center' },
  mobileSubtitle: { fontSize: 13, color: '#64748B', textTransform: 'capitalize', textAlign: 'center', marginTop: 2 },
  mobileTodayBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#6366F1' },
  mobileTodayBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  
  mobileGridHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#fff' },
  mobileTimeGutter: { width: 50, borderRightWidth: 1, borderRightColor: '#F8FAFC' },
  mobileDayColHeader: { flex: 1, alignItems: 'center', paddingVertical: 12, borderLeftWidth: 1, borderLeftColor: '#F8FAFC' },
  mobileDayName: { fontSize: 9, fontWeight: '800', color: '#94A3B8', marginBottom: 4 },
  mobileDayCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  mobileDayCircleToday: { backgroundColor: '#6366F1' },
  mobileDayNum: { fontSize: 14, fontWeight: '900', color: '#0F172A' },
  
  mobileGridBody: { backgroundColor: '#fff' },
  mobileGridRow: { flexDirection: 'row', minHeight: 80, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  mobileHourText: { fontSize: 10, fontWeight: '800', color: '#94A3B8', marginTop: 8, textAlign: 'center' },
  mobileGridCell: { flex: 1, borderLeftWidth: 1, borderLeftColor: '#F8FAFC', padding: 2, gap: 2 },
  
  mobileCitaCard: { borderRadius: 4, padding: 4, borderLeftWidth: 2, flex: 1 },
  mobileCitaTime: { fontSize: 8, fontWeight: '900', marginBottom: 1 },
  mobileCitaClient: { fontSize: 9, fontWeight: '800', color: '#0F172A' },
  
  mobileFab: { position: 'absolute', bottom: 30, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },

  settingsBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', marginLeft: 8 },

  // Premium Modal Styles
  premiumOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center' },
  premiumModal: { backgroundColor: '#FFFFFF', width: '100%', height: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 30, elevation: 15, overflow: 'hidden' },
  premiumModalDesktop: { maxWidth: 850, height: 'auto', borderRadius: 32, margin: 20, shadowOpacity: 0.2 },
  premiumModalWide: { width: 600 },

  // New Detailed Modal Styles
  modalVisualSide: { justifyContent: 'center' },
  modalVisualClose: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  categoryBadge: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 15 },
  categoryBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  visualServiceName: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: -1, marginBottom: 10 },
  visualStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  visualStatusText: { color: '#fff', fontSize: 14, fontWeight: '700', opacity: 0.9 },

  modalContentSide: { backgroundColor: '#fff' },
  detailSection: { gap: 15 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 15, backgroundColor: '#F8FAFC', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  infoIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
  infoLabel: { fontSize: 11, fontWeight: '600', color: '#64748B', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '800', color: '#0F172A' },

  actionGroup: { gap: 12 },
  primaryActionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#6366F1', paddingVertical: 18, borderRadius: 16, shadowColor: '#6366F1', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 15 },
  primaryActionButtonText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  secondaryActionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#fff', paddingVertical: 18, borderRadius: 16, borderWidth: 1.5, borderColor: '#10B981' },
  secondaryActionButtonText: { color: '#10B981', fontSize: 15, fontWeight: '900' },

  mobileDetailOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, backgroundColor: '#fff', flex: 1 },
  mobileDetailHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 18, paddingTop: 50 },
  mobileDetailBack: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  mobileDetailCategory: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  mobileDetailTitle: { fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  mobileStatusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  mobileStatusPillText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  mobileInfoGroup: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  mobileInfoRow: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14 },
  mobileInfoDivider: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 70 },
  mobileInfoIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  mobileInfoLabel: { fontSize: 11, fontWeight: '600', color: '#94A3B8', marginBottom: 3 },
  mobileInfoValue: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  mobileDetailFooter: { flexDirection: 'row', gap: 12, padding: 20, paddingBottom: 34, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },

  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  configModal: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 450, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  modalBody: { marginBottom: 32 },
  inputLabel: { fontSize: 14, fontWeight: '700', color: '#64748B', marginBottom: 12 },
  hourInputGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hourOption: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  hourOptionActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  hourOptionText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  hourOptionTextActive: { color: '#fff' },
  // Fixed Premium Modal Styles
  premiumOverlay: { 
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
    backgroundColor: 'rgba(15, 23, 42, 0.6)', 
    justifyContent: 'center', alignItems: 'center', 
    zIndex: 9999 
  },
  premiumModal: { 
    backgroundColor: '#fff', 
    borderRadius: 24, 
    width: '90%', 
    maxWidth: 500, 
    maxHeight: '90%',
    overflow: 'hidden', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 10 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 20, 
    elevation: 10 
  },
  premiumModalWide: { maxWidth: 1000 },
  
  premiumHeader: { 
    paddingHorizontal: 24, paddingVertical: 20, 
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' 
  },
  premiumModalTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  premiumModalSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  premiumCloseBtn: { padding: 8, borderRadius: 10, backgroundColor: '#F8FAFC' },
  
  premiumBody: { padding: 24 },
  premiumBodyDesktop: { flexDirection: 'row', minHeight: 450 },
  
  gridSelectorColumn: { flex: 1.3, borderRightWidth: 1, borderRightColor: '#F1F5F9', paddingRight: 24 },
  gridListColumn: { flex: 0.7, paddingLeft: 24 },
  
  columnLabel: { fontSize: 11, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
  hourGridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  gridHourBtn: { width: '23.5%', paddingVertical: 10, alignItems: 'center', borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  gridHourBtnActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  gridHourText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  gridHourTextActive: { color: '#fff' },
  
  minuteRow: { flexDirection: 'row', gap: 8 },
  gridMinBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  gridMinBtnActive: { backgroundColor: '#EEF2FF', borderColor: '#6366F1' },
  gridMinText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  gridMinTextActive: { color: '#6366F1' },
  
  actionAddBtn: { backgroundColor: '#6366F1', paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  actionAddBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  quickFillLink: { alignSelf: 'center', marginTop: 12 },
  quickFillLinkText: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  
  columnHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  dangerLink: { fontSize: 11, fontWeight: '700', color: '#EF4444' },
  hourListScroll: { flex: 1 },
  hourCardsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  hourBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 10, paddingRight: 6, paddingVertical: 6, borderRadius: 10, backgroundColor: '#F1F5F9', marginBottom: 4 },
  hourBadgeText: { fontSize: 12, fontWeight: '800', color: '#0F172A' },
  hourBadgeClose: { padding: 2 },
  
  gridEmptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  gridEmptyText: { fontSize: 13, color: '#94A3B8', marginTop: 10, fontWeight: '600' },
  
  gridFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9', alignItems: 'flex-end' },
  gridDoneBtn: { backgroundColor: '#0F172A', paddingHorizontal: 30, paddingVertical: 14, borderRadius: 12 },
  gridDoneBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  // Mobile Filter Styles
  mobileFilterBar: { paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  mobileFilterScroll: { paddingHorizontal: 20, gap: 10 },
  mobileFilterChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  mobileFilterChipActive: { backgroundColor: '#EEF2FF', borderColor: '#6366F1' },
  mobileStatusDot: { width: 6, height: 6, borderRadius: 3 },
  mobileFilterChipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  mobileFilterChipTextActive: { color: '#6366F1', fontWeight: '800' },
});

