import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  hideLabel?: boolean;
  containerStyle?: any;
}

export const DatePicker = ({ value, onChange, label, hideLabel, containerStyle }: DatePickerProps) => {
  const [showModal, setShowModal] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handleDayPress = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = (currentMonth.getMonth() + 1).toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');
    onChange(`${year}-${month}-${dayStr}`);
    setShowModal(false);
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);
    
    const days = [];
    // Empty slots for start day
    for (let i = 0; i < startDay; i++) {
      days.push({ id: `empty-${i}`, day: null });
    }
    // Days
    for (let i = 1; i <= totalDays; i++) {
      days.push({ id: `day-${i}`, day: i });
    }

    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => setCurrentMonth(new Date(year, month - 1))}>
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{monthNames[month]} {year}</Text>
          <TouchableOpacity onPress={() => setCurrentMonth(new Date(year, month + 1))}>
            <Ionicons name="chevron-forward" size={24} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <View style={styles.weekDays}>
          {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map(d => (
            <Text key={d} style={styles.weekDayText}>{d}</Text>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {days.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.dayCell,
                value === `${year}-${(month + 1).toString().padStart(2, '0')}-${item.day?.toString().padStart(2, '0')}` && styles.selectedDay
              ]}
              disabled={item.day === null}
              onPress={() => item.day && handleDayPress(item.day)}
            >
              <Text style={[
                styles.dayText,
                item.day === null && styles.emptyDayText,
                value === `${year}-${(month + 1).toString().padStart(2, '0')}-${item.day?.toString().padStart(2, '0')}` && styles.selectedDayText
              ]}>
                {item.day}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && !hideLabel && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity 
        style={styles.inputTrigger} 
        onPress={() => setShowModal(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar-outline" size={20} color="#64748B" />
        <Text style={[styles.inputValue, !value && styles.placeholder]}>
          {value || 'Seleccionar fecha'}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={() => setShowModal(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Fecha</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            {renderCalendar()}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', color: '#475569', marginBottom: 8 },
  inputTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  inputValue: { fontSize: 15, color: '#0F172A', fontWeight: '600' },
  placeholder: { color: '#94A3B8', fontWeight: '500' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: '100%',
    maxWidth: 360,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  calendarContainer: { width: '100%' },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  monthTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  weekDayText: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 4,
  },
  selectedDay: {
    backgroundColor: '#3B1E54',
  },
  dayText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  selectedDayText: { color: '#fff' },
  emptyDayText: { color: 'transparent' },
});
