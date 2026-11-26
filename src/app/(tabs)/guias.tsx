import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';

const GUIAS_PREDEFINIDAS = [
  {
    id: 'g1',
    titulo: 'Prevención de Caídas en el Hogar',
    categoria: 'Seguridad',
    contenido:
      '1. Retira alfombras sueltas o cables en zonas de paso.\n2. Instala barras de apoyo firmes en la ducha y junto al inodoro.\n3. Mantén buena iluminación nocturna entre el dormitorio y el baño.\n4. Utiliza calzado cerrado con suela antideslizante.',
    imagen_url: null,
    video_url: null,
    esLocal: true,
  },
  {
    id: 'g2',
    titulo: 'Movilización Segura sin Lastimar tu Espalda',
    categoria: 'Cuidado Físico',
    contenido:
      '1. Flexiona siempre las rodillas, nunca dobles la cintura.\n2. Mantén al paciente lo más cerca posible de tu cuerpo al levantarlo.\n3. Separa los pies a la altura de tus hombros para tener estabilidad.\n4. Gira con los pies, evitando torcer la columna.',
    imagen_url: null,
    video_url: null,
    esLocal: true,
  },
  {
    id: 'g3',
    titulo: 'Prevención de Úlceras por Presión (Escaras)',
    categoria: 'Piel y Salud',
    contenido:
      '1. Cambia de postura al paciente cada 2 o 3 horas si pasa mucho tiempo en cama.\n2. Mantén la piel limpia, seca e hidratada con crema neutra.\n3. Revisa a diario zonas de apoyo como talones, caderas y espalda baja.\n4. Evita arrugas en las sábanas.',
    imagen_url: null,
    video_url: null,
    esLocal: true,
  },
  {
    id: 'g4',
    titulo: 'Autocuidado del Cuidador: Evitar el Agotamiento',
    categoria: 'Bienestar',
    contenido:
      '1. Pide ayuda a familiares o redes de apoyo antes de sentirte sobrepasado.\n2. Reserva al menos 30 minutos al día para descansar o caminar.\n3. Mantén tus propios controles médicos y horas de sueño.\n4. Comparte tus emociones en la comunidad de Respiro.',
    imagen_url: null,
    video_url: null,
    esLocal: true,
  },
];

