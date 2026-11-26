import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';

export default function PerfilScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [perfil, setPerfil] = useState<any>(null);
  const [publicaciones, setPublicaciones] = useState<any[]>([]);

  // Nueva publicación desde perfil
  const [nuevaPublicacion, setNuevaPublicacion] = useState('');
  const [publicando, setPublicando] = useState(false);

  // Modal Editar Perfil
  const [modalEditar, setModalEditar] = useState(false);
  const [editNombre, setEditNombre] = useState('');
  const [editBiografia, setEditBiografia] = useState('');
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);

  const cargarMisPublicaciones = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('publicaciones')
        .select('*')
        .or(`user_id.eq.${userId},autor_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.log('Error cargando publicaciones propias:', error.message);
      }
      setPublicaciones(data || []);
    } catch (err) {
      console.log('Error inesperado cargando publicaciones:', err);
      setPublicaciones([]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let activo = true;

      const cargarDatos = async () => {
        setLoading(true);
        try {
          const {
            data: { user },
            error: authErr,
          } = await supabase.auth.getUser();

          if (authErr || !user) {
            if (activo) {
              setCurrentUser(null);
              setPerfil(null);
              setPublicaciones([]);
            }
            return;
          }

          if (!activo) return;
          setCurrentUser(user);

          // Cargar o inicializar perfil en cuidadores
          let { data: datosPerfil, error: perfilErr } = await supabase
            .from('cuidadores')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (perfilErr) {
            console.log('Error consultando cuidadores:', perfilErr.message);
          }

          if (!datosPerfil && activo) {
            const nombreBase =
              user.user_metadata?.nombre ||
              user.email?.split('@')[0] ||
              'Cuidador Respiro';

            const { data: nuevoPerfil, error: insertErr } = await supabase
              .from('cuidadores')
              .insert([
                {
                  id: user.id,
                  nombre: nombreBase,
                  email: user.email,
                  biografia: '',
                  verificado: false,
                },
              ])
              .select()
              .maybeSingle();

            if (insertErr) {
              console.log('Error creando perfil inicial:', insertErr.message);
            }
            datosPerfil = nuevoPerfil || {
              id: user.id,
              nombre: nombreBase,
              email: user.email,
              biografia: '',
              verificado: false,
            };
          }

          if (datosPerfil && activo) {
            setPerfil(datosPerfil);
            setEditNombre(datosPerfil.nombre || '');
            setEditBiografia(datosPerfil.biografia || '');
          }

          if (activo) {
            await cargarMisPublicaciones(user.id);
          }
        } catch (err) {
          console.log('Error general en PerfilScreen:', err);
        } finally {
          if (activo) setLoading(false);
        }
      };

      cargarDatos();
      return () => {
        activo = false;
      };
    }, [])
  );

  const cambiarFotoPerfil = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso necesario', 'Activa el permiso de galería para cambiar tu foto.');
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (res.canceled || !res.assets[0]?.base64 || !currentUser) return;

      const filePath = `avatars/${currentUser.id}_${Date.now()}.jpg`;
      const bin = atob(res.assets[0].base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

      const { error: uploadErr } = await supabase.storage
        .from('avatares')
        .upload(filePath, bytes.buffer, { contentType: 'image/jpeg', upsert: true });

      if (uploadErr) {
        Alert.alert('Error al subir imagen', uploadErr.message);
        return;
      }

      const { data: pubData } = supabase.storage.from('avatares').getPublicUrl(filePath);
      const nuevaUrl = pubData.publicUrl;

      const { error: updateErr } = await supabase
        .from('cuidadores')
        .update({ avatar_url: nuevaUrl })
        .eq('id', currentUser.id);

      if (updateErr) {
        Alert.alert('Error al guardar foto', updateErr.message);
      } else {
        setPerfil((prev: any) => ({ ...prev, avatar_url: nuevaUrl }));
        Alert.alert('Foto actualizada', 'Tu foto de perfil se guardó correctamente.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudo cambiar la foto.');
    }
  };

  const guardarCambiosPerfil = async () => {
    if (!editNombre.trim() || !currentUser) {
      Alert.alert('Nombre requerido', 'El nombre no puede quedar vacío.');
      return;
    }

    setGuardandoPerfil(true);
    try {
      const { data, error } = await supabase
        .from('cuidadores')
        .update({
          nombre: editNombre.trim(),
          biografia: editBiografia.trim(),
        })
        .eq('id', currentUser.id)
        .select()
        .single();

      if (error) {
        Alert.alert('Error al actualizar', error.message);
      } else if (data) {
        setPerfil(data);
        setModalEditar(false);
      }
    } catch (e: any) {
      Alert.alert('Error al actualizar', e?.message || 'Ocurrió un problema.');
    } finally {
      setGuardandoPerfil(false);
    }
  };

  const crearPublicacionPerfil = async () => {
    if (!nuevaPublicacion.trim()) {
      Alert.alert('Mensaje vacío', 'Escribe algo antes de publicar.');
      return;
    }

    if (!currentUser) return;

    setPublicando(true);
    try {
      const nombreAutor =
        perfil?.nombre || currentUser.email?.split('@')[0] || 'Cuidador';

      const { data, error } = await supabase
        .from('publicaciones')
        .insert([
          {
            user_id: currentUser.id,
            autor_id: currentUser.id,
            autor_nombre: nombreAutor,
            autor_email: currentUser.email,
            contenido: nuevaPublicacion.trim(),
          },
        ])
        .select()
        .single();

      if (error) {
        Alert.alert('Error al publicar', error.message);
      } else if (data) {
        setPublicaciones((prev) => [data, ...prev]);
        setNuevaPublicacion('');
      }
    } catch (e: any) {
      Alert.alert('Error al publicar', e?.message || 'Ocurrió un problema.');
    } finally {
      setPublicando(false);
    }
  };

  const eliminarPublicacion = async (id: string) => {
    Alert.alert('Eliminar publicación', '¿Deseas borrar este mensaje de tu muro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('publicaciones').delete().eq('id', id);
            if (!error) {
              setPublicaciones((prev) => prev.filter((p) => p.id !== id));
            }
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'No se pudo eliminar.');
          }
        },
      },
    ]);
  };

  const cerrarSesion = async () => {
    Alert.alert('Cerrar Sesión', '¿Seguro que deseas salir de tu cuenta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/login');
        },
      },
    ]);
  };

  const formatearFecha = (iso: string) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#2C221E" />
      </View>
    );
  }

  if (!currentUser) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={styles.vacioTexto}>No se encontró una sesión activa.</Text>
        <TouchableOpacity
          style={[styles.btnPublicar, { paddingHorizontal: 20, marginTop: 16 }]}
          onPress={() => router.replace('/login')}
        >
          <Text style={styles.btnPublicarTexto}>Ir a Iniciar Sesión</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={publicaciones}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Cabecera Superior */}
            <View style={styles.topBar}>
              <Text style={styles.tituloScreen}>Mi Perfil</Text>
              <TouchableOpacity style={styles.btnCerrarSesion} onPress={cerrarSesion}>
                <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
                <Text style={styles.btnCerrarSesionTexto}>Salir</Text>
              </TouchableOpacity>
            </View>

            {/* Tarjeta de Perfil Estilo Red Social */}
            <View style={styles.perfilCard}>
              <View style={styles.perfilFilaSuperior}>
                <TouchableOpacity onPress={cambiarFotoPerfil} style={styles.avatarWrap}>
                  {perfil?.avatar_url ? (
                    <Image source={{ uri: perfil.avatar_url }} style={styles.avatarImg} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarLetra}>
                        {perfil?.nombre ? perfil.nombre.charAt(0).toUpperCase() : 'C'}
                      </Text>
                    </View>
                  )}
                  <View style={styles.badgeCamara}>
                    <Ionicons name="camera" size={16} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>

                <View style={{ flex: 1, marginLeft: 14 }}>
                  <View style={styles.nombreFila}>
                    <Text style={styles.perfilNombre}>{perfil?.nombre || 'Cuidador'}</Text>
                    {perfil?.verificado && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color="#1B5E20"
                        style={{ marginLeft: 6 }}
                      />
                    )}
                  </View>

                  <Text style={styles.perfilEmail}>{currentUser?.email}</Text>

                  {perfil?.verificado && (
                    <View style={styles.badgeVerificado}>
                      <Text style={styles.badgeVerificadoTexto}>
                        Perfil Profesional / Verificado
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <Text style={styles.perfilBio}>
                {perfil?.biografia?.trim()
                  ? perfil.biografia
                  : 'Cuidador activo en la comunidad Respiro.'}
              </Text>

              <TouchableOpacity
                style={styles.btnEditarPerfil}
                onPress={() => setModalEditar(true)}
              >
                <Ionicons name="create-outline" size={20} color="#141414" />
                <Text style={styles.btnEditarPerfilTexto}>Editar Nombre y Biografía</Text>
              </TouchableOpacity>
            </View>

            {/* Caja para Publicar en el Muro */}
            <View style={styles.cajaPublicar}>
              <Text style={styles.cajaPublicarTitulo}>Compartir con la comunidad</Text>
              <TextInput
                style={styles.inputPublicacion}
                placeholder="¿Cómo te sientes hoy o qué consejo quieres compartir?"
                placeholderTextColor="#555555"
                multiline
                value={nuevaPublicacion}
                onChangeText={setNuevaPublicacion}
              />
              <TouchableOpacity
                style={styles.btnPublicar}
                onPress={crearPublicacionPerfil}
                disabled={publicando}
              >
                {publicando ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={18} color="#FFFFFF" />
                    <Text style={styles.btnPublicarTexto}>Publicar Mensaje</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <Text style={styles.seccionTitulo}>
              Mis Publicaciones ({publicaciones.length})
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.vacioCard}>
            <Text style={styles.vacioTexto}>
              Aún no has publicado mensajes en tu muro.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.postCard}>
            <View style={styles.postHeader}>
              <Text style={styles.postAutor}>{item.autor_nombre || perfil?.nombre}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.postFecha}>{formatearFecha(item.created_at)}</Text>
                <TouchableOpacity
                  onPress={() => eliminarPublicacion(item.id)}
                  style={{ marginLeft: 10, padding: 4 }}
                >
                  <Ionicons name="trash" size={20} color="#B71C1C" />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.postContenido}>{item.contenido}</Text>
          </View>
        )}
      />

      {/* MODAL EDITAR PERFIL */}
      <Modal visible={modalEditar} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitulo}>Editar Mi Perfil</Text>
              <TouchableOpacity onPress={() => setModalEditar(false)}>
                <Ionicons name="close-circle" size={30} color="#141414" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Nombre visible *</Text>
              <TextInput
                style={styles.input}
                value={editNombre}
                onChangeText={setEditNombre}
                placeholder="Tu nombre"
                placeholderTextColor="#555555"
              />

              <Text style={styles.label}>Biografía o presentación</Text>
              <TextInput
                style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]}
                value={editBiografia}
                onChangeText={setEditBiografia}
                placeholder="Cuéntanos a quién cuidas o tu experiencia..."
                placeholderTextColor="#555555"
                multiline
              />

              <TouchableOpacity
                style={styles.btnGuardarModal}
                onPress={guardarCambiosPerfil}
                disabled={guardandoPerfil}
              >
                {guardandoPerfil ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.btnGuardarModalTexto}>Guardar Cambios</Text>
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
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2ECE4', padding: 20 },
  container: { flex: 1, backgroundColor: '#F2ECE4', paddingHorizontal: 16, paddingTop: 12 },

  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  tituloScreen: { fontSize: 26, fontWeight: '900', color: '#141414' },
  btnCerrarSesion: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#B71C1C', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 12 },
  btnCerrarSesionTexto: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15, marginLeft: 6 },

  perfilCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, borderWidth: 2, borderColor: '#2C221E', marginBottom: 16 },
  perfilFilaSuperior: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarWrap: { position: 'relative' },
  avatarImg: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: '#2C221E' },
  avatarPlaceholder: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#2C221E', justifyContent: 'center', alignItems: 'center' },
  avatarLetra: { fontSize: 30, fontWeight: 'bold', color: '#FFFFFF' },
  badgeCamara: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#2C221E', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FFFFFF' },

  nombreFila: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  perfilNombre: { fontSize: 21, fontWeight: 'bold', color: '#141414' },
  perfilEmail: { fontSize: 14, fontWeight: '600', color: '#333333', marginTop: 2 },
  badgeVerificado: { alignSelf: 'flex-start', backgroundColor: '#E8F5E9', borderWidth: 1.5, borderColor: '#1B5E20', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8, marginTop: 6 },
  badgeVerificadoTexto: { fontSize: 13, fontWeight: 'bold', color: '#1B5E20' },

  perfilBio: { fontSize: 16, color: '#141414', lineHeight: 23, marginBottom: 14, backgroundColor: '#F2ECE4', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#6E5D4F' },
  btnEditarPerfil: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2ECE4', borderWidth: 2, borderColor: '#2C221E', paddingVertical: 12, borderRadius: 12 },
  btnEditarPerfilTexto: { fontSize: 16, fontWeight: 'bold', color: '#141414', marginLeft: 8 },

  cajaPublicar: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, borderWidth: 2, borderColor: '#6E5D4F', marginBottom: 18 },
  cajaPublicarTitulo: { fontSize: 17, fontWeight: 'bold', color: '#141414', marginBottom: 8 },
  inputPublicacion: { backgroundColor: '#F2ECE4', borderWidth: 2, borderColor: '#2C221E', borderRadius: 12, padding: 12, fontSize: 16, color: '#141414', minHeight: 80, textAlignVertical: 'top' },
  btnPublicar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2C221E', paddingVertical: 13, borderRadius: 12, marginTop: 12 },
  btnPublicarTexto: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },

  seccionTitulo: { fontSize: 19, fontWeight: 'bold', color: '#141414', marginBottom: 12 },
  vacioCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 24, alignItems: 'center', borderWidth: 1.5, borderColor: '#6E5D4F' },
  vacioTexto: { fontSize: 16, color: '#2B2B2B', textAlign: 'center' },

  postCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: '#6E5D4F' },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E0D6CC', paddingBottom: 6 },
  postAutor: { fontSize: 16, fontWeight: 'bold', color: '#141414' },
  postFecha: { fontSize: 13, fontWeight: '600', color: '#333333' },
  postContenido: { fontSize: 16, color: '#141414', lineHeight: 24 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20, maxHeight: '85%', borderWidth: 2, borderColor: '#141414' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitulo: { fontSize: 20, fontWeight: 'bold', color: '#141414' },
  label: { fontSize: 15, fontWeight: 'bold', color: '#141414', marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: '#F2ECE4', borderWidth: 2, borderColor: '#2C221E', borderRadius: 12, padding: 12, fontSize: 16, color: '#141414' },
  btnGuardarModal: { backgroundColor: '#2C221E', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 20, marginBottom: 10 },
  btnGuardarModalTexto: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 17 },
});