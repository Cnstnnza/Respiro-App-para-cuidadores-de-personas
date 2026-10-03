import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const [modo, setModo] = useState<'login' | 'registro'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [especialidades, setEspecialidades] = useState('');
  const [cargando, setCargando] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Atención', 'Ingresa tu correo y contraseña.');
      return;
    }
    setCargando(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });
      if (error) throw error;
      // Redirige al grupo de pestañas (abre index automáticamente: el foro)
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Error al iniciar sesión', err.message || 'Credenciales inválidas.');
    } finally {
      setCargando(false);
    }
  }

  async function handleRegistro() {
    if (!nombre.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Atención', 'Nombre, correo y contraseña son obligatorios.');
      return;
    }
    setCargando(true);
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      });
      if (authError) throw authError;

      if (data.user) {
        await supabase.from('cuidadores').insert([
          {
            id: data.user.id,
            nombre: nombre.trim(),
            telefono: telefono.trim(),
            correo: email.trim(),
            especialidades: especialidades.trim(),
          },
        ]);
      }
      Alert.alert('¡Cuenta creada!', 'Iniciando sesión...');
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Error al registrar', err.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.titulo}>Respiro</Text>
      <Text style={styles.subtitulo}>Cuidado y acompañamiento</Text>

      <View style={styles.pestanasContenedor}>
        <TouchableOpacity
          style={[styles.pestanaBoton, modo === 'login' && styles.pestanaBotonActivo]}
          onPress={() => setModo('login')}
        >
          <Text style={[styles.pestanaTexto, modo === 'login' && styles.pestanaTextoActivo]}>
            Iniciar Sesión
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pestanaBoton, modo === 'registro' && styles.pestanaBotonActivo]}
          onPress={() => setModo('registro')}
        >
          <Text style={[styles.pestanaTexto, modo === 'registro' && styles.pestanaTextoActivo]}>
            Registrarse
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tarjeta}>
        {modo === 'registro' && (
          <>
            <Text style={styles.label}>Nombre Completo *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Ana García"
              placeholderTextColor="#A0958E"
              value={nombre}
              onChangeText={setNombre}
            />
            <Text style={styles.label}>Teléfono</Text>
            <TextInput
              style={styles.input}
              placeholder="+56 9 1234 5678"
              placeholderTextColor="#A0958E"
              keyboardType="phone-pad"
              value={telefono}
              onChangeText={setTelefono}
            />
            <Text style={styles.label}>Especialidades</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Primeros auxilios, geriatría"
              placeholderTextColor="#A0958E"
              value={especialidades}
              onChangeText={setEspecialidades}
            />
          </>
        )}

        <Text style={styles.label}>Correo Electrónico *</Text>
        <TextInput
          style={styles.input}
          placeholder="admin@admin.com"
          placeholderTextColor="#A0958E"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Contraseña *</Text>
        <TextInput
          style={styles.input}
          placeholder="admin123"
          placeholderTextColor="#A0958E"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={styles.botonPrincipal}
          onPress={modo === 'login' ? handleLogin : handleRegistro}
          disabled={cargando}
        >
          {cargando ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.textoBotonPrincipal}>
              {modo === 'login' ? 'Ingresar a Respiro' : 'Crear Cuenta'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#F7EFE8', flexGrow: 1, justifyContent: 'center' },
  titulo: { fontSize: 36, fontWeight: 'bold', color: '#4A3B32', textAlign: 'center', marginBottom: 4 },
  subtitulo: { fontSize: 15, color: '#8A7A70', textAlign: 'center', marginBottom: 24 },
  pestanasContenedor: { flexDirection: 'row', backgroundColor: '#E8DFD8', borderRadius: 14, padding: 4, marginBottom: 16 },
  pestanaBoton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  pestanaBotonActivo: { backgroundColor: '#FFFFFF' },
  pestanaTexto: { fontSize: 14, fontWeight: '600', color: '#8A7A70' },
  pestanaTextoActivo: { color: '#4A3B32' },
  tarjeta: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 22 },
  label: { fontSize: 13, fontWeight: '600', color: '#5C4E45', marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#FAF6F0', borderWidth: 1, borderColor: '#E8DFD8', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#333' },
  botonPrincipal: { backgroundColor: '#C59A77', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 22 },
  textoBotonPrincipal: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});