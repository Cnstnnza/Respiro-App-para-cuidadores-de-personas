import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';

const CATEGORIAS = [
  'Todas',
  'Beneficios e Info',
  'Espalda y Postura',
  'Salud Mental y Pausa',
  'Técnicas de Cuidado'
];

const GENEROS = ['Todos', 'Lectura', 'Infografía', 'Video'];

export default function GuiasScreen() {
  const [capsulas, setCapsulas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todas');
  const [generoSeleccionado, setGeneroSeleccionado] = useState('Todos');
  const [esVerificado, setEsVerificado] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Modal para ver cápsula en detalle
  const [capsulaAbierta, setCapsulaAbierta] = useState<any>(null);

  // Modal para crear nueva cápsula (solo usuarios verificados)
  const [modalCrear, setModalCrear] = useState(false);
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevaCategoria, setNuevaCategoria] = useState('Beneficios e Info');
  const [nuevoGenero, setNuevoGenero] = useState<'Lectura' | 'Infografía' | 'Video'>('Lectura');
  const [nuevaDescripcion, setNuevaDescripcion] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [imagenLocal, setImagenLocal] = useState<string | null>(null);
  const [imagenBase64, setImagenBase64] = useState<string | null>(null);
  const [tiempoEstimado, setTiempoEstimado] = useState('3 min');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    verificarEstadoUsuario();
    cargarCapsulas();
  }, []);

  const verificarEstadoUsuario = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser(user);
      const { data: cuidador } = await supabase
        .from('cuidadores')
        .select('verificado')
        .eq('id', user.id)
        .maybeSingle();

      if (cuidador && Boolean(cuidador.verificado)) {
        setEsVerificado(true);
      }
    }
  };

  const cargarCapsulas = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('capsulas_guias')
        .select('*, cuidadores:autor_id(nombre, foto_url, verificado)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setCapsulas(data);
      }
    } catch (err: any) {
      console.log('Error al cargar guías:', err.message);
    } finally {
      setCargando(false);
    }
  };

  const seleccionarImagen = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Se necesita acceso a la galería para adjuntar una imagen.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].uri) {
      setImagenLocal(result.assets[0].uri);
      setImagenBase64(result.assets[0].base64 || null);
    }
  };

  const subirImagenStorage = async (): Promise<string | null> => {
    if (!imagenBase64 || !currentUser) return null;
    try {
      const filePath = `guias/${currentUser.id}_${Date.now()}.jpg`;
      const binaryString = atob(imagenBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const { error: uploadError } = await supabase.storage
        .from('guias_multimedia')
        .upload(filePath, bytes.buffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('guias_multimedia')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (err: any) {
      console.log('Error subiendo imagen:', err.message);
      return null;
    }
  };

  const guardarCapsula = async () => {
    if (!nuevoTitulo.trim() || !nuevaDescripcion.trim()) {
      Alert.alert('Campos obligatorios', 'El título y la descripción no pueden quedar vacíos.');
      return;
    }

    setGuardando(true);
    let finalUrl = '';

    if (nuevoGenero === 'Infografía' && imagenBase64) {
      const urlSubida = await subirImagenStorage();
      if (urlSubida) finalUrl = urlSubida;
    } else if (nuevoGenero === 'Video' && videoUrl.trim()) {
      finalUrl = videoUrl.trim();
    }

    const { error } = await supabase.from('capsulas_guias').insert([
      {
        autor_id: currentUser?.id,
        titulo: nuevoTitulo.trim(),
        categoria: nuevaCategoria,
        genero_formato: nuevoGenero,
        descripcion: nuevaDescripcion.trim(),
        multimedia_url: finalUrl,
        tiempo_estimado: tiempoEstimado.trim() || '3 min',
      },
    ]);

    setGuardando(false);

    if (error) {
      Alert.alert('Error', 'No se pudo guardar la cápsula: ' + error.message);
    } else {
      setNuevoTitulo('');
      setNuevaDescripcion('');
      setVideoUrl('');
      setImagenLocal(null);
      setImagenBase64(null);
      setNuevoGenero('Lectura');
      setModalCrear(false);
      cargarCapsulas();
      Alert.alert('¡Publicada!', 'La cápsula ahora está disponible para todos los cuidadores.');
    }
  };

  // Filtrado compuesto (Categoría + Género)
  const capsulasFiltradas = capsulas.filter((c) => {
    const coincideCategoria =
      categoriaSeleccionada === 'Todas' || c.categoria === categoriaSeleccionada;
    const coincideGenero =
      generoSeleccionado === 'Todos' || c.genero_formato === generoSeleccionado;
    return coincideCategoria && coincideGenero;
  });

  const getIconoGenero = (genero: string) => {
    switch (genero) {
      case 'Video':
        return 'play-circle';
      case 'Infografía':
        return 'image';
      default:
        return 'document-text';
    }
  };

  const getColorGenero = (genero: string) => {
    switch (genero) {
      case 'Video':
        return '#D9534F';
      case 'Infografía':
        return '#8E44AD';
      default:
        return '#2E7D32';
    }
  };

  return (
    <View style={styles.container}>
      {/* Encabezado */}
      <View style={styles.header}>
        <View>
          <Text style={styles.titulo}>Guías y Recursos</Text>
          <Text style={styles.subtitulo}>Autocuidado, beneficios y técnicas</Text>
        </View>

        {esVerificado && (
          <View style={styles.tagVerificadoBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#1D9BF0" />
            <Text style={styles.tagVerificadoTexto}>Verificado</Text>
          </View>
        )}
      </View>

      {/* 1. Filtros por Categoría */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtrosScroll}
        contentContainerStyle={{ paddingRight: 16 }}
      >
        {CATEGORIAS.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.chipFiltro, categoriaSeleccionada === cat && styles.chipFiltroActivo]}
            onPress={() => setCategoriaSeleccionada(cat)}
          >
            <Text style={[styles.chipFiltroTexto, categoriaSeleccionada === cat && styles.chipFiltroTextoActivo]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 2. Filtros por Género / Formato */}
      <View style={styles.generosRow}>
        {GENEROS.map((gen) => (
          <TouchableOpacity
            key={gen}
            style={[styles.generoBtn, generoSeleccionado === gen && styles.generoBtnActivo]}
            onPress={() => setGeneroSeleccionado(gen)}
          >
            {gen !== 'Todos' && (
              <Ionicons
                name={getIconoGenero(gen)}
                size={13}
                color={generoSeleccionado === gen ? '#FFFFFF' : '#8A7A70'}
                style={{ marginRight: 4 }}
              />
            )}
            <Text style={[styles.generoBtnTexto, generoSeleccionado === gen && styles.generoBtnTextoActivo]}>
              {gen}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Listado de Cápsulas */}
      {cargando ? (
        <ActivityIndicator size="large" color="#C59A77" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={capsulasFiltradas}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.vacioContainer}>
              <Ionicons name="book-outline" size={48} color="#A0958E" />
              <Text style={styles.vacioTexto}>No hay cápsulas con estos filtros.</Text>
              <Text style={styles.vacioSub}>
                {esVerificado
                  ? 'Toca el botón flotante (+) para redactar una cápsula.'
                  : 'Pronto se agregarán recursos validados para esta sección.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.cardCapsula}
              activeOpacity={0.88}
              onPress={() => setCapsulaAbierta(item)}
            >
              {/* Vista previa si es infografía con imagen */}
              {item.genero_formato === 'Infografía' && item.multimedia_url ? (
                <Image source={{ uri: item.multimedia_url }} style={styles.portadaCapsula} />
              ) : null}

              <View style={styles.cuerpoCard}>
                <View style={styles.filaBadgeCategoria}>
                  {/* Badge de Género / Formato */}
                  <View style={[styles.badgeGenero, { backgroundColor: `${getColorGenero(item.genero_formato)}15` }]}>
                    <Ionicons
                      name={getIconoGenero(item.genero_formato)}
                      size={12}
                      color={getColorGenero(item.genero_formato)}
                    />
                    <Text style={[styles.badgeGeneroTexto, { color: getColorGenero(item.genero_formato) }]}>
                      {item.genero_formato}
                    </Text>
                  </View>

                  <Text style={styles.tiempoLectura}>
                    <Ionicons name="time-outline" size={12} color="#8A7A70" /> {item.tiempo_estimado}
                  </Text>
                </View>

                <Text style={styles.categoriaPillMini}>{item.categoria}</Text>
                <Text style={styles.tituloCapsula}>{item.titulo}</Text>
                <Text style={styles.descripcionCorta} numberOfLines={2}>
                  {item.descripcion}
                </Text>

                {/* Footer autor verificado */}
                <View style={styles.footerCapsula}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="checkmark-circle" size={14} color="#1D9BF0" />
                    <Text style={styles.autorCapsula}>
                      {item.cuidadores?.nombre || 'Especialista Respiro'}
                    </Text>
                  </View>

                  {item.genero_formato === 'Video' && (
                    <View style={styles.indicadorVideo}>
                      <Ionicons name="play" size={11} color="#FFFFFF" />
                      <Text style={styles.indicadorVideoTexto}>Ver video</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Botón Flotante para Publicar (SOLO visible para usuarios verificados) */}
      {esVerificado && (
        <TouchableOpacity
          style={styles.fabCrear}
          onPress={() => setModalCrear(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* MODAL: VER CÁPSULA DETALLADA */}
      <Modal visible={Boolean(capsulaAbierta)} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalDetalleContent}>
            <View style={styles.modalDetalleHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.detalleBadgeCategoria}>{capsulaAbierta?.categoria}</Text>
                <Text style={styles.detalleTitulo}>{capsulaAbierta?.titulo}</Text>
              </View>
              <TouchableOpacity onPress={() => setCapsulaAbierta(null)}>
                <Ionicons name="close" size={24} color="#4A3B32" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Imagen para Infografía */}
              {capsulaAbierta?.genero_formato === 'Infografía' && capsulaAbierta?.multimedia_url ? (
                <Image
                  source={{ uri: capsulaAbierta.multimedia_url }}
                  style={styles.detalleImagen}
                  resizeMode="cover"
                />
              ) : null}

              {/* Botón directo si es Video */}
              {capsulaAbierta?.genero_formato === 'Video' && capsulaAbierta?.multimedia_url ? (
                <TouchableOpacity
                  style={styles.btnAbrirVideo}
                  onPress={() => Linking.openURL(capsulaAbierta.multimedia_url)}
                >
                  <Ionicons name="logo-youtube" size={22} color="#FFFFFF" />
                  <Text style={styles.btnAbrirVideoTexto}>Reproducir Video Demostrativo</Text>
                </TouchableOpacity>
              ) : null}

              <Text style={styles.detalleDescripcion}>{capsulaAbierta?.descripcion}</Text>

              <View style={styles.detalleAutorCard}>
                <Ionicons name="shield-checkmark" size={18} color="#1D9BF0" />
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.detalleAutorNombre}>
                    Validado por: {capsulaAbierta?.cuidadores?.nombre || 'Profesional'}
                  </Text>
                  <Text style={styles.detalleAutorSub}>Material verificado para el cuidado</Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.btnCerrarDetalle}
              onPress={() => setCapsulaAbierta(null)}
            >
              <Text style={styles.btnCerrarDetalleTexto}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: REDACTAR CÁPSULA (SOLO VERIFICADOS) */}
      <Modal visible={modalCrear} animationType="slide">
        <View style={styles.modalCrearScreen}>
          <View style={styles.modalCrearHeader}>
            <TouchableOpacity onPress={() => setModalCrear(false)}>
              <Text style={styles.modalCrearCancelar}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalCrearTitulo}>Nueva Cápsula</Text>
            <TouchableOpacity onPress={guardarCapsula} disabled={guardando}>
              {guardando ? (
                <ActivityIndicator size="small" color="#C59A77" />
              ) : (
                <Text style={styles.modalCrearGuardar}>Publicar</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.formLabel}>Título de la Cápsula *</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Ej: Cómo girar al paciente sin dañar tu espalda"
              placeholderTextColor="#A0958E"
              value={nuevoTitulo}
              onChangeText={setNuevoTitulo}
            />

            <Text style={styles.formLabel}>Categoría Temática *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {CATEGORIAS.filter((c) => c !== 'Todas').map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chipSelector, nuevaCategoria === cat && styles.chipSelectorActivo]}
                  onPress={() => setNuevaCategoria(cat)}
                >
                  <Text style={[styles.chipSelectorTexto, nuevaCategoria === cat && styles.chipSelectorTextoActivo]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.formLabel}>Género / Formato del Contenido *</Text>
            <View style={styles.filaOpcionesMulti}>
              {(['Lectura', 'Infografía', 'Video'] as const).map((gen) => (
                <TouchableOpacity
                  key={gen}
                  style={[styles.btnOpcionMulti, nuevoGenero === gen && styles.btnOpcionMultiActivo]}
                  onPress={() => setNuevoGenero(gen)}
                >
                  <Ionicons
                    name={getIconoGenero(gen)}
                    size={14}
                    color={nuevoGenero === gen ? '#FFFFFF' : '#665B54'}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.textoOpcionMulti, nuevoGenero === gen && styles.textoOpcionMultiActivo]}>
                    {gen}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>Tiempo estimado</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Ej: 2 min lectura / Video de 3 min"
              placeholderTextColor="#A0958E"
              value={tiempoEstimado}
              onChangeText={setTiempoEstimado}
            />

            {/* Selector de Imagen para Infografías */}
            {nuevoGenero === 'Infografía' && (
              <View style={{ marginBottom: 14 }}>
                <TouchableOpacity style={styles.btnElegirFoto} onPress={seleccionarImagen}>
                  <Ionicons name="camera-outline" size={20} color="#C59A77" />
                  <Text style={styles.btnElegirFotoTexto}>
                    {imagenLocal ? 'Cambiar imagen' : 'Seleccionar infografía o foto'}
                  </Text>
                </TouchableOpacity>
                {imagenLocal ? (
                  <Image source={{ uri: imagenLocal }} style={styles.previewFoto} />
                ) : null}
              </View>
            )}

            {/* Input URL para Videos */}
            {nuevoGenero === 'Video' && (
              <View style={{ marginBottom: 14 }}>
                <Text style={styles.formLabel}>URL del Video (YouTube o Vimeo)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="https://youtube.com/watch?v=..."
                  placeholderTextColor="#A0958E"
                  value={videoUrl}
                  onChangeText={setVideoUrl}
                  autoCapitalize="none"
                />
              </View>
            )}

            <Text style={styles.formLabel}>Descripción y Paso a Paso *</Text>
            <TextInput
              style={[styles.formInput, { minHeight: 140, textAlignVertical: 'top' }]}
              placeholder="Explica con claridad los requisitos, pasos o ejercicios para el cuidador..."
              placeholderTextColor="#A0958E"
              multiline
              value={nuevaDescripcion}
              onChangeText={setNuevaDescripcion}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7EFE8', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  titulo: { fontSize: 26, fontWeight: 'bold', color: '#4A3B32' },
  subtitulo: { fontSize: 13, color: '#8A7A70' },
  tagVerificadoBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E1F5FE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagVerificadoTexto: { fontSize: 11, color: '#0288D1', fontWeight: 'bold', marginLeft: 4 },
  filtrosScroll: { maxHeight: 38, marginBottom: 8 },
  chipFiltro: { backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8, borderWidth: 1, borderColor: '#E8DFD8' },
  chipFiltroActivo: { backgroundColor: '#C59A77', borderColor: '#C59A77' },
  chipFiltroTexto: { fontSize: 12, color: '#665B54', fontWeight: '600' },
  chipFiltroTextoActivo: { color: '#FFFFFF', fontWeight: 'bold' },
  generosRow: { flexDirection: 'row', marginBottom: 12 },
  generoBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAF6F0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginRight: 6, borderWidth: 1, borderColor: '#E8DFD8' },
  generoBtnActivo: { backgroundColor: '#4A3B32', borderColor: '#4A3B32' },
  generoBtnTexto: { fontSize: 11, color: '#665B54', fontWeight: '600' },
  generoBtnTextoActivo: { color: '#FFFFFF', fontWeight: 'bold' },
  cardCapsula: { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E8DFD8' },
  portadaCapsula: { width: '100%', height: 135 },
  cuerpoCard: { padding: 14 },
  filaBadgeCategoria: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  badgeGenero: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeGeneroTexto: { fontSize: 11, fontWeight: 'bold', marginLeft: 4 },
  tiempoLectura: { fontSize: 11, color: '#8A7A70' },
  categoriaPillMini: { fontSize: 11, color: '#C59A77', fontWeight: '700', marginBottom: 2 },
  tituloCapsula: { fontSize: 16, fontWeight: 'bold', color: '#4A3B32', marginBottom: 4 },
  descripcionCorta: { fontSize: 13, color: '#665B54', lineHeight: 18, marginBottom: 10 },
  footerCapsula: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F7EFE8', paddingTop: 8 },
  autorCapsula: { fontSize: 12, color: '#536471', fontWeight: '600', marginLeft: 4 },
  indicadorVideo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D9534F', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  indicadorVideoTexto: { fontSize: 10, color: '#FFFFFF', fontWeight: 'bold', marginLeft: 4 },
  fabCrear: { position: 'absolute', bottom: 20, right: 20, width: 54, height: 54, borderRadius: 27, backgroundColor: '#C59A77', justifyContent: 'center', alignItems: 'center', elevation: 6 },
  vacioContainer: { alignItems: 'center', padding: 40 },
  vacioTexto: { fontSize: 15, fontWeight: 'bold', color: '#8A7A70', marginTop: 10 },
  vacioSub: { fontSize: 13, color: '#A0958E', textAlign: 'center', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalDetalleContent: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, maxHeight: '88%' },
  modalDetalleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  detalleBadgeCategoria: { fontSize: 12, fontWeight: 'bold', color: '#C59A77', marginBottom: 2 },
  detalleTitulo: { fontSize: 18, fontWeight: 'bold', color: '#4A3B32' },
  detalleImagen: { width: '100%', height: 180, borderRadius: 12, marginBottom: 14 },
  btnAbrirVideo: { flexDirection: 'row', backgroundColor: '#D9534F', padding: 12, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  btnAbrirVideoTexto: { color: '#FFFFFF', fontWeight: 'bold', marginLeft: 8 },
  detalleDescripcion: { fontSize: 14, color: '#4A3B32', lineHeight: 22, marginBottom: 16 },
  detalleAutorCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAF6F0', padding: 10, borderRadius: 10, marginBottom: 14 },
  detalleAutorNombre: { fontSize: 12, fontWeight: 'bold', color: '#4A3B32' },
  detalleAutorSub: { fontSize: 11, color: '#8A7A70' },
  btnCerrarDetalle: { backgroundColor: '#C59A77', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  btnCerrarDetalleTexto: { color: '#FFFFFF', fontWeight: 'bold' },
  modalCrearScreen: { flex: 1, backgroundColor: '#FFFFFF', paddingTop: 40 },
  modalCrearHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F7EFE8' },
  modalCrearCancelar: { fontSize: 15, color: '#8A7A70' },
  modalCrearTitulo: { fontSize: 17, fontWeight: 'bold', color: '#4A3B32' },
  modalCrearGuardar: { fontSize: 15, fontWeight: 'bold', color: '#C59A77' },
  formLabel: { fontSize: 12, fontWeight: 'bold', color: '#8A7A70', marginTop: 10, marginBottom: 4 },
  formInput: { backgroundColor: '#FAF6F0', borderWidth: 1, borderColor: '#E8DFD8', borderRadius: 10, padding: 10, fontSize: 14, color: '#333' },
  chipSelector: { backgroundColor: '#FAF6F0', borderWidth: 1, borderColor: '#E8DFD8', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, marginRight: 8 },
  chipSelectorActivo: { backgroundColor: '#C59A77', borderColor: '#C59A77' },
  chipSelectorTexto: { fontSize: 12, color: '#665B54' },
  chipSelectorTextoActivo: { color: '#FFFFFF', fontWeight: 'bold' },
  filaOpcionesMulti: { flexDirection: 'row', marginBottom: 12 },
  btnOpcionMulti: { flex: 1, flexDirection: 'row', paddingVertical: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E8DFD8', borderRadius: 8, marginHorizontal: 2 },
  btnOpcionMultiActivo: { backgroundColor: '#4A3B32', borderColor: '#4A3B32' },
  textoOpcionMulti: { fontSize: 12, color: '#665B54', fontWeight: '600' },
  textoOpcionMultiActivo: { color: '#FFFFFF', fontWeight: 'bold' },
  btnElegirFoto: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAF6F0', borderWidth: 1, borderColor: '#C59A77', borderStyle: 'dashed', borderRadius: 10, padding: 12, marginBottom: 8 },
  btnElegirFotoTexto: { color: '#C59A77', fontWeight: '600', marginLeft: 8, fontSize: 13 },
  previewFoto: { width: '100%', height: 140, borderRadius: 10, marginTop: 4 }
});