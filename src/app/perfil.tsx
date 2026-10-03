import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
  Modal
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

export default function PerfilScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId?: string }>();

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [esMiPerfil, setEsMiPerfil] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);

  // Datos del perfil
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [especialidades, setEspecialidades] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [verificado, setVerificado] = useState(false);

  // Modal edición de perfil
  const [modalEditarPerfil, setModalEditarPerfil] = useState(false);
  const [editNombre, setEditNombre] = useState('');
  const [editTelefono, setEditTelefono] = useState('');
  const [editEspecialidades, setEditEspecialidades] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');

  // Publicaciones del usuario
  const [misPublicaciones, setMisPublicaciones] = useState<any[]>([]);

  // Modal edición de publicación
  const [modalEditarPub, setModalEditarPub] = useState(false);
  const [postAEditar, setPostAEditar] = useState<any>(null);
  const [textoEditado, setTextoEditado] = useState('');
  const [guardandoPost, setGuardandoPost] = useState(false);

  // Modal CREAR NUEVA publicación (Estilo Twitter)
  const [modalCrearPub, setModalCrearPub] = useState(false);
  const [nuevoPostTexto, setNuevoPostTexto] = useState('');
  const [creandoPost, setCreandoPost] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, [userId]);

  const cargarDatos = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    const idAExaminar = userId || user?.id;
    setTargetUserId(idAExaminar || null);
    const esMio = user?.id === idAExaminar;
    setEsMiPerfil(esMio);

    if (idAExaminar) {
      const { data: cuidador } = await supabase
        .from('cuidadores')
        .select('*')
        .eq('id', idAExaminar)
        .maybeSingle();

      if (cuidador) {
        setNombre(cuidador.nombre || 'Usuario');
        setCorreo(cuidador.correo || '');
        setTelefono(cuidador.telefono || '');
        setEspecialidades(cuidador.especialidades || '');
        setDescripcion(cuidador.descripcion || '');
        setFotoUrl(cuidador.foto_url || '');
        setVerificado(Boolean(cuidador.verificado));

        setEditNombre(cuidador.nombre || '');
        setEditTelefono(cuidador.telefono || '');
        setEditEspecialidades(cuidador.especialidades || '');
        setEditDescripcion(cuidador.descripcion || '');
      } else if (esMio && user) {
        setCorreo(user.email || '');
      }

      await cargarPublicaciones(idAExaminar);
    }
    setLoading(false);
  };

  const cargarPublicaciones = async (idUser: string) => {
    try {
      const { data: pubs, error } = await supabase
        .from('publicaciones')
        .select('*')
        .eq('user_id', idUser)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Error publicaciones perfil:', error.message);
        return;
      }

      if (pubs) {
        const { data: likes } = await supabase.from('likes').select('*');
        const { data: coments } = await supabase.from('comentarios').select('id, publicacion_id');

        const formateadas = pubs.map((p) => ({
          ...p,
          totalLikes: likes ? likes.filter((l) => l.publicacion_id === p.id).length : 0,
          totalComentarios: coments ? coments.filter((c) => c.publicacion_id === p.id).length : 0,
        }));

        setMisPublicaciones(formateadas);
      }
    } catch (err: any) {
      console.log('Excepción publicaciones:', err.message);
    }
  };

  const crearPublicacionDesdePerfil = async () => {
    if (!nuevoPostTexto.trim() || !currentUser) return;

    setCreandoPost(true);
    const { error } = await supabase.from('publicaciones').insert([
      {
        user_id: currentUser.id,
        autor_email: currentUser.email,
        contenido: nuevoPostTexto.trim(),
      },
    ]);
    setCreandoPost(false);

    if (error) {
      Alert.alert('Error al publicar', error.message);
    } else {
      setNuevoPostTexto('');
      setModalCrearPub(false);
      if (targetUserId) cargarPublicaciones(targetUserId);
    }
  };

  const seleccionarYSubirFoto = async () => {
    if (!esMiPerfil || !targetUserId) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Se necesita acceso a la galería para cambiar tu foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      try {
        setSubiendoFoto(true);
        const filePath = `${targetUserId}/avatar_${Date.now()}.jpg`;

        const binaryString = atob(result.assets[0].base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const { error: uploadError } = await supabase.storage
          .from('avatares')
          .upload(filePath, bytes.buffer, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('avatares')
          .getPublicUrl(filePath);

        const nuevaUrl = publicUrlData.publicUrl;

        await supabase
          .from('cuidadores')
          .update({ foto_url: nuevaUrl })
          .eq('id', targetUserId);

        setFotoUrl(nuevaUrl);
        Alert.alert('¡Listo!', 'Foto de perfil actualizada.');
      } catch (err: any) {
        Alert.alert('Error al subir foto', err.message);
      } finally {
        setSubiendoFoto(false);
      }
    }
  };

  const guardarPerfil = async () => {
    if (!targetUserId) return;
    setGuardando(true);

    const { error } = await supabase
      .from('cuidadores')
      .update({
        nombre: editNombre.trim(),
        telefono: editTelefono.trim(),
        especialidades: editEspecialidades.trim(),
        descripcion: editDescripcion.trim(),
      })
      .eq('id', targetUserId);

    setGuardando(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setNombre(editNombre.trim());
      setTelefono(editTelefono.trim());
      setEspecialidades(editEspecialidades.trim());
      setDescripcion(editDescripcion.trim());
      setModalEditarPerfil(false);
      Alert.alert('Éxito', 'Perfil actualizado.');
    }
  };

  const abrirOpcionesPost = (post: any) => {
    Alert.alert(
      'Opciones de publicación',
      'Selecciona una acción:',
      [
        {
          text: 'Editar publicación',
          onPress: () => {
            setPostAEditar(post);
            setTextoEditado(post.contenido);
            setModalEditarPub(true);
          },
        },
        {
          text: 'Eliminar publicación',
          style: 'destructive',
          onPress: () => confirmarEliminarPost(post.id),
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const confirmarEliminarPost = (postId: string) => {
    Alert.alert(
      'Eliminar publicación',
      '¿Deseas borrar esta publicación permanentemente? Se quitará de tu perfil y del feed comunitario.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('publicaciones')
              .delete()
              .eq('id', postId);

            if (error) {
              Alert.alert('Error al eliminar', error.message);
            } else {
              if (targetUserId) cargarPublicaciones(targetUserId);
            }
          },
        },
      ]
    );
  };

  const guardarEdicionPost = async () => {
    if (!textoEditado.trim() || !postAEditar) return;
    setGuardandoPost(true);

    const { error } = await supabase
      .from('publicaciones')
      .update({ contenido: textoEditado.trim() })
      .eq('id', postAEditar.id);

    setGuardandoPost(false);

    if (error) {
      Alert.alert('Error al actualizar', error.message);
    } else {
      setModalEditarPub(false);
      setPostAEditar(null);
      if (targetUserId) cargarPublicaciones(targetUserId);
    }
  };

  const cerrarSesion = async () => {
    Alert.alert('Cerrar sesión', '¿Deseas salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/login');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#C59A77" />
      </View>
    );
  }

  const handleUsuario = correo ? `@${correo.split('@')[0]}` : '@cuidador';

  return (
    <View style={styles.screen}>
      {/* Top Nav */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.navIconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#0F1419" />
        </TouchableOpacity>
        <View style={styles.navTextos}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.navNombrePrincipal}>{nombre || 'Perfil'}</Text>
            {verificado && (
              <Ionicons name="checkmark-circle" size={16} color="#1D9BF0" style={{ marginLeft: 4 }} />
            )}
          </View>
          <Text style={styles.navPostCount}>{misPublicaciones.length} publicaciones</Text>
        </View>
        {esMiPerfil ? (
          <TouchableOpacity style={styles.navIconBtn} onPress={cerrarSesion}>
            <Ionicons name="log-out-outline" size={22} color="#D9534F" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cabecera Twitter / X */}
        <View style={styles.headerPerfil}>
          <View style={styles.filaAvatarBoton}>
            <TouchableOpacity
              disabled={!esMiPerfil || subiendoFoto}
              onPress={seleccionarYSubirFoto}
              style={styles.avatarWrapper}
            >
              {fotoUrl ? (
                <Image source={{ uri: fotoUrl }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarLetra}>
                    {nombre ? nombre.charAt(0).toUpperCase() : 'U'}
                  </Text>
                </View>
              )}
              {esMiPerfil && (
                <View style={styles.badgeCamara}>
                  {subiendoFoto ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="camera" size={13} color="#FFFFFF" />
                  )}
                </View>
              )}
            </TouchableOpacity>

            {esMiPerfil && (
              <TouchableOpacity
                style={styles.btnEditarPerfil}
                onPress={() => setModalEditarPerfil(true)}
              >
                <Text style={styles.btnEditarPerfilTexto}>Editar perfil</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.datosUsuario}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.nombreTexto}>{nombre || 'Usuario'}</Text>
              {verificado && (
                <Ionicons
                  name="checkmark-circle"
                  size={19}
                  color="#1D9BF0"
                  style={{ marginLeft: 5 }}
                />
              )}
            </View>
            <Text style={styles.handleTexto}>{handleUsuario}</Text>
          </View>

          {descripcion ? (
            <Text style={styles.bioTexto}>{descripcion}</Text>
          ) : (
            <Text style={[styles.bioTexto, { color: '#8A7A70', fontStyle: 'italic' }]}>
              {esMiPerfil ? 'Toca en "Editar perfil" para agregar una biografía...' : 'Sin biografía.'}
            </Text>
          )}

          <View style={styles.metaRow}>
            {especialidades ? (
              <View style={styles.metaItem}>
                <Ionicons name="ribbon-outline" size={15} color="#536471" />
                <Text style={styles.metaItemTexto}>{especialidades}</Text>
              </View>
            ) : null}

            {telefono ? (
              <View style={styles.metaItem}>
                <Ionicons name="call-outline" size={15} color="#536471" />
                <Text style={styles.metaItemTexto}>{telefono}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Tab fija */}
        <View style={styles.tabBarTwitter}>
          <View style={styles.tabItemActivo}>
            <Text style={styles.tabTextoActivo}>Publicaciones</Text>
            <View style={styles.tabBarIndicador} />
          </View>
        </View>

        {/* Feed de Publicaciones del Usuario */}
        {misPublicaciones.length === 0 ? (
          <View style={styles.vacioContenedor}>
            <Text style={styles.vacioTitulo}>Sin publicaciones aún</Text>
            <Text style={styles.vacioSubtitulo}>
              {esMiPerfil
                ? 'Toca el botón (+) flotante abajo para publicar tu primer mensaje.'
                : 'Este usuario no tiene aportes en el muro.'}
            </Text>
          </View>
        ) : (
          misPublicaciones.map((pub) => (
            <View key={pub.id} style={styles.postItem}>
              <View style={styles.postAvatarContenedor}>
                {fotoUrl ? (
                  <Image source={{ uri: fotoUrl }} style={styles.postAvatarMini} />
                ) : (
                  <View style={styles.postAvatarMiniPlaceholder}>
                    <Text style={styles.postAvatarMiniLetra}>
                      {nombre ? nombre.charAt(0).toUpperCase() : 'U'}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.postCuerpo}>
                <View style={styles.postEncabezado}>
                  <View style={styles.postAutoresFila}>
                    <Text style={styles.postNombreAutor} numberOfLines={1}>{nombre}</Text>
                    {verificado && (
                      <Ionicons name="checkmark-circle" size={14} color="#1D9BF0" style={{ marginLeft: 3 }} />
                    )}
                    <Text style={styles.postHandleAutor} numberOfLines={1}> {handleUsuario}</Text>
                    <Text style={styles.postPuntoSeparador}>·</Text>
                    <Text style={styles.postFecha}>
                      {new Date(pub.created_at).toLocaleDateString()}
                    </Text>
                  </View>

                  {esMiPerfil && (
                    <TouchableOpacity
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      onPress={() => abrirOpcionesPost(pub)}
                      style={styles.postBtnPuntos}
                    >
                      <Ionicons name="ellipsis-horizontal" size={18} color="#536471" />
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.postTexto}>{pub.contenido}</Text>

                <View style={styles.postFooterMetricas}>
                  <View style={styles.metricaItem}>
                    <Ionicons name="chatbubble-outline" size={15} color="#536471" />
                    <Text style={styles.metricaNumero}>{pub.totalComentarios}</Text>
                  </View>
                  <View style={styles.metricaItem}>
                    <Ionicons name="heart-outline" size={16} color="#536471" />
                    <Text style={styles.metricaNumero}>{pub.totalLikes}</Text>
                  </View>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Botón Flotante para Publicar (Estilo Twitter) */}
      {esMiPerfil && (
      <TouchableOpacity
      style={styles.fabTwitter}
      onPress={() => setModalCrearPub(true)}
      activeOpacity={0.8}
      >
      <Feather name="feather" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      )}

      {/* Modal Redactar Nueva Publicación */}
      <Modal visible={modalCrearPub} animationType="slide">
        <View style={styles.modalFull}>
          <View style={styles.modalHeaderTop}>
            <TouchableOpacity onPress={() => setModalCrearPub(false)}>
              <Text style={styles.modalBtnCancelar}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btnPublicarPill, !nuevoPostTexto.trim() && { opacity: 0.5 }]}
              onPress={crearPublicacionDesdePerfil}
              disabled={!nuevoPostTexto.trim() || creandoPost}
            >
              {creandoPost ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.btnPublicarPillTexto}>Publicar</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.areaRedaccion}>
            <View style={{ marginRight: 12 }}>
              {fotoUrl ? (
                <Image source={{ uri: fotoUrl }} style={styles.postAvatarMini} />
              ) : (
                <View style={styles.postAvatarMiniPlaceholder}>
                  <Text style={styles.postAvatarMiniLetra}>{nombre.charAt(0).toUpperCase()}</Text>
                </View>
              )}
            </View>
            <TextInput
              style={styles.inputRedactar}
              placeholder="¿Qué estás pensando o qué experiencia deseas compartir?"
              placeholderTextColor="#536471"
              multiline
              autoFocus
              value={nuevoPostTexto}
              onChangeText={setNuevoPostTexto}
            />
          </View>
        </View>
      </Modal>

      {/* Modal Editar Perfil */}
      <Modal visible={modalEditarPerfil} animationType="slide">
        <View style={styles.modalFull}>
          <View style={styles.modalHeaderTop}>
            <TouchableOpacity onPress={() => setModalEditarPerfil(false)}>
              <Text style={styles.modalBtnCancelar}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitulo}>Editar perfil</Text>
            <TouchableOpacity onPress={guardarPerfil} disabled={guardando}>
              {guardando ? (
                <ActivityIndicator size="small" color="#0F1419" />
              ) : (
                <Text style={styles.modalBtnGuardar}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalFormulario}>
            <Text style={styles.inputEtiqueta}>Nombre</Text>
            <TextInput
              style={styles.modalInput}
              value={editNombre}
              onChangeText={setEditNombre}
              placeholder="Tu nombre"
            />

            <Text style={styles.inputEtiqueta}>Biografía</Text>
            <TextInput
              style={[styles.modalInput, { minHeight: 80, textAlignVertical: 'top' }]}
              value={editDescripcion}
              onChangeText={setEditDescripcion}
              placeholder="Añade una descripción sobre ti..."
              multiline
            />

            <Text style={styles.inputEtiqueta}>Especialidades</Text>
            <TextInput
              style={styles.modalInput}
              value={editEspecialidades}
              onChangeText={setEditEspecialidades}
              placeholder="Ej: Geriatría, kinesiología..."
            />

            <Text style={styles.inputEtiqueta}>Teléfono de contacto</Text>
            <TextInput
              style={styles.modalInput}
              value={editTelefono}
              onChangeText={setEditTelefono}
              placeholder="+56 9 ..."
              keyboardType="phone-pad"
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Modal Editar Publicación */}
      <Modal visible={modalEditarPub} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalEdicionPost}>
            <View style={styles.modalEdicionHeader}>
              <Text style={styles.modalEdicionTitulo}>Editar publicación</Text>
              <TouchableOpacity onPress={() => setModalEditarPub(false)}>
                <Ionicons name="close" size={22} color="#0F1419" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.inputEdicionTexto}
              value={textoEditado}
              onChangeText={setTextoEditado}
              multiline
              placeholder="Actualiza tu texto..."
            />

            <View style={styles.filaBotonesPost}>
              <TouchableOpacity
                style={styles.btnCancelarPost}
                onPress={() => setModalEditarPub(false)}
              >
                <Text style={styles.btnCancelarPostTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnGuardarPost}
                onPress={guardarEdicionPost}
                disabled={guardandoPost}
              >
                {guardandoPost ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.btnGuardarPostTexto}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  topNav: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#EFF3F4' },
  navIconBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  navTextos: { flex: 1, marginLeft: 12 },
  navNombrePrincipal: { fontSize: 17, fontWeight: '800', color: '#0F1419' },
  navPostCount: { fontSize: 12, color: '#536471' },
  headerPerfil: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  filaAvatarBoton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  avatarWrapper: { position: 'relative' },
  avatarImg: { width: 78, height: 78, borderRadius: 39 },
  avatarPlaceholder: { width: 78, height: 78, borderRadius: 39, backgroundColor: '#C59A77', justifyContent: 'center', alignItems: 'center' },
  avatarLetra: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF' },
  badgeCamara: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#0F1419', width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  btnEditarPerfil: { borderWidth: 1, borderColor: '#CFD9DE', borderRadius: 20, paddingVertical: 7, paddingHorizontal: 16, marginTop: 4 },
  btnEditarPerfilTexto: { fontSize: 14, fontWeight: '700', color: '#0F1419' },
  datosUsuario: { marginBottom: 8 },
  nombreTexto: { fontSize: 20, fontWeight: '800', color: '#0F1419' },
  handleTexto: { fontSize: 14, color: '#536471', marginTop: 1 },
  bioTexto: { fontSize: 14, color: '#0F1419', lineHeight: 20, marginBottom: 10 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 4 },
  metaItemTexto: { fontSize: 13, color: '#536471', marginLeft: 4 },
  tabBarTwitter: { borderBottomWidth: 1, borderBottomColor: '#EFF3F4', marginTop: 8 },
  tabItemActivo: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingBottom: 10, position: 'relative' },
  tabTextoActivo: { fontSize: 15, fontWeight: '700', color: '#0F1419' },
  tabBarIndicador: { position: 'absolute', bottom: 0, left: 16, right: 16, height: 3, backgroundColor: '#C59A77', borderRadius: 2 },
  vacioContenedor: { padding: 32, alignItems: 'center' },
  vacioTitulo: { fontSize: 18, fontWeight: 'bold', color: '#0F1419', marginBottom: 4 },
  vacioSubtitulo: { fontSize: 14, color: '#536471', textAlign: 'center' },
  postItem: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EFF3F4' },
  postAvatarContenedor: { marginRight: 10 },
  postAvatarMini: { width: 40, height: 40, borderRadius: 20 },
  postAvatarMiniPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#C59A77', justifyContent: 'center', alignItems: 'center' },
  postAvatarMiniLetra: { fontSize: 16, color: '#FFFFFF', fontWeight: 'bold' },
  postCuerpo: { flex: 1 },
  postEncabezado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  postAutoresFila: { flexDirection: 'row', alignItems: 'center', flex: 1, flexWrap: 'nowrap' },
  postNombreAutor: { fontSize: 14, fontWeight: '700', color: '#0F1419', maxWidth: '40%' },
  postHandleAutor: { fontSize: 13, color: '#536471', maxWidth: '30%' },
  postPuntoSeparador: { color: '#536471', marginHorizontal: 4 },
  postFecha: { fontSize: 12, color: '#536471' },
  postBtnPuntos: { padding: 4 },
  postTexto: { fontSize: 14, color: '#0F1419', lineHeight: 20, marginTop: 4, marginBottom: 8 },
  postFooterMetricas: { flexDirection: 'row', alignItems: 'center' },
  metricaItem: { flexDirection: 'row', alignItems: 'center', marginRight: 32 },
  metricaNumero: { fontSize: 12, color: '#536471', marginLeft: 6 },
  fabTwitter: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#C59A77', justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.27, shadowRadius: 4.65 },
  modalFull: { flex: 1, backgroundColor: '#FFFFFF', paddingTop: 40 },
  modalHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: '#EFF3F4' },
  modalBtnCancelar: { fontSize: 15, color: '#0F1419' },
  modalHeaderTitulo: { fontSize: 16, fontWeight: '700', color: '#0F1419' },
  modalBtnGuardar: { fontSize: 15, fontWeight: '700', color: '#C59A77' },
  btnPublicarPill: { backgroundColor: '#C59A77', paddingVertical: 7, paddingHorizontal: 16, borderRadius: 20 },
  btnPublicarPillTexto: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  areaRedaccion: { flexDirection: 'row', padding: 16, flex: 1 },
  inputRedactar: { flex: 1, fontSize: 17, color: '#0F1419', textAlignVertical: 'top' },
  modalFormulario: { padding: 16 },
  inputEtiqueta: { fontSize: 12, fontWeight: '600', color: '#536471', marginTop: 12, marginBottom: 4 },
  modalInput: { borderWidth: 1, borderColor: '#CFD9DE', borderRadius: 8, padding: 10, fontSize: 15, color: '#0F1419' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 20 },
  modalEdicionPost: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16 },
  modalEdicionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalEdicionTitulo: { fontSize: 16, fontWeight: '700', color: '#0F1419' },
  inputEdicionTexto: { borderWidth: 1, borderColor: '#CFD9DE', borderRadius: 10, minHeight: 100, textAlignVertical: 'top', padding: 10, fontSize: 14, color: '#0F1419', marginBottom: 14 },
  filaBotonesPost: { flexDirection: 'row', justifyContent: 'flex-end' },
  btnCancelarPost: { paddingVertical: 8, paddingHorizontal: 14, marginRight: 8 },
  btnCancelarPostTexto: { color: '#536471', fontWeight: '600' },
  btnGuardarPost: { backgroundColor: '#C59A77', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 18 },
  btnGuardarPostTexto: { color: '#FFFFFF', fontWeight: '700' }
});