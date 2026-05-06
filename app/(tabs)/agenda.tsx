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
  Switch,
  TextInput,
} from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, onSnapshot, orderBy, where, Timestamp, getDocs, updateDoc, doc, addDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';

export default function AgendaScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1200;
  const router = useRouter();
  
  const [citas, setCitas] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState('Pendientes');
  const [miniCalMonth, setMiniCalMonth] = useState(new Date());
  const [touchStart, setTouchStart] = useState<number | null>(null);
  
  // Agenda Configuration
  const [customHours, setCustomHours] = useState<string[]>(['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [newHour, setNewHour] = useState(9);
  const [newMinute, setNewMinute] = useState(0);
  
  // Advanced Config
  const [agendaActiva, setAgendaActiva] = useState(true);
  const [mensajePublico, setMensajePublico] = useState('');
  const [diasLibres, setDiasLibres] = useState<number[]>([0]); // 0=Dom
  const [fechasBloqueadas, setFechasBloqueadas] = useState<string[]>([]);
  const [showExcCal, setShowExcCal] = useState(false);
  const [excMonth, setExcMonth] = useState(new Date());
  const [showAddHora, setShowAddHora] = useState(false);
  
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

          // Send Push Notification
          await addDoc(collection(db, 'ff_user_push_notifications'), {
            initial_page_name: 'orders', // Or a more relevant page if available
            notification_text: `¡Tu servicio de ${servicioNombre} ha sido completado con éxito!`,
            notification_title: '✅ Servicio Completado',
            num_sent: 1,
            parameter_data: JSON.stringify({ agendaId: id }),
            sender: doc(db, 'users', auth.currentUser?.uid || 'admin'),
            status: 'pending',
            app_target: 'tienda',
            timestamp: serverTimestamp(),
            user_refs: `users/${usuarioId}`
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
          const sorted = [...data.customHours].sort((a, b) => a.localeCompare(b));
          setCustomHours(sorted);
        }
        if (data.agendaActiva !== undefined) setAgendaActiva(data.agendaActiva);
        if (data.mensajePublico !== undefined) setMensajePublico(data.mensajePublico);
        if (data.diasLibres !== undefined) setDiasLibres(data.diasLibres);
        if (data.fechasBloqueadas !== undefined) setFechasBloqueadas(data.fechasBloqueadas);
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
        agendaActiva,
        mensajePublico,
        diasLibres,
        fechasBloqueadas,
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
    const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const calYear = miniCalMonth.getFullYear();
    const calMonth = miniCalMonth.getMonth();
    const firstDow = new Date(calYear, calMonth, 1).getDay();
    const offset = firstDow === 0 ? 6 : firstDow - 1;
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const calDays: (number | null)[] = [
      ...Array(offset).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
    ];
    const weekStart = weekDays[0];
    const weekEnd = weekDays[6];
    const semanaLabel = `Semana del ${weekDays[0].getDate()} de ${monthNames[weekDays[0].getMonth()].toLowerCase()}`;

    return (
      <View style={styles.agendaOuter}>

        {/* ── LEFT SIDEBAR ── */}
        <View style={styles.agendaSidebar}>
          <Text style={styles.sidebarTitle}>Agenda</Text>

          {/* Mini Calendar */}
          <View style={styles.miniCal}>
            <View style={styles.miniCalHeader}>
              <TouchableOpacity onPress={() => { const d = new Date(miniCalMonth); d.setMonth(d.getMonth()-1); setMiniCalMonth(d); }}>
                <Ionicons name="chevron-back" size={16} color="#475569" />
              </TouchableOpacity>
              <Text style={styles.miniCalTitle}>{monthNames[calMonth]} {calYear}</Text>
              <TouchableOpacity onPress={() => { const d = new Date(miniCalMonth); d.setMonth(d.getMonth()+1); setMiniCalMonth(d); }}>
                <Ionicons name="chevron-forward" size={16} color="#475569" />
              </TouchableOpacity>
            </View>
            <View style={styles.miniCalGrid}>
              {['L','M','M','J','V','S','D'].map((wd, i) => (
                <Text key={i} style={styles.miniCalDow}>{wd}</Text>
              ))}
              {calDays.map((day, i) => {
                if (!day) return <View key={`e${i}`} style={styles.miniCalDay} />;
                const d = new Date(calYear, calMonth, day);
                const isToday = d.toDateString() === new Date().toDateString();
                const inWeek = d >= weekStart && d <= weekEnd;
                const dayCitas = citas.filter(c => { const cd = c.fecha?.toDate ? c.fecha.toDate() : new Date(c.fecha); return cd.toDateString() === d.toDateString(); });
                const hasPendientes = dayCitas.some(c => c.estado !== 'Completadas');
                const hasCompletadas = dayCitas.some(c => c.estado === 'Completadas');
                return (
                  <TouchableOpacity key={i} style={[styles.miniCalDay, isToday && styles.miniCalDayToday, inWeek && !isToday && styles.miniCalDayInWeek]} onPress={() => { setSelectedDate(d); setMiniCalMonth(d); }}>
                    <Text style={[styles.miniCalDayTxt, isToday && styles.miniCalDayTxtToday, inWeek && !isToday && styles.miniCalDayTxtInWeek]}>{day}</Text>
                    {(!isToday) && (hasPendientes || hasCompletadas) && (
                      <View style={{ flexDirection: 'row', gap: 2, marginTop: 1 }}>
                        {hasPendientes && <View style={[styles.miniCalDot, { backgroundColor: '#63348C' }]} />}
                        {hasCompletadas && <View style={[styles.miniCalDot, { backgroundColor: '#10B981' }]} />}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Estado */}
          <Text style={styles.sidebarSectionLabel}>ESTADO</Text>
          {[{label:'Pendientes',color:'#63348C'},{label:'Completadas',color:'#10B981'},{label:'Todas',color:'#94A3B8'}].map(({label, color}) => (
            <TouchableOpacity key={label} style={[styles.statusOption, statusFilter===label && styles.statusOptionActive]} onPress={() => setStatusFilter(label)}>
              <View style={[styles.statusDotLeft, {backgroundColor: color}]} />
              <Text style={[styles.statusOptionTxt, statusFilter===label && styles.statusOptionTxtActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── RIGHT PANEL ── */}
        <View style={styles.agendaRight}>
          {/* Header */}
          <View style={styles.rpHeader}>
            <View>
              <Text style={styles.rpTitle}>{semanaLabel}</Text>
              <Text style={styles.rpSubtitle}>{filteredCitas.length} citas filtradas</Text>
            </View>
            <View style={styles.rpBtns}>
              <View style={styles.rpWeekNav}>
                <TouchableOpacity style={styles.rpNavBtn} onPress={() => { const d = new Date(selectedDate); d.setDate(d.getDate()-7); setSelectedDate(d); }}>
                  <Ionicons name="chevron-back" size={18} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.rpNavLabel}>Semana</Text>
                <TouchableOpacity style={styles.rpNavBtn} onPress={() => { const d = new Date(selectedDate); d.setDate(d.getDate()+7); setSelectedDate(d); }}>
                  <Ionicons name="chevron-forward" size={18} color="#0F172A" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.rpSecBtn} onPress={() => setConfigModalOpen(true)}>
                <Ionicons name="settings-outline" size={16} color="#475569" />
                <Text style={styles.rpSecBtnTxt}>Horarios</Text>
              </TouchableOpacity>
              {/* <TouchableOpacity style={styles.rpPrimBtn}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.rpPrimBtnTxt}>Nueva Cita</Text>
              </TouchableOpacity> */}
            </View>
          </View>

          {/* Grid */}
          <View style={styles.rpGridWrap}>
            <View style={styles.rpGridHeader}>
              <View style={styles.rpHourCol} />
              {weekDays.map((d, i) => {
                const isToday = d.toDateString() === new Date().toDateString();
                return (
                  <View key={i} style={styles.rpDayHeader}>
                    <Text style={[styles.rpDayName, isToday && {color:'#63348C'}]}>
                      {d.toLocaleDateString('es-ES',{weekday:'short'}).toUpperCase()}
                    </Text>
                    <View style={[styles.rpDayCircle, isToday && styles.rpDayCircleToday]}>
                      <Text style={[styles.rpDayNum, isToday && styles.rpDayNumToday]}>{d.getDate()}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={{flex:1}}>
              <View>
                {timeSlots.map(slot => (
                  <View key={slot.label} style={styles.rpRow}>
                    <View style={styles.rpHourCol}>
                      <Text style={styles.rpHourTxt}>
                        {slot.h===0?'12':slot.h>12?slot.h-12:slot.h}:{slot.m<10?`0${slot.m}`:slot.m} {slot.h>=12?'PM':'AM'}
                      </Text>
                    </View>
                    {weekDays.map((day, i) => {
                      const appts = filteredCitas.filter(c => {
                        const cd = c.fecha instanceof Timestamp ? c.fecha.toDate() : new Date(c.fecha);
                        return cd.toDateString()===day.toDateString() && cd.getHours()===slot.h && cd.getMinutes()===slot.m;
                      });
                      const isToday = day.toDateString()===new Date().toDateString();
                      return (
                        <View key={i} style={[styles.rpCell, isToday && styles.rpCellToday]}>
                          {appts.map(cita => {
                            const col = cita.estado==='Completadas' ? '#10B981' : (cita.color||'#63348C');
                            return (
                              <TouchableOpacity key={cita.id} activeOpacity={0.85}
                                onPress={() => {setSelectedCita(cita); setDetailModalOpen(true);}}
                                style={[styles.rpCitaCard, {backgroundColor: col}]}>
                                <Text style={styles.rpCitaName} numberOfLines={1}>{cita.clienteNombre || cita.nombre || cita.nombreCliente || cita.clientName || 'Cliente'}</Text>
                                <View style={{flexDirection:'row', alignItems:'center', gap:4, marginTop:2}}>
                                  <Text style={styles.rpCitaService} numberOfLines={1}>{cita.servicioNombre||'Servicio'}</Text>
                                  {cita.equipo && <View style={styles.rpEquipoBadge}><Text style={styles.rpEquipoTxt}>EQUIPO</Text></View>}
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </View>
    );
  };

  const renderDesktopGrid_UNUSED = () => {
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
                  <Text style={[styles.canvasDayName, isToday && { color: '#63348C' }]}>
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
                            style={[styles.canvasCitaCard, { borderLeftColor: cita.estado === 'Completadas' ? '#63348C' : (cita.color || '#63348C') }]}
                          >
                            <Text style={styles.citaCardTime}>{formatTime(cita.fecha)}</Text>
                            <Text style={styles.citaCardClient} numberOfLines={1}>{cita.clienteNombre || cita.nombre || cita.nombreCliente || cita.clientName || 'Usuario'}</Text>
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

    const handleTouchStart = (e: any) => {
      if (Platform.OS === 'web') return;
      setTouchStart(e.nativeEvent.pageX);
    };

    const handleTouchEnd = (e: any) => {
      if (Platform.OS === 'web' || touchStart === null) return;
      const touchEnd = e.nativeEvent.pageX;
      const dx = touchEnd - touchStart;
      
      if (Math.abs(dx) > 60) {
        const d = new Date(selectedDate);
        if (dx < -60) {
          // Swipe Left (Finger moves <-)
          // User: "deslizar a la izquierda cambia hacia tras"
          d.setDate(d.getDate() - 1);
        } else {
          // Swipe Right (Finger moves ->)
          // User: "hacia la derecha muestra las siguientes"
          d.setDate(d.getDate() + 1);
        }
        setSelectedDate(d);
      }
      setTouchStart(null);
    };

    return (
      <View 
        style={styles.mobileContainer}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
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
                <View style={[styles.mobileStatusDot, { backgroundColor: f === 'Pendientes' ? '#63348C' : f === 'Completadas' ? '#63348C' : '#94A3B8' }]} />
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
                <Text style={[styles.mobileDayName, isToday && { color: '#63348C' }]}>
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
                          style={[styles.mobileCitaCard, { backgroundColor: cita.estado === 'Completadas' ? '#63348C20' : `${cita.color || '#63348C'}20`, borderLeftColor: cita.estado === 'Completadas' ? '#63348C' : (cita.color || '#63348C') }]}
                        >
                          <Text style={styles.mobileCitaTime}>{formatTime(cita.fecha)}</Text>
                          <Text style={styles.mobileCitaClient} numberOfLines={1}>{cita.clienteNombre || cita.nombre || cita.nombreCliente || cita.clientName || 'Usuario'}</Text>
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
      animationType="slide"
      onRequestClose={() => setConfigModalOpen(false)}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
          <TouchableOpacity onPress={() => setConfigModalOpen(false)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="chevron-back" size={20} color="#64748B" />
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#64748B' }}>Volver</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ backgroundColor: '#10B981', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }} onPress={() => { saveConfig(customHours); setConfigModalOpen(false); }}>
            <Ionicons name="save-outline" size={16} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>Guardar Cambios</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: isDesktop ? 24 : 16, paddingBottom: 40 }}>
          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: isDesktop ? 24 : 16, maxWidth: 1200, alignSelf: 'center', width: '100%' }}>
            
            {/* LEFT COLUMN / GENERAL CONFIG */}
            <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: isDesktop ? 16 : 20, padding: isDesktop ? 24 : 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1, borderColor: '#F1F5F9' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: isDesktop ? 32 : 24 }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#63348C', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="calendar" size={22} color="#fff" />
                </View>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: '#0F172A' }}>Configuración</Text>
                  <Text style={{ fontSize: 12, color: '#94A3B8' }}>Panel de Control</Text>
                </View>
              </View>

              <Text style={styles.sidebarSectionLabel}>ESTADO DE LA AGENDA</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 12, backgroundColor: agendaActiva ? '#ECFDF5' : '#F8FAFC', borderWidth: 1, borderColor: agendaActiva ? '#A7F3D0' : '#E2E8F0', marginBottom: 24 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: agendaActiva ? '#065F46' : '#64748B' }}>{agendaActiva ? 'Activa' : 'Inactiva'}</Text>
                  <Text style={{ fontSize: 11, color: agendaActiva ? '#10B981' : '#94A3B8', marginTop: 2 }}>{agendaActiva ? 'Visible a clientes' : 'Oculta a clientes'}</Text>
                </View>
                <Switch 
                  value={agendaActiva} 
                  onValueChange={setAgendaActiva}
                  trackColor={{ false: "#CBD5E1", true: "#10B981" }}
                  thumbColor="#fff"
                />
              </View>

              <Text style={styles.sidebarSectionLabel}>MENSAJE PÚBLICO</Text>
              <TextInput 
                style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 16, fontSize: 14, color: '#0F172A', minHeight: 80, marginBottom: 24, textAlignVertical: 'top', borderWidth: 1, borderColor: '#F1F5F9' } as any}
                placeholder="Ej. 'Cerrado por vacaciones...'"
                placeholderTextColor="#94A3B8"
                multiline
                value={mensajePublico}
                onChangeText={setMensajePublico}
              />

              <Text style={styles.sidebarSectionLabel}>DÍAS LIBRES (RECURRENTE)</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d, idx) => {
                  const isLibre = diasLibres.includes(idx);
                  return (
                    <TouchableOpacity 
                      key={d} 
                      style={{ flex: 1, minWidth: '22%', paddingVertical: 12, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: isLibre ? '#EF4444' : '#E2E8F0', backgroundColor: isLibre ? '#FEF2F2' : '#fff' }}
                      onPress={() => {
                        if (isLibre) setDiasLibres(diasLibres.filter(x => x !== idx));
                        else setDiasLibres([...diasLibres, idx]);
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: isLibre ? '#EF4444' : '#64748B' }}>{d}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* RIGHT COLUMN / HOURS & EXCEPTIONS */}
            <View style={{ flex: isDesktop ? 1.5 : 1, gap: 16 }}>
              
              {/* Horarios Card */}
              <View style={{ backgroundColor: '#fff', borderRadius: isDesktop ? 16 : 20, padding: isDesktop ? 24 : 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1, borderColor: '#F1F5F9' }}>
                <View style={{ flexDirection: isDesktop ? 'row' : 'column', justifyContent: 'space-between', alignItems: isDesktop ? 'flex-start' : 'stretch', gap: 16, marginBottom: 24 }}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="time" size={18} color="#63348C" />
                    </View>
                    <View>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Horarios de Inicio</Text>
                      <Text style={{ fontSize: 12, color: '#94A3B8' }}>Citas comenzarán a estas horas</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#63348C', backgroundColor: showAddHora ? '#EEF2FF' : '#fff' }}
                    onPress={() => setShowAddHora(!showAddHora)}
                  >
                    <Ionicons name={showAddHora ? "close" : "add"} size={16} color="#63348C" />
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#63348C' }}>{showAddHora ? "Cerrar" : "Nueva Hora"}</Text>
                  </TouchableOpacity>
                </View>
                
                {showAddHora && (
                  <View style={{ marginBottom: 24, padding: isDesktop ? 20 : 16, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9' }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8', marginBottom: 12, textTransform: 'uppercase' }}>1. Hora</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                      {Array.from({ length: 24 }).map((_, h) => {
                        const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
                        const ampm = h >= 12 ? 'PM' : 'AM';
                        const isSelected = newHour === h;
                        return (
                          <TouchableOpacity 
                            key={h} 
                            onPress={() => setNewHour(h)}
                            style={{ width: isDesktop ? '15%' : '18.5%', paddingVertical: 10, alignItems: 'center', borderRadius: 8, backgroundColor: isSelected ? '#63348C' : '#fff', borderWidth: 1, borderColor: isSelected ? '#63348C' : '#E2E8F0' }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: '700', color: isSelected ? '#fff' : '#475569' }}>{displayH}{ampm}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#94A3B8', marginBottom: 12, textTransform: 'uppercase' }}>2. Minutos</Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                      {[0, 15, 30, 45].map(m => {
                        const isSelected = newMinute === m;
                        return (
                          <TouchableOpacity 
                            key={m} 
                            onPress={() => setNewMinute(m)}
                            style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8, backgroundColor: isSelected ? '#63348C' : '#fff', borderWidth: 1, borderColor: isSelected ? '#63348C' : '#E2E8F0' }}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '700', color: isSelected ? '#fff' : '#475569' }}>{m < 10 ? `0${m}` : m}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <TouchableOpacity 
                      onPress={() => {
                        const timeStr = `${newHour < 10 ? `0${newHour}` : newHour}:${newMinute < 10 ? `0${newMinute}` : newMinute}`;
                        if (!customHours.includes(timeStr)) {
                          setCustomHours([...customHours, timeStr].sort((a, b) => a.localeCompare(b)));
                          setShowAddHora(false);
                        } else {
                          Alert.alert("Aviso", "Este horario ya existe");
                        }
                      }}
                      style={{ backgroundColor: '#63348C', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>Añadir horario</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {customHours.map(time => {
                    const [h, m] = time.split(':').map(Number);
                    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
                    const ampm = h >= 12 ? 'PM' : 'AM';
                    const time12 = `${displayH}:${m < 10 ? `0${m}` : m} ${ampm}`;
                    
                    return (
                      <View key={time} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#F1F5F9', backgroundColor: '#F8FAFC' }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#0F172A' }}>{time12}</Text>
                        <TouchableOpacity onPress={() => setCustomHours(customHours.filter(h => h !== time))} style={{ padding: 2 }}>
                          <Ionicons name="close-circle" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Excepciones Card */}
              <View style={{ backgroundColor: '#fff', borderRadius: isDesktop ? 16 : 20, padding: isDesktop ? 24 : 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1, borderColor: '#F1F5F9' }}>
                <View style={{ flexDirection: isDesktop ? 'row' : 'column', justifyContent: 'space-between', alignItems: isDesktop ? 'flex-start' : 'stretch', gap: 16, marginBottom: 24 }}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="calendar-clear" size={18} color="#EF4444" />
                    </View>
                    <View>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#0F172A' }}>Excepciones</Text>
                      <Text style={{ fontSize: 12, color: '#94A3B8' }}>Fechas específicas bloqueadas</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: '#EF4444', backgroundColor: showExcCal ? '#FEF2F2' : '#fff' }}
                    onPress={() => setShowExcCal(!showExcCal)}
                  >
                    <Ionicons name={showExcCal ? "close" : "add"} size={16} color="#EF4444" />
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#EF4444' }}>{showExcCal ? "Cerrar" : "Bloquear"}</Text>
                  </TouchableOpacity>
                </View>

                {showExcCal && (
                  <View style={{ marginBottom: 24, padding: 16, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <TouchableOpacity onPress={() => { const d = new Date(excMonth); d.setMonth(d.getMonth()-1); setExcMonth(d); }}>
                        <Ionicons name="chevron-back" size={16} color="#64748B" />
                      </TouchableOpacity>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#0F172A' }}>
                        {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][excMonth.getMonth()]} {excMonth.getFullYear()}
                      </Text>
                      <TouchableOpacity onPress={() => { const d = new Date(excMonth); d.setMonth(d.getMonth()+1); setExcMonth(d); }}>
                        <Ionicons name="chevron-forward" size={16} color="#64748B" />
                      </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {['L','M','M','J','V','S','D'].map((wd, i) => (
                        <Text key={i} style={{ width: '14.28%', textAlign: 'center', fontSize: 10, fontWeight: '800', color: '#94A3B8', marginBottom: 8 }}>{wd}</Text>
                      ))}
                      {(() => {
                        const calYear = excMonth.getFullYear();
                        const calMonth = excMonth.getMonth();
                        const firstDow = new Date(calYear, calMonth, 1).getDay();
                        const offset = firstDow === 0 ? 6 : firstDow - 1;
                        const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
                        const calDays = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
                        
                        return calDays.map((day, i) => {
                          if (!day) return <View key={`e${i}`} style={{ width: '14.28%', height: 32 }} />;
                          const dStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                          const isBlocked = fechasBloqueadas.includes(dStr);
                          return (
                            <TouchableOpacity 
                              key={i} 
                              style={{ width: '14.28%', height: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 2 }}
                              onPress={() => {
                                if (isBlocked) setFechasBloqueadas(fechasBloqueadas.filter(f => f !== dStr));
                                else setFechasBloqueadas([...fechasBloqueadas, dStr]);
                              }}
                            >
                              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isBlocked ? '#EF4444' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ fontSize: 12, fontWeight: isBlocked ? '800' : '600', color: isBlocked ? '#fff' : '#0F172A' }}>{day}</Text>
                              </View>
                            </TouchableOpacity>
                          );
                        });
                      })()}
                    </View>
                  </View>
                )}

                {fechasBloqueadas.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                    <Text style={{ fontSize: 13, color: '#94A3B8' }}>No hay fechas específicas bloqueadas</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    {fechasBloqueadas.map(fecha => (
                      <View key={fecha} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#EF4444' }}>{fecha}</Text>
                        <TouchableOpacity onPress={() => setFechasBloqueadas(fechasBloqueadas.filter(f => f !== fecha))}>
                          <Ionicons name="close" size={14} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderMobileDetail = () => (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <View style={[styles.mobileDetailHeader, { backgroundColor: selectedCita?.color || '#63348C' }]}>
        <TouchableOpacity onPress={() => setDetailModalOpen(false)} style={styles.mobileDetailBack}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={styles.mobileDetailCategory}>{selectedCita?.categoria || 'SERVICIO'}</Text>
          <Text style={styles.mobileDetailTitle} numberOfLines={1}>{selectedCita?.servicioNombre || 'Servicio'}</Text>
        </View>
        <View style={[styles.mobileStatusPill, { backgroundColor: selectedCita?.estado === 'Completadas' ? '#63348C' : 'rgba(255,255,255,0.25)' }]}>
          <Text style={styles.mobileStatusPillText}>{selectedCita?.estado || 'Pendiente'}</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
        <View style={styles.mobileInfoGroup}>
          <View style={styles.mobileInfoRow}>
            <View style={[styles.mobileInfoIcon, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="person" size={18} color="#63348C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mobileInfoLabel}>Cliente</Text>
              <Text style={styles.mobileInfoValue}>{selectedCita?.clienteNombre || 'Usuario'}</Text>
            </View>
          </View>
          <View style={styles.mobileInfoDivider} />
          <View style={styles.mobileInfoRow}>
            <View style={[styles.mobileInfoIcon, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="calendar" size={18} color="#63348C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mobileInfoLabel}>Fecha y Hora</Text>
              <Text style={styles.mobileInfoValue}>{selectedCita?.fecha ? (selectedCita.fecha instanceof Timestamp ? selectedCita.fecha.toDate() : new Date(selectedCita.fecha)).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : ''} — {formatTime(selectedCita?.fecha)}</Text>
            </View>
          </View>
          <View style={styles.mobileInfoDivider} />
          <View style={styles.mobileInfoRow}>
            <View style={[styles.mobileInfoIcon, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="location" size={18} color="#63348C" />
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
                  <Ionicons name="paw" size={18} color="#63348C" />
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
                  <Ionicons name="document-text" size={18} color="#63348C" />
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
            <Ionicons name="checkmark-done" size={18} color="#63348C" />
            <Text style={styles.secondaryActionButtonText}>Completado</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  const renderDetailContent = () => (
    <ScrollView bounces={false} contentContainerStyle={{ flexGrow: 1 }} style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', flex: 1 }}>
        <View style={[styles.modalVisualSide, { backgroundColor: selectedCita?.color || '#63348C', width: 320, padding: 40 }]}>
          <TouchableOpacity onPress={() => setDetailModalOpen(false)} style={styles.modalVisualClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ marginTop: 20 }}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{selectedCita?.categoria || 'SERVICIO'}</Text>
            </View>
            <Text style={styles.visualServiceName}>{selectedCita?.servicioNombre || 'Servicio'}</Text>
            <View style={styles.visualStatusRow}>
              <View style={[styles.statusDot, { backgroundColor: selectedCita?.estado === 'Completadas' ? '#63348C' : '#fff' }]} />
              <Text style={styles.visualStatusText}>{selectedCita?.estado || 'Pendiente'}</Text>
            </View>
          </View>
        </View>
        <View style={[styles.modalContentSide, { flex: 1, padding: 50 }]}>
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>Información del Cliente</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoIconBox}><Ionicons name="person" size={20} color="#63348C" /></View>
              <View><Text style={styles.infoLabel}>Nombre Completo</Text><Text style={styles.infoValue}>{selectedCita?.clienteNombre || 'Usuario'}</Text></View>
            </View>
            <View style={styles.infoCard}>
              <View style={styles.infoIconBox}><Ionicons name="time" size={20} color="#63348C" /></View>
              <View><Text style={styles.infoLabel}>Horario Reservado</Text><Text style={styles.infoValue}>{selectedCita?.fecha ? (selectedCita.fecha instanceof Timestamp ? selectedCita.fecha.toDate() : new Date(selectedCita.fecha)).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : ''} a las {formatTime(selectedCita?.fecha)}</Text></View>
            </View>
            <View style={styles.infoCard}>
              <View style={styles.infoIconBox}><Ionicons name="location" size={20} color="#63348C" /></View>
              <View style={{ flex: 1 }}><Text style={styles.infoLabel}>Ubicación del Servicio</Text><Text style={styles.infoValue} numberOfLines={2}>{selectedCita?.clienteUbicacion || 'Sin ubicación'}</Text></View>
            </View>
            {selectedCita?.animal ? (<View style={styles.infoCard}><View style={styles.infoIconBox}><Ionicons name="paw" size={20} color="#63348C" /></View><View><Text style={styles.infoLabel}>Mascota</Text><Text style={styles.infoValue}>{selectedCita.animal}</Text></View></View>) : null}
            {selectedCita?.descripcion ? (<View style={styles.infoCard}><View style={styles.infoIconBox}><Ionicons name="document-text" size={20} color="#63348C" /></View><View style={{ flex: 1 }}><Text style={styles.infoLabel}>Descripción</Text><Text style={styles.infoValue}>{selectedCita.descripcion}</Text></View></View>) : null}
          </View>
          <View style={[styles.actionGroup, { marginTop: 40 }]}>
            <TouchableOpacity style={styles.primaryActionButton} onPress={() => openMap(selectedCita?.clienteUbicacion, selectedCita?.clienteLat, selectedCita?.clienteLng)}>
              <Ionicons name="navigate" size={20} color="#fff" /><Text style={styles.primaryActionButtonText}>Trazar Ruta (Maps/Waze)</Text>
            </TouchableOpacity>
            {selectedCita?.estado !== 'Completadas' ? (
              <TouchableOpacity style={styles.secondaryActionButton} onPress={() => markAsCompleted(selectedCita.id)}>
                <Ionicons name="checkmark-done" size={20} color="#63348C" /><Text style={styles.secondaryActionButtonText}>Marcar como Completado</Text>
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
            <ActivityIndicator size="large" color="#63348C" />
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
  canvasTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A', letterSpacing: -0.8 },
  dateSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  navBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  dateRangeText: { fontSize: 13, fontWeight: '700', color: '#0F172A', paddingHorizontal: 12 },
  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  filterChipGroup: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 10, padding: 3, borderWidth: 1, borderColor: '#E2E8F0' },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  filterChipActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  filterChipTextActive: { color: '#0F172A', fontWeight: '800' },
  primaryActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#10B981', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
  primaryActionBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  canvasGridWrapper: { flex: 1, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden' },
  canvasGridHeader: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  hourGutterHeader: { width: 80 },
  canvasDayHeader: { flex: 1, paddingVertical: 14, alignItems: 'center', borderLeftWidth: 1, borderLeftColor: '#F1F5F9' },
  canvasDayName: { fontSize: 10, fontWeight: '800', color: '#94A3B8', marginBottom: 2 },
  canvasDayNum: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  canvasDayNumToday: { color: '#63348C' },
  canvasGridBody: { backgroundColor: '#fff' },
  canvasRow: { flexDirection: 'row', minHeight: 90, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  hourGutter: { width: 80, alignItems: 'center', paddingTop: 10 },
  hourText: { fontSize: 11, fontWeight: '800', color: '#475569' },
  canvasCell: { flex: 1, borderLeftWidth: 1, borderLeftColor: '#F1F5F9', padding: 4, gap: 4 },
  canvasCitaCard: { backgroundColor: '#fff', borderRadius: 8, padding: 8, borderLeftWidth: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  citaCardTime: { fontSize: 9, fontWeight: '900', color: '#94A3B8', marginBottom: 2 },
  citaCardClient: { fontSize: 12, fontWeight: '800', color: '#0F172A', marginBottom: 1 },
  citaCardService: { fontSize: 10, fontWeight: '600', color: '#64748B' },
  
  mobileContainer: { flex: 1, backgroundColor: '#fff' },
  mobileHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  mobileHeaderSide: { width: 60 },
  mobileBackBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#F8FAFC' },
  mobileDateInfo: { flex: 1, alignItems: 'center' },
  mobileTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A', textAlign: 'center' },
  mobileSubtitle: { fontSize: 13, color: '#64748B', textTransform: 'capitalize', textAlign: 'center', marginTop: 2 },
  mobileTodayBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#63348C' },
  mobileTodayBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  
  mobileGridHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#fff' },
  mobileTimeGutter: { width: 50, borderRightWidth: 1, borderRightColor: '#F8FAFC' },
  mobileDayColHeader: { flex: 1, alignItems: 'center', paddingVertical: 12, borderLeftWidth: 1, borderLeftColor: '#F8FAFC' },
  mobileDayName: { fontSize: 9, fontWeight: '800', color: '#94A3B8', marginBottom: 4 },
  mobileDayCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  mobileDayCircleToday: { backgroundColor: '#63348C' },
  mobileDayNum: { fontSize: 14, fontWeight: '900', color: '#0F172A' },
  
  mobileGridBody: { backgroundColor: '#fff' },
  mobileGridRow: { flexDirection: 'row', minHeight: 80, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  mobileHourText: { fontSize: 10, fontWeight: '800', color: '#94A3B8', marginTop: 8, textAlign: 'center' },
  mobileGridCell: { flex: 1, borderLeftWidth: 1, borderLeftColor: '#F8FAFC', padding: 2, gap: 2 },
  
  mobileCitaCard: { borderRadius: 4, padding: 4, borderLeftWidth: 2, flex: 1 },
  mobileCitaTime: { fontSize: 8, fontWeight: '900', marginBottom: 1 },
  mobileCitaClient: { fontSize: 9, fontWeight: '800', color: '#0F172A' },
  
  mobileFab: { position: 'absolute', bottom: 30, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center', shadowColor: '#10B981', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },

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
  primaryActionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#10B981', paddingVertical: 18, borderRadius: 16, shadowColor: '#10B981', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 15 },
  primaryActionButtonText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  secondaryActionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#fff', paddingVertical: 18, borderRadius: 16, borderWidth: 1.5, borderColor: '#63348C' },
  secondaryActionButtonText: { color: '#63348C', fontSize: 15, fontWeight: '900' },

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
  hourOptionActive: { backgroundColor: '#63348C', borderColor: '#63348C' },
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
  gridHourBtnActive: { backgroundColor: '#63348C', borderColor: '#63348C' },
  gridHourText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  gridHourTextActive: { color: '#fff' },
  
  minuteRow: { flexDirection: 'row', gap: 8 },
  gridMinBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  gridMinBtnActive: { backgroundColor: '#EEF2FF', borderColor: '#63348C' },
  gridMinText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  gridMinTextActive: { color: '#63348C' },
  
  actionAddBtn: { backgroundColor: '#10B981', paddingVertical: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
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
  mobileFilterChipActive: { backgroundColor: '#EEF2FF', borderColor: '#63348C' },
  mobileStatusDot: { width: 6, height: 6, borderRadius: 3 },
  mobileFilterChipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  mobileFilterChipTextActive: { color: '#63348C', fontWeight: '800' },

  // ── NEW DESKTOP LAYOUT ──
  agendaOuter: { flex: 1, flexDirection: 'row', backgroundColor: '#fff' },
  agendaSidebar: { width: 250, borderRightWidth: 1, borderRightColor: '#E2E8F0', padding: 24, backgroundColor: '#fff' },
  sidebarTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginBottom: 20 },
  miniCal: { marginBottom: 24 },
  miniCalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  miniCalTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  miniCalGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  miniCalDow: { width: '14.28%', textAlign: 'center', fontSize: 9, fontWeight: '700', color: '#94A3B8', marginBottom: 4 },
  miniCalDay: { width: '14.28%', height: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  miniCalDayToday: { backgroundColor: '#63348C', borderRadius: 14 },
  miniCalDayInWeek: { backgroundColor: '#EEF2FF', borderRadius: 4 },
  miniCalDayTxt: { fontSize: 11, fontWeight: '600', color: '#0F172A' },
  miniCalDayTxtToday: { color: '#fff', fontWeight: '900' },
  miniCalDayTxtInWeek: { color: '#63348C', fontWeight: '700' },
  miniCalDot: { width: 4, height: 4, borderRadius: 2 },
  sidebarSectionLabel: { fontSize: 9, fontWeight: '800', color: '#94A3B8', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 },
  statusOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10, marginBottom: 4 },
  statusOptionActive: { backgroundColor: '#EEF2FF' },
  statusDotLeft: { width: 8, height: 8, borderRadius: 4 },
  statusOptionTxt: { fontSize: 14, fontWeight: '600', color: '#475569' },
  statusOptionTxtActive: { color: '#63348C', fontWeight: '800' },
  agendaRight: { flex: 1, flexDirection: 'column', overflow: 'hidden' },
  rpHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  rpTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  rpSubtitle: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  rpBtns: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rpWeekNav: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, overflow: 'hidden' },
  rpNavBtn: { paddingHorizontal: 10, paddingVertical: 8 },
  rpNavLabel: { paddingHorizontal: 12, fontSize: 13, fontWeight: '700', color: '#0F172A', borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#E2E8F0', paddingVertical: 8 },
  rpSecBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  rpSecBtnTxt: { fontSize: 13, fontWeight: '700', color: '#475569' },
  rpPrimBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10B981', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9 },
  rpPrimBtnTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },
  rpGridWrap: { flex: 1, overflow: 'hidden' },
  rpGridHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', backgroundColor: '#fff' },
  rpHourCol: { width: 72, borderRightWidth: 1, borderRightColor: '#E2E8F0', alignItems: 'center', paddingTop: 10 },
  rpDayHeader: { flex: 1, paddingVertical: 12, alignItems: 'center', borderLeftWidth: 1, borderLeftColor: '#E2E8F0' },
  rpDayName: { fontSize: 10, fontWeight: '800', color: '#94A3B8', marginBottom: 4 },
  rpDayCircle: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  rpDayCircleToday: { backgroundColor: '#63348C' },
  rpDayNum: { fontSize: 15, fontWeight: '900', color: '#0F172A' },
  rpDayNumToday: { color: '#fff' },
  rpRow: { flexDirection: 'row', minHeight: 85, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  rpHourTxt: { fontSize: 10, fontWeight: '700', color: '#94A3B8', marginTop: 8 },
  rpCell: { flex: 1, borderLeftWidth: 1, borderLeftColor: '#F1F5F9', padding: 3, gap: 3 },
  rpCellToday: { backgroundColor: '#FFFBF5' },
  rpCitaCard: { borderRadius: 8, padding: 7 },
  rpCitaName: { fontSize: 11, fontWeight: '800', color: '#fff' },
  rpCitaService: { fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  rpEquipoBadge: { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  rpEquipoTxt: { fontSize: 7, fontWeight: '900', color: '#fff' },
});