export default function GuiasScreen() {
  const [guias, setGuias] = useState<any[]>(GUIAS_PREDEFINIDAS);
  const [cargando, setCargando] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [puedePublicar, setPuedePublicar] = useState(false);

  const [categoriaActiva, setCategoriaActiva] = useState<string>('Todas');
  const [guiaSeleccionada, setGuiaSeleccionada] = useState<any>(null);

  const [modalCrearVisible, setModalCrearVisible] = useState(false);
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [nuevaCategoria, setNuevaCategoria] = useState('Cuidado Físico');
  const [nuevoContenido, setNuevoContenido] = useState('');
  const [nuevoVideoUrl, setNuevoVideoUrl] = useState('');
  const [imagenLocal, setImagenLocal] = useState<any>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    inicializar();
  }, []);

  const inicializar = async () => {
    setCargando(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser(user);
      const { data: perfil } = await supabase
        .from('cuidadores')
        .select('verificado')
        .eq('id', user.id)
        .maybeSingle();

      setPuedePublicar(Boolean(perfil?.verificado));
    }
    await cargarGuiasBD();
    setCargando(false);
  };

  const cargarGuiasBD = async () => {
    try {
      const { data, error } = await supabase
        .from('guias')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setGuias([...data, ...GUIAS_PREDEFINIDAS]);
      } else {
        setGuias(GUIAS_PREDEFINIDAS);
      }
    } catch {
      setGuias(GUIAS_PREDEFINIDAS);
    }
  };

  const seleccionarImagenGuia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para subir una foto.');
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (!res.canceled && res.assets[0]) {
      setImagenLocal(res.assets[0]);
    }
  };

  const guardarNuevaGuia = async () => {
    if (!puedePublicar) {
      Alert.alert('Acceso restringido', 'Solo perfiles profesionales o verificados pueden publicar guías.');
      return;
    }

    if (!nuevoTitulo.trim() || !nuevoContenido.trim()) {
      Alert.alert('Campos obligatorios', 'Ingresa el título y las instrucciones de la guía.');
      return;
    }

    setGuardando(true);
    let imagenSubidaUrl = null;

    try {
      if (imagenLocal && imagenLocal.base64 && currentUser) {
        const filePath = `guias/${currentUser.id}_${Date.now()}.jpg`;
        const bin = atob(imagenLocal.base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

        const { error: uploadErr } = await supabase.storage
          .from('guias_multimedia')
          .upload(filePath, bytes.buffer, { contentType: 'image/jpeg', upsert: true });

        if (!uploadErr) {
          const { data: pubData } = supabase.storage
            .from('guias_multimedia')
            .getPublicUrl(filePath);
          imagenSubidaUrl = pubData.publicUrl;
        }
      }

      const payload: any = {
        titulo: nuevoTitulo.trim(),
        categoria: nuevaCategoria,
        contenido: nuevoContenido.trim(),
        imagen_url: imagenSubidaUrl,
        video_url: nuevoVideoUrl.trim() || null,
        autor_id: currentUser?.id || null,
      };

      const { error } = await supabase.from('guias').insert([payload]);

      if (error) {
        Alert.alert('Error al publicar', error.message);
      } else {
        setModalCrearVisible(false);
        setNuevoTitulo('');
        setNuevoContenido('');
        setNuevoVideoUrl('');
        setImagenLocal(null);
        await cargarGuiasBD();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setGuardando(false);
    }
  };

  const abrirVideo = async (url: string) => {
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) await Linking.openURL(url);
      else Alert.alert('Aviso', 'No se pudo abrir el enlace de video.');
    } catch {
      Alert.alert('Error', 'Verifica el enlace ingresado.');
    }
  };

  const categorias = ['Todas', 'Seguridad', 'Cuidado Físico', 'Piel y Salud', 'Bienestar'];

  const guiasFiltradas =
    categoriaActiva === 'Todas'
      ? guias
      : guias.filter((g) => g.categoria === categoriaActiva);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.tituloHeader}>Guías de Cuidado</Text>
          <Text style={styles.subHeader}>Consejos prácticos verificados</Text>
        </View>
        {puedePublicar && (
          <TouchableOpacity
            style={styles.btnNuevaGuia}
            onPress={() => setModalCrearVisible(true)}
          >
            <Ionicons name="add-circle" size={22} color="#FFFFFF" />
            <Text style={styles.btnNuevaGuiaTexto}>Aportar</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriasBar}
      >
        {categorias.map((cat) => {
          const activa = categoriaActiva === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, activa && styles.catChipActiva]}
              onPress={() => setCategoriaActiva(cat)}
            >
              <Text style={[styles.catChipTexto, activa && styles.catChipTextoActiva]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {cargando ? (
        <ActivityIndicator size="large" color="#2C221E" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={guiasFiltradas}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.cardGuia}
              onPress={() => setGuiaSeleccionada(item)}
              activeOpacity={0.85}
            >
              <View style={styles.badgeCategoria}>
                <Text style={styles.badgeCategoriaTexto}>{item.categoria}</Text>
              </View>

              <Text style={styles.guiaTitulo}>{item.titulo}</Text>

              <Text style={styles.guiaExtracto} numberOfLines={3}>
                {item.contenido}
              </Text>

              {item.imagen_url ? (
                <Image source={{ uri: item.imagen_url }} style={styles.guiaThumb} />
              ) : null}

              <View style={styles.guiaFooter}>
                <Text style={styles.leerMasTexto}>Leer guía completa</Text>
                <Ionicons name="arrow-forward-circle" size={24} color="#2C221E" />
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* MODAL LECTURA DE GUÍA */}
      <Modal visible={Boolean(guiaSeleccionada)} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.badgeCategoria}>
                <Text style={styles.badgeCategoriaTexto}>{guiaSeleccionada?.categoria}</Text>
              </View>
              <TouchableOpacity onPress={() => setGuiaSeleccionada(null)}>
                <Ionicons name="close-circle" size={32} color="#141414" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitulo}>{guiaSeleccionada?.titulo}</Text>

              {guiaSeleccionada?.imagen_url ? (
                <Image
                  source={{ uri: guiaSeleccionada.imagen_url }}
                  style={styles.modalImagen}
                />
              ) : null}

              <Text style={styles.modalContenido}>{guiaSeleccionada?.contenido}</Text>

              {guiaSeleccionada?.video_url ? (
                <TouchableOpacity
                  style={styles.btnVideo}
                  onPress={() => abrirVideo(guiaSeleccionada.video_url)}
                >
                  <Ionicons name="play-circle" size={26} color="#FFFFFF" />
                  <Text style={styles.btnVideoTexto}>Ver Video Explicativo</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={styles.btnCerrarLectura}
                onPress={() => setGuiaSeleccionada(null)}
              >
                <Text style={styles.btnCerrarLecturaTexto}>Cerrar Guía</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL APORTAR NUEVA GUÍA */}
      <Modal visible={modalCrearVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Publicar Nueva Guía</Text>
              <TouchableOpacity onPress={() => setModalCrearVisible(false)}>
                <Ionicons name="close-circle" size={30} color="#141414" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Título de la guía *</Text>
              <TextInput
                style={styles.inputControl}
                placeholder="Ej: Cómo preparar papilla nutritiva"
                placeholderTextColor="#555555"
                value={nuevoTitulo}
                onChangeText={setNuevoTitulo}
              />

              <Text style={styles.inputLabel}>Categoría</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {['Seguridad', 'Cuidado Físico', 'Piel y Salud', 'Bienestar'].map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.catChip, nuevaCategoria === c && styles.catChipActiva]}
                    onPress={() => setNuevaCategoria(c)}
                  >
                    <Text style={[styles.catChipTexto, nuevaCategoria === c && styles.catChipTextoActiva]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Pasos e instrucciones *</Text>
              <TextInput
                style={[styles.inputControl, { minHeight: 110, textAlignVertical: 'top' }]}
                placeholder="Escribe los pasos claros y ordenados..."
                placeholderTextColor="#555555"
                multiline
                value={nuevoContenido}
                onChangeText={setNuevoContenido}
              />

              <Text style={styles.inputLabel}>Enlace de Video (opcional)</Text>
              <TextInput
                style={styles.inputControl}
                placeholder="https://youtube.com/..."
                placeholderTextColor="#555555"
                autoCapitalize="none"
                value={nuevoVideoUrl}
                onChangeText={setNuevoVideoUrl}
              />

              <TouchableOpacity style={styles.btnSubirFoto} onPress={seleccionarImagenGuia}>
                <Ionicons name="image" size={22} color="#141414" />
                <Text style={styles.btnSubirFotoTexto}>
                  {imagenLocal ? 'Imagen seleccionada ✓' : 'Adjuntar Fotografía (opcional)'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnPublicarGuia}
                onPress={guardarNuevaGuia}
                disabled={guardando}
              >
                {guardando ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnPublicarGuiaTexto}>Publicar Guía</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2ECE4', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  tituloHeader: { fontSize: 26, fontWeight: '900', color: '#141414' },
  subHeader: { fontSize: 15, fontWeight: '600', color: '#333333' },
  btnNuevaGuia: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2C221E', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
  btnNuevaGuiaTexto: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16, marginLeft: 6 },

  categoriasBar: { maxHeight: 50, marginBottom: 14 },
  catChip: { backgroundColor: '#FFFFFF', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 24, marginRight: 8, borderWidth: 2, borderColor: '#2C221E' },
  catChipActiva: { backgroundColor: '#2C221E' },
  catChipTexto: { fontSize: 15, fontWeight: 'bold', color: '#141414' },
  catChipTextoActiva: { color: '#FFFFFF' },

  cardGuia: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 2, borderColor: '#6E5D4F' },
  badgeCategoria: { alignSelf: 'flex-start', backgroundColor: '#2C221E', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 10, marginBottom: 10 },
  badgeCategoriaTexto: { color: '#FFFFFF', fontSize: 14, fontWeight: 'bold' },
  guiaTitulo: { fontSize: 20, fontWeight: 'bold', color: '#141414', marginBottom: 8 },
  guiaExtracto: { fontSize: 16, color: '#2B2B2B', lineHeight: 24, marginBottom: 12 },
  guiaThumb: { width: '100%', height: 160, borderRadius: 12, marginBottom: 12, borderWidth: 1.5, borderColor: '#2C221E' },
  guiaFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1.5, borderTopColor: '#D5C9BC', paddingTop: 12 },
  leerMasTexto: { fontSize: 16, fontWeight: 'bold', color: '#141414' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20, maxHeight: '90%', borderWidth: 2, borderColor: '#141414' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitulo: { fontSize: 22, fontWeight: 'bold', color: '#141414', marginBottom: 14 },
  modalImagen: { width: '100%', height: 200, borderRadius: 12, marginBottom: 14, borderWidth: 1.5, borderColor: '#2C221E' },
  modalContenido: { fontSize: 18, color: '#141414', lineHeight: 28, marginBottom: 20 },

  btnVideo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#B71C1C', paddingVertical: 14, borderRadius: 14, marginBottom: 12 },
  btnVideoTexto: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 17, marginLeft: 8 },
  btnCerrarLectura: { backgroundColor: '#2C221E', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  btnCerrarLecturaTexto: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 17 },

  inputLabel: { fontSize: 15, fontWeight: 'bold', color: '#141414', marginTop: 12, marginBottom: 6 },
  inputControl: { backgroundColor: '#F2ECE4', borderWidth: 2, borderColor: '#2C221E', borderRadius: 12, padding: 12, fontSize: 16, color: '#141414' },
  btnSubirFoto: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2ECE4', borderWidth: 2, borderColor: '#2C221E', borderRadius: 12, paddingVertical: 14, marginTop: 14 },
  btnSubirFotoTexto: { fontSize: 16, fontWeight: 'bold', color: '#141414', marginLeft: 8 },
  btnPublicarGuia: { backgroundColor: '#2C221E', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 18, marginBottom: 10 },
  btnPublicarGuiaTexto: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 17 },
});