import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  useWindowDimensions, 
  TextInput, 
  Pressable, 
  Modal, 
  ScrollView,
  Platform,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface OriginLocationModalProps {
  visible: boolean;
  onClose: () => void;
  onSave?: (location: { address: string; lat: number; lng: number }) => void;
}

export default function OriginLocationModal({ visible, onClose, onSave }: OriginLocationModalProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const mapRef = React.useRef<any>(null);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState({
    address: '',
    lat: -33.4489,
    lng: -70.6693
  });
  const [mapCenter, setMapCenter] = useState({ lat: -33.4489, lng: -70.6693 });

  // API KEY from the other project
  const GOOGLE_MAPS_API_KEY = 'AIzaSyCQH4lTH-ORvtHo2gnBEn9lkndlG2j1yjg';

  useEffect(() => {
    if (typeof window === 'undefined' || !window.addEventListener) return;
    
    const handleMessage = async (e: any) => {
      try {
        if (!e.data) return;
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data.type === 'map_moved') {
          const { lat, lng, address } = data;
          
          if (address) {
            setSelectedLocation({ address, lat, lng });
            return;
          }

          const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}&language=es`;
          const geoProxyUrl = `https://corsproxy.io/?${encodeURIComponent(geoUrl)}`;
          const res = await fetch(geoProxyUrl);
          const geoData = await res.json();
          
          if (geoData.results && geoData.results.length > 0) {
            const result = geoData.results[0];
            setSelectedLocation({
              address: result.formatted_address,
              lat: lat,
              lng: lng
            });
          }
        }

      } catch (err) {}
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const googleMapsHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { padding: 0; margin: 0; background: #E5E7EB; }
            #map { width: 100%; height: 100vh; }
            .gm-style-cc { display: none !important; }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            function initMap() {
                var map = new google.maps.Map(document.getElementById('map'), {
                    center: {lat: ${mapCenter.lat}, lng: ${mapCenter.lng}},
                    zoom: 17,
                    disableDefaultUI: true
                });

                var geocoder = new google.maps.Geocoder();


                var marker = new google.maps.Marker({
                    position: {lat: ${mapCenter.lat}, lng: ${mapCenter.lng}},
                    map: map,
                    draggable: true,
                    icon: {
                        path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
                        fillColor: '#10B981',
                        fillOpacity: 1,
                        strokeWeight: 2,
                        strokeColor: '#FFFFFF',
                        scale: 2,
                        anchor: new google.maps.Point(12, 22)
                    }
                });

                map.addListener('click', function(e) {
                    var pos = e.latLng;
                    marker.setPosition(pos);
                    window.parent.postMessage(JSON.stringify({ 
                        type: 'map_moved', 
                        lat: pos.lat(), 
                        lng: pos.lng() 
                    }), '*');
                });

                marker.addListener('dragend', function() {
                    var pos = marker.getPosition();
                    window.parent.postMessage(JSON.stringify({ 
                        type: 'map_moved', 
                        lat: pos.lat(), 
                        lng: pos.lng() 
                    }), '*');
                });

                window.addEventListener('message', function(e) {
                  try {
                    var data = JSON.parse(e.data);
                    if (data.type === 'set_center') {
                      var pos = {lat: data.lat, lng: data.lng};
                      map.setCenter(pos);
                      marker.setPosition(pos);
                    }
                    if (data.type === 'zoom_in') map.setZoom(map.getZoom() + 1);
                    if (data.type === 'zoom_out') map.setZoom(map.getZoom() - 1);
                    if (data.type === 'geocode_address') {
                      geocoder.geocode({ address: data.address }, function(results, status) {
                        if (status === 'OK' && results[0]) {
                          var pos = results[0].geometry.location;
                          map.setCenter(pos);
                          marker.setPosition(pos);
                          window.parent.postMessage(JSON.stringify({ 
                            type: 'map_moved', 
                            lat: pos.lat(), 
                            lng: pos.lng(),
                            address: results[0].formatted_address
                          }), '*');

                        }
                      });
                    }
                  } catch(err) {}
                });

            }
        </script>
        <script src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap&language=es" async defer></script>
    </body>
    </html>
  `;

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, isDesktop && styles.cardDesktop]}>
          
          {/* Map Side */}
          <View style={[styles.mapContainer, isDesktop && styles.mapContainerDesktop]}>
            {Platform.OS === 'web' ? (
              <iframe
                ref={mapRef}
                srcDoc={googleMapsHtml}
                style={{ width: '100%', height: '100%', border: 'none' } as any}
              />
            ) : (
              <View style={styles.noWebPlaceholder}>
                <Ionicons name="map-outline" size={48} color="#94A3B8" />
                <Text style={styles.noWebText}>Mapa disponible en versión web</Text>
              </View>
            )}

            <View style={styles.zoomControls}>
              <TouchableOpacity 
                style={styles.zoomBtn} 
                onPress={() => mapRef.current?.contentWindow.postMessage(JSON.stringify({ type: 'zoom_in' }), '*')}
              >
                <Ionicons name="add" size={24} color="#1F2937" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.zoomBtn} 
                onPress={() => mapRef.current?.contentWindow.postMessage(JSON.stringify({ type: 'zoom_out' }), '*')}
              >
                <Ionicons name="remove" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Controls Side */}
          <View style={[styles.infoSide, isDesktop && styles.infoSideDesktop]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Origen de Despacho</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <View style={styles.searchInputWrapper}>
                <Ionicons name="search" size={20} color="#94A3B8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Busca la dirección..."
                  value={mapSearchQuery}
                  onChangeText={async (text) => {
                    setMapSearchQuery(text);
                    setShowAutocomplete(text.length > 0);
                    if (text.length > 2) {
                      try {
                        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${GOOGLE_MAPS_API_KEY}`;
                        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
                        const res = await fetch(proxyUrl);
                        const data = await res.json();
                        setSearchResults(data.predictions || []);
                      } catch (e) {}
                    }
                  }}
                />
              </View>

              {showAutocomplete && searchResults.length > 0 && (
                <View style={styles.autocompleteDropdown}>
                  <ScrollView>
                    {searchResults.map((place, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.autocompleteItem}
                        onPress={() => {
                          setMapSearchQuery(place.description);
                          setShowAutocomplete(false);
                          if (mapRef.current) {
                            mapRef.current.contentWindow.postMessage(JSON.stringify({ 
                              type: 'geocode_address', 
                              address: place.description 
                            }), '*');
                          }
                        }}
                      >
                        <Ionicons name="location-outline" size={18} color="#64748B" />
                        <Text style={styles.autocompleteText} numberOfLines={1}>{place.description}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.selectedLocationCard}>
              <View style={styles.accentBar} />
              <Text style={styles.locationLabel}>Dirección Seleccionada</Text>
              <Text style={styles.addressText} numberOfLines={2}>{selectedLocation.address || 'Selecciona un punto en el mapa'}</Text>
              <View style={styles.coordsRow}>
                <View style={styles.coordItem}>
                  <Text style={styles.coordLabel}>Latitud</Text>
                  <Text style={styles.coordValue}>{selectedLocation.lat.toFixed(6)}</Text>
                </View>
                <View style={styles.coordItem}>
                  <Text style={styles.coordLabel}>Longitud</Text>
                  <Text style={styles.coordValue}>{selectedLocation.lng.toFixed(6)}</Text>
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.saveBtn} 
              onPress={() => {
                if (onSave) onSave(selectedLocation);
                onClose();
              }}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Confirmar Origen</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  card: {
    width: '100%',
    height: '90%',
    backgroundColor: '#fff',
    borderRadius: 32,
    overflow: 'hidden',
    flexDirection: 'column'
  },
  cardDesktop: {
    maxWidth: 1000,
    height: 600,
    flexDirection: 'row'
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    position: 'relative'
  },
  mapContainerDesktop: {
    flex: 1.2
  },
  noWebPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  noWebText: {
    color: '#94A3B8',
    fontWeight: '600'
  },
  zoomControls: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    gap: 10
  },
  zoomBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4
  },
  infoSide: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between'
  },
  infoSideDesktop: {
    maxWidth: 400
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5
  },
  closeBtn: {
    padding: 4
  },
  searchContainer: {
    zIndex: 10,
    marginBottom: 20
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 12
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    ...Platform.select({
      web: { outlineStyle: 'none' } as any
    })
  },
  autocompleteDropdown: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10
  },
  autocompleteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10
  },
  autocompleteText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    fontWeight: '500'
  },
  selectedLocationCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#10B981'
  },
  locationLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8
  },
  addressText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
    lineHeight: 20
  },
  coordsRow: {
    flexDirection: 'row',
    gap: 20
  },
  coordItem: {
    flex: 1
  },
  coordLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2
  },
  coordValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155'
  },
  saveBtn: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 20,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  }
});
