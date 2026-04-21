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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import * as ImagePicker from 'expo-image-picker';

export default function PerfilCompletoScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 860;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [apellido, setApellido] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [photoURL, setPhotoURL] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        router.replace('/hogar');
        return;
      }

      const docRef = doc(db, 'users', currentUser.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setUser(data);
        setDisplayName(data.display_name || '');
        setApellido(data.apellido || '');
        setPhoneNumber(data.phone_number || '');
        setPhotoURL(data.photoURL || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setPhotoURL(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const updateData = {
        display_name: displayName,
        apellido: apellido,
        phone_number: phoneNumber,
        photoURL: photoURL,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'users', currentUser.uid), updateData);
      
      if (Platform.OS === 'web') {
        alert('Perfil actualizado correctamente');
      } else {
        Alert.alert('Éxito', 'Perfil actualizado correctamente');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      if (Platform.OS === 'web') {
        alert('No se pudo actualizar el perfil');
      } else {
        Alert.alert('Error', 'No se pudo actualizar el perfil');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
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
            
            <View style={!isDesktop && { alignItems: 'center' }}>
              <Text style={[styles.title, !isDesktop && styles.titleMobile]}>Editar Perfil</Text>
              {isDesktop && <Text style={styles.subtitle}>Actualiza tu información personal</Text>}
            </View>
          </View>
          
          {isDesktop && (
            <TouchableOpacity 
              style={styles.saveBtn} 
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Ionicons name="save-outline" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>{saving ? 'Guardando...' : 'Guardar Cambios'}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.mainGrid, isDesktop && styles.mainGridDesktop]}>
          
          {/* Avatar Section */}
          <View style={[styles.column, { flex: 0.4 }]}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Foto de Perfil</Text>
              <View style={[styles.card, { alignItems: 'center', paddingVertical: 40 }]}>
                <View style={styles.avatarContainer}>
                  {photoURL ? (
                    <Image source={{ uri: photoURL }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>{displayName[0]?.toUpperCase() || 'A'}</Text>
                    </View>
                  )}
                  <TouchableOpacity style={styles.changePhotoBtn} onPress={handlePickImage}>
                    <Ionicons name="camera" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.avatarHint}>Sube una foto cuadrada para mejores resultados</Text>
              </View>
            </View>
          </View>

          {/* Info Section */}
          <View style={[styles.column, { flex: 0.6 }]}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Datos Personales</Text>
              <View style={styles.card}>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Nombre</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={20} color="#94A3B8" />
                    <TextInput
                      style={styles.input}
                      value={displayName}
                      onChangeText={setDisplayName}
                      placeholder="Tu nombre"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Apellidos</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={20} color="#94A3B8" />
                    <TextInput
                      style={styles.input}
                      value={apellido}
                      onChangeText={setApellido}
                      placeholder="Tu apellido"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Teléfono</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="call-outline" size={20} color="#94A3B8" />
                    <TextInput
                      style={styles.input}
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      keyboardType="phone-pad"
                      placeholder="+56 9 ..."
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Correo Electrónico (Solo lectura)</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: '#F1F5F9' }]}>
                    <Ionicons name="mail-outline" size={20} color="#94A3B8" />
                    <Text style={[styles.input, { color: '#64748B' }]}>{user?.email}</Text>
                  </View>
                </View>

              </View>
            </View>

            {!isDesktop && (
              <TouchableOpacity 
                style={[styles.saveBtn, { width: '100%', marginBottom: 40 }]} 
                onPress={handleSave}
                activeOpacity={0.8}
              >
                <Ionicons name="save-outline" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>{saving ? 'Guardando...' : 'Guardar Cambios'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  content: { padding: 24, paddingBottom: 80 },
  contentDesktop: { width: '100%', padding: 40, paddingTop: 32 },
  titleWrapper: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  titleWrapperMobile: { width: '100%', justifyContent: 'center', alignItems: 'center', position: 'relative', minHeight: 44 },
  inlineBackBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  inlineBackBtnMobile: { position: 'absolute', left: 0, zIndex: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, flexWrap: 'wrap', gap: 24 },
  headerMobile: { flexDirection: 'column', gap: 20, marginBottom: 24 },
  title: { fontSize: 32, fontWeight: '900', color: '#0F172A', letterSpacing: -1 },
  titleMobile: { fontSize: 20, textAlign: 'center', fontWeight: '800' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 2, fontWeight: '500' },
  
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B981', 
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, gap: 6,
    shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 4,
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  mainGrid: { flexDirection: 'column', gap: 24 },
  mainGridDesktop: { flexDirection: 'row', alignItems: 'flex-start', gap: 32 },
  column: { flex: 1 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 22, fontWeight: '900', color: '#0F172A', marginBottom: 24, letterSpacing: -0.5 },
  card: {
    backgroundColor: '#fff', borderRadius: 32, padding: 28, borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.04, shadowRadius: 40, elevation: 3,
  },

  avatarContainer: { position: 'relative', width: 120, height: 120 },
  avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#F1F5F9' },
  avatarPlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 48, fontWeight: '900', color: '#fff' },
  changePhotoBtn: {
    position: 'absolute', bottom: 0, right: 0, backgroundColor: '#10B981',
    width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#fff'
  },
  avatarHint: { fontSize: 12, color: '#94A3B8', marginTop: 16, fontWeight: '500', textAlign: 'center' },

  inputGroup: { marginBottom: 28 },
  label: { fontSize: 12, fontWeight: '800', color: '#64748B', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 16, borderWidth: 1.5, borderColor: '#F1F5F9', gap: 14,
  },
  input: { flex: 1, fontSize: 16, color: '#0F172A', fontWeight: '800', outlineStyle: 'none' } as any,
});
