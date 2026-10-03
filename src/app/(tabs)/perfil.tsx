import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';

export default function PerfilScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string }>();

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [perfil, setPerfil] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [esMiPerfil, setEsMiPerfil] = useState(true);

  // Tab interna estilo Twitter
  const [tabActiva, setTabActiva] = useState<'posts' | 'respuestas'>('posts');

  // Modal para Crear Post desde el perfil
  const [modalPostVisible, setModalPostVisible] = useState(false);
  const [nuevoPostTexto, setNuevoPostTexto] = useState('');
  const [publicando, setPublicando] = useState(false);

  // Modal Editar Perfil
  const [modalEditarVisible, setModalEditarVisible] = useState(false);
  const [editNombre, setEditNombre] = useState('');
  const [editBio, setEditBio] = useState('');
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const inicializar = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (!user || !isMounted) {
          setLoading(false);
          return;
        }

        setCurrentUser(user);

        const idACargar = params.userId && params.userId !== user.id ? params.userId : user.id;
        setEsMiPerfil(idACargar === user.id);

        await cargarDatos(idACargar, user.id);
        if (isMounted) setLoading(false);
      };

      inicializar();

      return () => {
        isMounted = false;
      };
    }, [params.userId])
  );

  const cargarDatos = async (targetId: string, currentUserId: string) => {
    try {
      // 1. Datos Cuidador
      const { data: datosCuidador } = await supabase
        .from('cuidadores')
        .select('*')
        .eq('id', targetId)
        .maybeSingle();

      if (datosCuidador) {
        setPerfil(datosCuidador);
        setEditNombre(datosCuidador.nombre || '');
        setEditBio(datosCuidador.biografia || '');
      } else {
        setPerfil({
          id: targetId,
          nombre: 'Cuidador Respiro',
          biografia: '',
          foto_url: null,
          verificado: false,
        });
      }

      // 2. Posts del usuario
      const { data: misPosts, error } = await supabase
        .from('publicaciones')
        .select('*')
        .eq('user_id', targetId)
        .order('created_at', { ascending: false });

      if (!error && misPosts) {
        const { data: likes } = await supabase.from('likes').select('*');
        const { data: coments } = await supabase.from('comentarios').select('id, publicacion_id');

        const formateados = misPosts.map((p) => {
          const misLikes = likes ? likes.filter((l) => l.publicacion_id === p.id) : [];
          const misComs = coments ? coments.filter((c) => c.publicacion_id === p.id) : [];
          return {
            ...p,
            totalLikes: misLikes.length,
            hasLiked: misLikes.some((l) => l.user_id === currentUserId),
            totalComentarios: misComs.length,
          };
        });

        setPosts(formateados);
      }
    } catch (e: any) {
      console.log('Error al cargar perfil:', e.message);
    }
  };

  // Crear publicación desde el Perfil
  const publicarDesdePerfil = async () => {
    if (!nuevoPostTexto.trim()) {
      Alert.alert('Atención', 'Escribe algo en tu publicación.');
      return;
    }

    setPublicando(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert('Error', 'Sesión no válida.');
      setPublicando(false);
      return;
    }

    const { error } = await supabase.from('publicaciones').insert([
      {
        user_id: user.id,
        contenido: nuevoPostTexto.trim(),
      },
    ]);

    setPublicando(false);

    if (error) {
      Alert.alert('Error al publicar', error.message);
    } else {
      setNuevoPostTexto('');
      setModalPostVisible(false);
      await cargarDatos(user.id, user.id);
    }
  };

  const eliminarPost = async (postId: string) => {
    Alert.alert('Eliminar', '¿Deseas borrar esta publicación?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('publicaciones').delete().eq('id', postId);
          if (!error) {
            setPosts((prev) => prev.filter((p) => p.id !== postId));
          }
        },
      },
    ]);
  };

  const seleccionarFoto = async () => {
    if (!esMiPerfil || !currentUser) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso', 'Se requiere acceso a la galería.');
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: true,
    });

    if (!res.canceled && res.assets[0].base64) {
      try {
        setLoading(true);
        const filePath = `perfiles/${currentUser.id}_avatar.jpg`;
        const bin = atob(res.assets[0].base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

        await supabase.storage
          .from('guias_multimedia')
          .upload(filePath, bytes.buffer, { contentType: 'image/jpeg', upsert: true });

        const { data } = supabase.storage.from('guias_multimedia').getPublicUrl(filePath);
        const urlConBuster = `${data.publicUrl}?t=${Date.now()}`;

        await supabase.from('cuidadores').upsert({ id: currentUser.id, foto_url: urlConBuster });
        setPerfil((prev: any) => ({ ...prev, foto_url: urlConBuster }));
      } catch (err: any) {
        Alert.alert('Error', 'No se pudo subir la foto: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const guardarPerfil = async () => {
    if (!currentUser) return;
    setGuardandoPerfil(true);
    const { error } = await supabase.from('cuidadores').upsert({
      id: currentUser.id,
      nombre: editNombre.trim(),
      biografia: editBio.trim(),
    });
    setGuardandoPerfil(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setPerfil((prev: any) => ({ ...prev, nombre: editNombre.trim(), biografia: editBio.trim() }));
      setModalEditarVisible(false);
    }
  };

  const handleUsuario = perfil?.nombre
    ? `@${perfil.nombre.toLowerCase().replace(/\s+/g, '')}`
    : '@cuidador';

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#C59A77" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={tabActiva === 'posts' ? posts : []}
          keyExtractor={(item) => String(item.id)}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              {/* 1. Header / Banner de Twitter */}
              <View style={styles.bannerHeader}>
                {!esMiPerfil && (
                  <TouchableOpacity
                    style={styles.btnVolverAtras}
                    onPress={() => router.push('/(tabs)')}
                  >
                    <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </View>

              {/* 2. Avatar y Botón de Acción Principal */}
              <View style={styles.avatarBarra}>
                <View style={styles.avatarWrap}>
                  {perfil?.foto_url ? (
                    <Image source={{ uri: perfil.foto_url }} style={styles.avatarImg} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarLetra}>
                        {perfil?.nombre ? perfil.nombre.charAt(0).toUpperCase() : 'C'}
                      </Text>
                    </View>
                  )}
                  {esMiPerfil && (
                    <TouchableOpacity style={styles.camaraBadge} onPress={seleccionarFoto}>
                      <Ionicons name="camera" size={13} color="#FFFFFF" />
                    </TouchableOpacity>
                  )}
                </View>

                {esMiPerfil ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                      style={styles.btnEditarPerfilTwitter}
                      onPress={() => setModalEditarVisible(true)}
                    >
                      <Text style={styles.btnEditarPerfilTwitterTexto}>Editar perfil</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.btnSalirTwitter}
                      onPress={async () => {
                        await supabase.auth.signOut();
                        router.replace('/login');
                      }}
                    >
                      <Ionicons name="log-out-outline" size={18} color="#D9534F" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.btnEditarPerfilTwitter, { backgroundColor: '#4A3B32' }]}
                    onPress={() => Alert.alert('Comunidad', 'Ya estás siguiendo la actividad de este cuidador.')}
                  >
                    <Text style={[styles.btnEditarPerfilTwitterTexto, { color: '#FFFFFF' }]}>Siguiendo</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* 3. Nombres y Biografía */}
              <View style={styles.infoUsuario}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.nombreTwitter}>{perfil?.nombre || 'Cuidador Respiro'}</Text>
                  {Boolean(perfil?.verificado) && (
                    <Ionicons name="checkmark-circle" size={16} color="#1D9BF0" style={{ marginLeft: 5 }} />
                  )}
                </View>
                <Text style={styles.handleTwitter}>{handleUsuario}</Text>

                <Text style={styles.bioTwitter}>
                  {perfil?.biografia || (esMiPerfil ? 'Presiona "Editar perfil" para agregar una biografía...' : 'Sin biografía disponible.')}
                </Text>

                {/* Métricas / Stats de Twitter */}
                <View style={styles.statsFila}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
                    <Text style={styles.statNumero}>{posts.length}</Text>
                    <Text style={styles.statEtiqueta}> Posts</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="heart" size={14} color="#D9534F" />
                    <Text style={[styles.statNumero, { marginLeft: 4 }]}>
                      {posts.reduce((acc, curr) => acc + (curr.totalLikes || 0), 0)}
                    </Text>
                    <Text style={styles.statEtiqueta}> Me gusta</Text>
                  </View>
                </View>
              </View>

              {/* 4. Barra de pestañas estilo Twitter */}
              <View style={styles.twitterTabsBar}>
                <TouchableOpacity
                  style={[styles.twitterTabItem, tabActiva === 'posts' && styles.twitterTabItemActivo]}
                  onPress={() => setTabActiva('posts')}
                >
                  <Text style={[styles.twitterTabTexto, tabActiva === 'posts' && styles.twitterTabTextoActivo]}>
                    Posts
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.twitterTabItem, tabActiva === 'respuestas' && styles.twitterTabItemActivo]}
                  onPress={() => setTabActiva('respuestas')}
                >
                  <Text style={[styles.twitterTabTexto, tabActiva === 'respuestas' && styles.twitterTabTextoActivo]}>
                    Respuestas
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.vacioContainer}>
              <Ionicons name="newspaper-outline" size={40} color="#A0958E" />
              <Text style={styles.vacioTexto}>
                {tabActiva === 'posts'
                  ? 'No hay publicaciones en este perfil.'
                  : 'No hay respuestas registradas.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.tweetItem}>
              {/* Avatar pequeño al lado izquierdo */}
              <View style={styles.tweetAvatarCol}>
                {perfil?.foto_url ? (
                  <Image source={{ uri: perfil.foto_url }} style={styles.tweetAvatarImg} />
                ) : (
                  <View style={styles.tweetAvatarPlaceholder}>
                    <Text style={styles.tweetAvatarLetra}>
                      {perfil?.nombre ? perfil.nombre.charAt(0).toUpperCase() : 'C'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Contenido derecho */}
              <View style={styles.tweetContenidoCol}>
                <View style={styles.tweetHeaderFila}>
                  <Text style={styles.tweetNombre} numberOfLines={1}>{perfil?.nombre || 'Cuidador'}</Text>
                  <Text style={styles.tweetHandle} numberOfLines={1}> {handleUsuario}</Text>
                  <Text style={styles.tweetFecha}>
                    · {new Date(item.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                  </Text>
                  {esMiPerfil && (
                    <TouchableOpacity style={{ marginLeft: 'auto' }} onPress={() => eliminarPost(item.id)}>
                      <Ionicons name="trash-outline" size={15} color="#A0958E" />
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.tweetTexto}>{item.contenido}</Text>

                {/* Métricas del post */}
                <View style={styles.tweetAccionesFila}>
                  <View style={styles.tweetAccion}>
                    <Ionicons name="chatbubble-outline" size={14} color="#8A7A70" />
                    <Text style={styles.tweetAccionTexto}>{item.totalComentarios}</Text>
                  </View>
                  <View style={[styles.tweetAccion, { marginLeft: 24 }]}>
                    <Ionicons name="heart-outline" size={15} color="#8A7A70" />
                    <Text style={styles.tweetAccionTexto}>{item.totalLikes}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        />
      )}

      {/* BOTÓN FLOTANTE ESTILO TWITTER (FAB) PARA PUBLICAR DIRECTAMENTE DESDE EL PERFIL */}
      {esMiPerfil && (
        <TouchableOpacity
          style={styles.fabTwitter}
          onPress={() => setModalPostVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="pencil" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* MODAL REDACTAR TWEET / POST */}
      <Modal visible={modalPostVisible} animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, backgroundColor: '#FFFFFF' }}
        >
          <View style={styles.modalTwitterHeader}>
            <TouchableOpacity onPress={() => setModalPostVisible(false)}>
              <Text style={styles.modalTwitterCancelar}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnTwittear}
              onPress={publicarDesdePerfil}
              disabled={publicando}
            >
              {publicando ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.btnTwittearTexto}>Publicar</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.modalTwitterCuerpo}>
            {perfil?.foto_url ? (
              <Image source={{ uri: perfil.foto_url }} style={styles.modalTwitterAvatar} />
            ) : (
              <View style={styles.modalTwitterAvatarPlaceholder}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>C</Text>
              </View>
            )}
            <TextInput
              style={styles.modalTwitterInput}
              placeholder="¿Qué estás pensando hoy? Comparte con los demás cuidadores..."
              placeholderTextColor="#A0958E"
              multiline
              autoFocus
              value={nuevoPostTexto}
              onChangeText={setNuevoPostTexto}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL EDITAR PERFIL */}
      <Modal visible={modalEditarVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalBoxHeader}>
              <Text style={styles.modalBoxTitulo}>Editar perfil</Text>
              <TouchableOpacity onPress={() => setModalEditarVisible(false)}>
                <Ionicons name="close" size={22} color="#4A3B32" />
              </TouchableOpacity>
            </View>

            <Text style={styles.labelInput}>Nombre completo</Text>
            <TextInput
              style={styles.inputModal}
              value={editNombre}
              onChangeText={setEditNombre}
              placeholder="Ej: Constanza Araya"
              placeholderTextColor="#A0958E"
            />

            <Text style={styles.labelInput}>Biografía</Text>
            <TextInput
              style={[styles.inputModal, { minHeight: 70, textAlignVertical: 'top' }]}
              value={editBio}
              onChangeText={setEditBio}
              placeholder="Cuéntanos un poco sobre tu rol o experiencia..."
              placeholderTextColor="#A0958E"
              multiline
            />

            <TouchableOpacity style={styles.btnGuardarModal} onPress={guardarPerfil} disabled={guardandoPerfil}>
              {guardandoPerfil ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.btnGuardarModalTexto}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  bannerHeader: { height: 110, backgroundColor: '#D9C4B2', position: 'relative', justifyContent: 'center' },
  btnVolverAtras: { position: 'absolute', top: 38, left: 16, backgroundColor: 'rgba(0,0,0,0.4)', padding: 7, borderRadius: 20 },
  avatarBarra: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 16, marginTop: -42 },
  avatarWrap: { position: 'relative' },
  avatarImg: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: '#FFFFFF' },
  avatarPlaceholder: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#C59A77', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FFFFFF' },
  avatarLetra: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF' },
  camaraBadge: { position: 'absolute', bottom: 2, right: 2, backgroundColor: '#4A3B32', padding: 6, borderRadius: 14, borderWidth: 1.5, borderColor: '#FFFFFF' },
  btnEditarPerfilTwitter: { borderWidth: 1, borderColor: '#C59A77', paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20 },
  btnEditarPerfilTwitterTexto: { fontSize: 13, fontWeight: 'bold', color: '#4A3B32' },
  btnSalirTwitter: { marginLeft: 10, padding: 6 },
  infoUsuario: { paddingHorizontal: 16, marginTop: 8 },
  nombreTwitter: { fontSize: 20, fontWeight: 'bold', color: '#14171A' },
  handleTwitter: { fontSize: 13, color: '#657786', marginTop: 1 },
  bioTwitter: { fontSize: 14, color: '#14171A', marginTop: 10, lineHeight: 20 },
  statsFila: { flexDirection: 'row', marginTop: 12, alignItems: 'center' },
  statNumero: { fontSize: 13, fontWeight: 'bold', color: '#14171A' },
  statEtiqueta: { fontSize: 13, color: '#657786' },
  twitterTabsBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E1E8ED', marginTop: 14 },
  twitterTabItem: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  twitterTabItemActivo: { borderBottomWidth: 3, borderBottomColor: '#C59A77' },
  twitterTabTexto: { fontSize: 14, fontWeight: 'bold', color: '#657786' },
  twitterTabTextoActivo: { color: '#4A3B32' },
  tweetItem: { flexDirection: 'row', padding: 14, borderBottomWidth: 1, borderBottomColor: '#F2F2F2' },
  tweetAvatarCol: { marginRight: 10 },
  tweetAvatarImg: { width: 40, height: 40, borderRadius: 20 },
  tweetAvatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#C59A77', justifyContent: 'center', alignItems: 'center' },
  tweetAvatarLetra: { color: '#FFF', fontWeight: 'bold' },
  tweetContenidoCol: { flex: 1 },
  tweetHeaderFila: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  tweetNombre: { fontSize: 14, fontWeight: 'bold', color: '#14171A', maxWidth: '40%' },
  tweetHandle: { fontSize: 13, color: '#657786', maxWidth: '30%' },
  tweetFecha: { fontSize: 12, color: '#657786' },
  tweetTexto: { fontSize: 14, color: '#14171A', lineHeight: 20, marginBottom: 8 },
  tweetAccionesFila: { flexDirection: 'row', alignItems: 'center' },
  tweetAccion: { flexDirection: 'row', alignItems: 'center' },
  tweetAccionTexto: { fontSize: 12, color: '#657786', marginLeft: 5 },
  vacioContainer: { alignItems: 'center', padding: 40 },
  vacioTexto: { fontSize: 14, color: '#8A7A70', marginTop: 8 },
  fabTwitter: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#C59A77', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3 },
  modalTwitterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 45, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E1E8ED' },
  modalTwitterCancelar: { fontSize: 15, color: '#657786' },
  btnTwittear: { backgroundColor: '#C59A77', paddingVertical: 6, paddingHorizontal: 16, borderRadius: 18 },
  btnTwittearTexto: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  modalTwitterCuerpo: { flexDirection: 'row', padding: 16 },
  modalTwitterAvatar: { width: 38, height: 38, borderRadius: 19, marginRight: 12 },
  modalTwitterAvatarPlaceholder: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#C59A77', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  modalTwitterInput: { flex: 1, fontSize: 16, color: '#14171A', textAlignVertical: 'top', minHeight: 180 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalBox: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18 },
  modalBoxHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalBoxTitulo: { fontSize: 17, fontWeight: 'bold', color: '#4A3B32' },
  labelInput: { fontSize: 12, fontWeight: 'bold', color: '#8A7A70', marginTop: 10, marginBottom: 4 },
  inputModal: { backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: '#E1E8ED', borderRadius: 10, padding: 10, fontSize: 14 },
  btnGuardarModal: { backgroundColor: '#C59A77', borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  btnGuardarModalTexto: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
});