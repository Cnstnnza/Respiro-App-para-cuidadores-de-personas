import { useRouter } from 'expo-router';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function PerfilScreen() {
  const router = useRouter();

  async function handleCerrarSesion() {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      router.replace('/login');
    } else {
      Alert.alert('Error', error.message);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.titulo}>Mi Perfil</Text>
        <Text style={styles.subtitulo}>Sesión actual de cuidador/a</Text>

        <TouchableOpacity style={styles.botonSalir} onPress={handleCerrarSesion}>
          <Text style={styles.textoBotonSalir}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7EFE8', padding: 24, justifyContent: 'center' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24 },
  titulo: { fontSize: 24, fontWeight: 'bold', color: '#4A3B32' },
  subtitulo: { fontSize: 14, color: '#8A7A70', marginBottom: 24 },
  botonSalir: { backgroundColor: '#B85D5D', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  textoBotonSalir: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
});