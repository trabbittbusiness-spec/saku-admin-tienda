import { Tabs } from 'expo-router';
import { useWindowDimensions, View, Platform } from 'react-native';
import { useState } from 'react';
import DesktopSidebar from '../../components/DesktopSidebar';
import DesktopHeader from '../../components/DesktopHeader';
import NotificationDrawer from '../../components/NotificationDrawer';
import MobileTabBar from '../../components/MobileTabBar';

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 768;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ flex: 1, flexDirection: isDesktop ? 'row' : 'column' }}>
        
        {/* Desktop Sidebar (inline) - Only rendered on Desktop */}
        {isDesktop && (
          <DesktopSidebar open={sidebarOpen} isMobile={false} onClose={() => setSidebarOpen(false)} />
        )}

        <View style={{ flex: 1, flexDirection: 'column' }}>
          {/* Header - Only rendered on Desktop */}
          {isDesktop && (
            <DesktopHeader
              sidebarOpen={sidebarOpen}
              onToggleSidebar={() => setSidebarOpen((v) => !v)}
              onToggleNotifications={() => setNotificationsOpen(true)}
            />
          )}
          
          <Tabs
            screenOptions={{ headerShown: false }}
            tabBar={(props) => {
              const currentRoute = props.state.routes[props.state.index].name;
              const hideOnMobile = [
                'configuracion-envio', 
                'usuarios', 
                'cupones', 
                'categorias',
                'publicidad',
                'nuevo-producto/[tipo]',
                'editar-producto/[id]',
                'perfil-completo',
                'agenda'
              ];
              if (isDesktop || hideOnMobile.includes(currentRoute)) return null;
              return <MobileTabBar {...props} />;
            }}
          >
            <Tabs.Screen name="hogar" />
            <Tabs.Screen name="productos" />
            <Tabs.Screen name="promocion" />
            <Tabs.Screen name="servicios" />
            <Tabs.Screen name="ordenes" />
            <Tabs.Screen name="publicidad" options={{ href: null }} />
            <Tabs.Screen name="cuenta" />
            <Tabs.Screen name="configuracion-envio" options={{ href: null }} />
            <Tabs.Screen name="cupones" options={{ href: null }} />
            <Tabs.Screen name="usuarios" options={{ href: null }} />
            <Tabs.Screen name="perfil-completo" options={{ href: null }} />
            <Tabs.Screen name="nuevo-producto/[tipo]" options={{ href: null }} />
            <Tabs.Screen name="editar-producto/[id]" options={{ href: null }} />
            <Tabs.Screen name="orden/[id]" options={{ href: null }} />
            <Tabs.Screen name="categorias" options={{ href: null }} />
            <Tabs.Screen name="agenda" options={{ href: null }} />
          </Tabs>
        </View>
      </View>
      
      {/* Notifications Drawer */}
      <NotificationDrawer 
        open={notificationsOpen} 
        onClose={() => setNotificationsOpen(false)} 
      />
    </View>
  );
}
