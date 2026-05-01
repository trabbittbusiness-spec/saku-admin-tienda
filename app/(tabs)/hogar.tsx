import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { db, auth } from '../../lib/firebase';
import { collection, onSnapshot, Timestamp, doc } from 'firebase/firestore';

export default function HogarScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && windowWidth >= 1024;
  const [userData, setUserData] = useState<any>(null); // To store currently logged in user info
  const [viewType, setViewType] = useState('Mensual');
  const [containerWidth, setContainerWidth] = useState(0);

  // States for dynamic data
  const [userStats, setUserStats] = useState({ total: 0, today: 0, percentage: '0%' });
  const [productData, setProductData] = useState({ total: 0, today: 0, percentage: '0%' });
  const [orderData, setOrderData] = useState({ total: 0, today: 0, percentage: '0%' });
  
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingRevenue, setLoadingRevenue] = useState(true);

  const calculateGrowth = (today: number, total: number) => {
    if (total === 0 || total === today) return '0%';
    const base = total - today;
    const growth = (today / base) * 100;
    return `+${growth.toFixed(1)}%`;
  };

  const parseDate = (item: any) => {
    if (!item) return null;
    if (item.timestamp instanceof Timestamp) return item.timestamp.toDate();
    if (item.fechaCreacion && typeof item.fechaCreacion === 'string') return new Date(item.fechaCreacion);
    if (item.fechaCreacion instanceof Timestamp) return item.fechaCreacion.toDate();
    if (item.createdAt instanceof Timestamp) return item.createdAt.toDate();
    if (item.created_time instanceof Timestamp) return item.created_time.toDate();
    if (item.timestamp && typeof item.timestamp === 'number') return new Date(item.timestamp);
    return null;
  };

  const isToday = (item: any) => {
    const d = parseDate(item);
    if (!d) return false;
    const today = new Date();
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
  };

  useEffect(() => {
    // 1. Fetch Active Users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const all = snapshot.docs.map(d => d.data());
      const active = all.filter(u => u.IsAdmin !== true);
      const todayCount = active.filter(u => isToday(u)).length;
      setUserStats({
        total: active.length,
        today: todayCount,
        percentage: calculateGrowth(todayCount, active.length)
      });
    });

    // 2. Fetch Products
    const unsubProducts = onSnapshot(collection(db, 'Products'), (snapshot) => {
      const all = snapshot.docs.map(d => d.data());
      const todayCount = all.filter(p => isToday(p)).length;
      setProductData({
        total: all.length,
        today: todayCount,
        percentage: calculateGrowth(todayCount, all.length)
      });
    });

    // 3. Fetch ALL Orders
    const unsubOrders = onSnapshot(collection(db, 'Orden'), (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAllOrders(list);
      const delivered = list.filter((o: any) => o.estado === 'Entregado');
      const todayCount = delivered.filter((o: any) => isToday(o)).length;
      setOrderData({
        total: delivered.length,
        today: todayCount,
        percentage: calculateGrowth(todayCount, delivered.length)
      });
      setLoadingRevenue(false);
    });

    const unsubAuth = onSnapshot(doc(db, 'users', auth.currentUser?.uid || 'none'), (snap) => {
      if (snap.exists()) setUserData(snap.data());
    });

    // 4. Fetch Notifications for the bell badge
    const { query, where } = require('firebase/firestore');
    const qNotifs = query(collection(db, 'Notifications'), where('read', '==', false));
    const unsubNotifs = onSnapshot(qNotifs, (snapshot) => {
      setUnreadCount(snapshot.size);
    });

    return () => {
      unsubUsers(); unsubProducts(); unsubOrders(); unsubAuth(); unsubNotifs();
    };
  }, []);

  const analytics = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    const dailyData = new Array(24).fill(0); 
    const weeklyData = new Array(7).fill(0); 
    const monthlyData = new Array(4).fill(0); 
    const yearlyData = new Array(12).fill(0); 

    const totals = { today: 0, yesterday: 0, thisWeek: 0, lastWeek: 0, thisMonth: 0, lastMonth: 0, thisYear: 0, lastYear: 0 };
    const getDayIndex = (d: Date) => { const day = d.getDay(); return day === 0 ? 6 : day - 1; };

    const startOfToday = new Date(now); startOfToday.setHours(0,0,0,0);
    const startOfYesterday = new Date(startOfToday); startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const startOfWeek = new Date(startOfToday); startOfWeek.setDate(startOfToday.getDate() - getDayIndex(now));
    const startOfLastWeek = new Date(startOfWeek); startOfLastWeek.setDate(startOfWeek.getDate() - 7);
    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1);
    const startOfYear = new Date(currentYear, 0, 1);
    const startOfLastYear = new Date(currentYear - 1, 0, 1);

    const productSales: Record<string, { name: string, quantity: number, photo: string, color: string }> = {};
    const COLORS = ['#63348C', '#63348C', '#F59E0B', '#EC4899', '#63348C'];

    allOrders.forEach((o: any) => {
      const isRevenueValid = o.estado === 'Entregado' || ['tarjeta', 'Tarjeta', 'card'].includes(o.metodoPago);
      const isTopProductValid = o.estado === 'Entregado'; 
      
      const date = parseDate(o);
      if (!date) return; // Skip if no date is found
      
      const total = parseFloat(o.total) || 0;
      
      if (isRevenueValid) {
        if (date >= startOfToday) totals.today += total;
        else if (date >= startOfYesterday && date < startOfToday) totals.yesterday += total;
        if (date >= startOfWeek) totals.thisWeek += total;
        else if (date >= startOfLastWeek && date < startOfWeek) totals.lastWeek += total;
        if (date >= startOfMonth) totals.thisMonth += total;
        else if (date >= startOfLastMonth && date < startOfMonth) totals.lastMonth += total;
        if (date >= startOfYear) totals.thisYear += total;
        else if (date >= startOfLastYear && date < startOfYear) totals.lastYear += total;

        if (date.getFullYear() === currentYear) {
          yearlyData[date.getMonth()] += total;
          if (date.getMonth() === currentMonth) {
            const weekIdx = Math.min(3, Math.floor((date.getDate() - 1) / 7));
            monthlyData[weekIdx] += total;
          }
          if (date >= startOfWeek) weeklyData[getDayIndex(date)] += total;
          if (date >= startOfToday) dailyData[date.getHours()] += total;
        }
      }

      if (isTopProductValid && Array.isArray(o.items) && date >= startOfMonth) {
        o.items.forEach((item: any) => {
          const id = item.id || item.nombre;
          if (!id) return;
          if (!productSales[id]) {
            productSales[id] = { 
              name: item.nombre || 'Producto', 
              quantity: 0, 
              photo: item.foto || '', 
              color: COLORS[Object.keys(productSales).length % COLORS.length] 
            };
          }
          productSales[id].quantity += (parseInt(item.cantidad) || 0);
        });
      }
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    const getTrend = (current: number, prev: number) => {
      if (prev === 0) return current > 0 ? '+100%' : '0%';
      const diff = ((current - prev) / prev) * 100;
      return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}%`;
    };

    return {
      daily: { data: dailyData, current: totals.today, trend: getTrend(totals.today, totals.yesterday), label: 'vs Ayer' },
      weekly: { data: weeklyData, current: totals.thisWeek, trend: getTrend(totals.thisWeek, totals.lastWeek), label: 'vs Sem. Anterior' },
      monthly: { data: monthlyData, current: totals.thisMonth, trend: getTrend(totals.thisMonth, totals.lastMonth), label: 'vs Mes Anterior' },
      yearly: { data: yearlyData, current: totals.thisYear, trend: getTrend(totals.thisYear, totals.lastYear), label: 'vs Año Anterior' },
      topProducts
    };
  }, [allOrders]);

  const VIEW_CONFIG = {
    Diario: { labels: ['00', '04', '08', '12', '16', '20', '23'], data: [analytics.daily.data[0], analytics.daily.data[4], analytics.daily.data[8], analytics.daily.data[12], analytics.daily.data[16], analytics.daily.data[20], analytics.daily.data[23]], title: 'Ventas de Hoy', stats: analytics.daily },
    Semanal: { labels: ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'], data: analytics.weekly.data, title: 'Esta Semana', stats: analytics.weekly },
    Mensual: { labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'], data: analytics.monthly.data, title: 'Este Mes', stats: analytics.monthly },
    Anual: { labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'], data: analytics.yearly.data, title: 'Este Año', stats: analytics.yearly }
  };

  const currentConfig = VIEW_CONFIG[viewType as keyof typeof VIEW_CONFIG] || VIEW_CONFIG.Mensual;
  const chartHeight = 220;

  const onLayout = useCallback((event: any) => setContainerWidth(event.nativeEvent.layout.width), []);

  const renderSVGChart = () => {
    if (containerWidth === 0 || loadingRevenue) return <ActivityIndicator style={{ height: chartHeight }} />;
    const dataPoints = currentConfig.data;
    const maxVal = Math.max(...dataPoints, 1000); 
    const stepX = containerWidth / (dataPoints.length - 1);
    const pathData = dataPoints.reduce((acc, val, i) => {
      const x = i * stepX;
      const y = chartHeight - (val / maxVal) * (chartHeight - 40) - 20;
      return acc + `${i === 0 ? 'M' : 'L'} ${x} ${y} `;
    }, "");
    return (
      <View style={[styles.chartContainer, { height: chartHeight + 40 }]}>
        <Svg width={containerWidth} height={chartHeight} style={styles.svgStyle}>
          <Path d={pathData} fill="none" stroke="#63348C" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          {dataPoints.map((val, i) => {
            const x = i * stepX;
            const y = chartHeight - (val / maxVal) * (chartHeight - 40) - 20;
            return <React.Fragment key={`${i}-dots`}><Circle cx={x} cy={y} r="8" fill="#63348C" opacity="0.2" /><Circle cx={x} cy={y} r="6" fill="#63348C" stroke="#fff" strokeWidth="3" /></React.Fragment>;
          })}
        </Svg>
        <View style={styles.xAxis}>{currentConfig.labels.map((label, i) => (<Text key={`${label}-${i}`} style={[styles.xLabel, { left: i * stepX, transform: [{ translateX: -15 }], width: 30 }]}>{label}</Text>))}</View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}>
        <View style={styles.mainHeader}>
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>¡Hola, {userData?.display_name?.split(' ')[0] || 'Admin'}! 👋</Text>
            <Text style={styles.welcomeSubtitle}>Aquí tienes el resumen del ecosistema Saku hoy.</Text>
          </View>
          {!isDesktop && (
            <TouchableOpacity 
              style={styles.mobileBellBtn} 
              activeOpacity={0.7} 
              onPress={() => (window as any).openSakuNotifications?.()}
            >
              <Ionicons name="notifications-outline" size={28} color="#475569" />
              {unreadCount > 0 && (
                <View style={styles.mobileNotificationBadge}>
                  <Text style={styles.mobileBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.kpiGrid, isDesktop && styles.kpiGridDesktop]}>
          {[
            { label: 'Usuarios Activos', value: userStats.total, today: userStats.today, change: userStats.percentage, color: '#63348C', icon: 'people' },
            { label: 'Productos en Tienda', value: productData.total, today: productData.today, change: productData.percentage, color: '#F59E0B', icon: 'cube' },
            { label: 'Ventas Entregadas', value: orderData.total, today: orderData.today, change: orderData.percentage, color: '#10B981', icon: 'receipt' },
            { label: 'Ingresos (Mes)', value: analytics.monthly.current, today: 0, change: analytics.monthly.trend, color: '#63348C', icon: 'stats-chart', isCurrency: true },
          ].map((kpi) => (
            <View key={kpi.label} style={styles.kpiCard}>
              <View style={styles.kpiHeader}>
                <View style={[styles.kpiIcon, { backgroundColor: `${kpi.color}15` }]}><Ionicons name={kpi.icon as any} size={20} color={kpi.color} /></View>
                <View style={[styles.changeBadge, { backgroundColor: kpi.change.startsWith('-') ? '#FEE2E2' : '#DCFCE7' }]}><Text style={[styles.changeText, { color: kpi.change.startsWith('-') ? '#EF4444' : '#059669' }]}>{kpi.change}</Text></View>
              </View>
              <View style={styles.kpiValueRow}>
                <Text style={styles.kpiValue}>{kpi.isCurrency ? `$${kpi.value.toLocaleString("de-DE")}` : kpi.value.toLocaleString("de-DE")}</Text>
                {!kpi.isCurrency && <Text style={styles.kpiToday}>({kpi.today} hoy)</Text>}
              </View>
              <Text style={styles.kpiLabel}>{kpi.label}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.mainBody, isDesktop && styles.mainBodyDesktop]}>
          <View style={[styles.leftColumn, isDesktop && styles.leftColumnDesktop]}>
            <View style={[styles.premiumCard, isDesktop && { flex: 1 }]}>
              <View style={[styles.chartHeaderContainer, !isDesktop && styles.chartHeaderContainerMobile]}>
                <View style={styles.chartHeaderInfo}>
                  <Text style={styles.chartTypeTitle}>{currentConfig.title}</Text>
                  <View style={styles.revenueRow}><Text style={styles.revenueCurrency}>CLP</Text><Text style={styles.revenueValue}>{currentConfig.stats.current.toLocaleString("de-DE")}</Text></View>
                  <View style={styles.trendRow}>
                    <Ionicons name={currentConfig.stats.trend.startsWith('+') ? "trending-up" : "trending-down"} size={14} color={currentConfig.stats.trend.startsWith('+') ? "#63348C" : "#EF4444"} />
                    <Text style={[styles.trendText, { color: currentConfig.stats.trend.startsWith('+') ? "#63348C" : "#EF4444" }]}>{currentConfig.stats.trend} <Text style={styles.trendSub}>{currentConfig.stats.label}</Text></Text>
                  </View>
                </View>
                <View style={[styles.tabsSection, !isDesktop && styles.tabsSectionMobile]}>
                  <View style={[styles.periodTabs, !isDesktop && { justifyContent: 'space-between' }]}>
                    {['Diario', 'Semanal', 'Mensual', 'Anual'].map((tab) => (
                      <TouchableOpacity key={tab} onPress={() => setViewType(tab)} style={[styles.tabItem, viewType === tab && styles.tabItemActive, !isDesktop && { flex: 1, alignItems: 'center' }]}>
                        <Text style={[styles.tabText, viewType === tab && styles.tabTextActive, !isDesktop && { fontSize: 11 }]}>{tab}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
              <View style={[styles.chartOuterWrapper, { paddingBottom: 10 }]} onLayout={onLayout}>{renderSVGChart()}</View>
            </View>
          </View>

          <View style={[styles.rightColumn, isDesktop && styles.rightColumnDesktop]}>
            <View style={[styles.premiumCard, isDesktop && { flex: 1 }]}>
              <View style={styles.topProductsHeader}><Text style={styles.topProductsTitle}>Top 5 Productos del Mes</Text></View>
              <View style={styles.productsList}>
                {analytics.topProducts.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 40 }}><Ionicons name="basket-outline" size={40} color="#CBD5E1" /><Text style={{ color: '#94A3B8', marginTop: 10, fontWeight: '600' }}>Sin ventas este mes</Text></View>
                ) : analytics.topProducts.map((item, idx) => (
                  <View key={idx} style={styles.productRow}>
                    <View style={styles.productImageContainer}>
                      {item.photo ? (
                        <Image source={{ uri: item.photo }} style={styles.productThumb} />
                      ) : (
                        <View style={[styles.productIconFallback, { backgroundColor: `${item.color}15` }]}><Ionicons name="cube-outline" size={16} color={item.color} /></View>
                      )}
                    </View>
                    <View style={styles.productMainInfo}>
                      <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
                      <View style={styles.salesProgressContainer}>
                        <View style={styles.progressBarBg}><View style={[styles.progressBarFill, { width: `${Math.min(100, (item.quantity / analytics.topProducts[0].quantity) * 100)}%`, backgroundColor: item.color }]} /></View>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748B' }}>{item.quantity} uds.</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  content: { padding: 16, paddingBottom: 100 },
  contentDesktop: { padding: 32, width: '100%' },
  mainHeader: { marginBottom: 28, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  welcomeSection: { flex: 1 },
  welcomeTitle: { fontSize: 26, fontWeight: '900', color: '#0F172A', letterSpacing: -1.2 },
  welcomeSubtitle: { fontSize: 14, color: '#64748B', marginTop: 4, fontWeight: '600' },
  mobileBellBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  mobileNotificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    paddingHorizontal: 4
  },
  mobileBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900'
  },
  chartHeaderContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 16 },
  chartHeaderContainerMobile: { flexDirection: 'column', alignItems: 'stretch', gap: 20 },
  tabsSection: { backgroundColor: '#F1F5F9', padding: 4, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  tabsSectionMobile: { width: '100%', marginTop: 0 },
  periodTabs: { flexDirection: 'row', gap: 2 },
  tabItem: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  tabItemActive: { backgroundColor: '#63348C' },
  tabText: { fontSize: 12, fontWeight: '800', color: '#64748B' },
  tabTextActive: { color: '#fff' },
  kpiGrid: { gap: 12, marginBottom: 24 },
  kpiGridDesktop: { flexDirection: 'row' },
  kpiCard: { flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.03, shadowRadius: 30, elevation: 2 },
  kpiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  kpiIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  changeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  changeText: { fontSize: 11, fontWeight: '800' },
  kpiValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  kpiValue: { fontSize: 22, fontWeight: '900', color: '#0F172A' },
  kpiToday: { fontSize: 12, fontWeight: '700', color: '#94A3B8' },
  kpiLabel: { fontSize: 13, color: '#64748B', fontWeight: '600', marginTop: 4 },
  mainBody: { gap: 24 },
  mainBodyDesktop: { flexDirection: 'row', alignItems: 'stretch' },
  leftColumn: { },
  leftColumnDesktop: { flex: 0.65 },
  rightColumn: { },
  rightColumnDesktop: { flex: 0.35 },
  premiumCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.04, shadowRadius: 40, elevation: 3 },
  chartHeaderInfo: { flex: 1 },
  chartTypeTitle: { fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 6 },
  revenueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 2 },
  revenueCurrency: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  revenueValue: { fontSize: 28, fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
  trendText: { fontSize: 12, fontWeight: '800' },
  trendSub: { color: '#94A3B8', fontWeight: '600', fontSize: 11 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chartOuterWrapper: { width: '100%', marginTop: 10 },
  chartContainer: { position: 'relative', width: '100%' },
  svgStyle: { overflow: 'visible' },
  xAxis: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 30 },
  xLabel: { position: 'absolute', fontSize: 10, fontWeight: '800', color: '#94A3B8', textAlign: 'center' },
  topProductsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  topProductsTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  productsList: { gap: 12 },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#f8fafc', borderRadius: 16 },
  productImageContainer: { width: 40, height: 40, borderRadius: 10, overflow: 'hidden', backgroundColor: '#fff' },
  productThumb: { width: '100%', height: '100%', resizeMode: 'cover' },
  productIconFallback: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  productMainInfo: { flex: 1 },
  productName: { fontSize: 13, fontWeight: '800', color: '#1F2937', marginBottom: 6 },
  salesProgressContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressBarBg: { flex: 1, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2 },
  progressBarFill: { height: '100%', borderRadius: 2 },
});
