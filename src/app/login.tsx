import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const [modo, setModo] = useState<'login' | 'registro'>('login');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);

  const manejarAccion = async () => {
    const correoLimpio = email.trim().toLowerCase();
    const nombreLimpio = nombre.trim();

    if (!correoLimpio || !password) {
      Alert.alert('Campos incompletos', 'Ingresa tu correo y contraseña.');
      return;
    }

    if (modo === 'registro' && !nombreLimpio) {
      Alert.alert('Nombre requerido', 'Ingresa tu nombre para crear tu cuenta.');
      return;
    }

    if (modo === 'registro' && password.length < 6) {
      Alert.alert('Contraseña corta', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setCargando(true);
    try {
      if (modo === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: correoLimpio,
          password,
        });

        if (error) {
          Alert.alert('No se pudo iniciar sesión', error.message);
          return;
        }

        if (data?.user) {
          const { data: perfil } = await supabase
            .from('cuidadores')
            .select('suspendido')
            .eq('id', data.user.id)
            .maybeSingle();

          if (perfil?.suspendido) {
            await supabase.auth.signOut();
            Alert.alert(
              'Cuenta suspendida',
              'Tu cuenta se encuentra suspendida. Contacta con la administración.'
            );
            return;
          }

          router.replace('/(tabs)');
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: correoLimpio,
          password,
          options: {
            data: { nombre: nombreLimpio },
          },
        });

        if (error) {
          Alert.alert('No se pudo registrar', error.message);
          return;
        }

        if (data?.user) {
          await supabase.from('cuidadores').upsert([
            {
              id: data.user.id,
              nombre: nombreLimpio,
              email: correoLimpio,
              biografia: '',
              verificado: false,
            },
          ]);
        }

        if (data?.session) {
          Alert.alert('Cuenta creada', 'Bienvenido a Respiro.');
          router.replace('/(tabs)');
        } else {
          Alert.alert(
            'Revisa tu correo',
            'Te enviamos un enlace de confirmación. Una vez confirmado, inicia sesión.'
          );
          setModo('login');
        }
      }
    } catch (err: any) {
      Alert.alert(
        'Error inesperado',
        err?.message || 'Ocurrió un fallo al procesar la solicitud.'
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.titulo}>RESPIRO</Text>
      <Text style={styles.subtitulo}>Apoyo y gestión para cuidadores</Text>

      <View style={styles.selectorFila}>
        <TouchableOpacity
          style={[styles.selectorBtn, modo === 'login' && styles.selectorBtnActivo]}
          onPress={() => setModo('login')}
        >
          <Text style={[styles.selectorTexto, modo === 'login' && styles.selectorTextoActivo]}>
            Iniciar Sesión
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.selectorBtn, modo === 'registro' && styles.selectorBtnActivo]}
          onPress={() => setModo('registro')}
        >
          <Text style={[styles.selectorTexto, modo === 'registro' && styles.selectorTextoActivo]}>
            Registrarse
          </Text>
        </TouchableOpacity>
      </View>

      {modo === 'registro' && (
        <>
          <Text style={styles.label}>Nombre completo</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Constanza Araya"
            placeholderTextColor="#555555"
            value={nombre}
            onChangeText={setNombre}
          />
        </>
      )}

      <Text style={styles.label}>Correo electrónico</Text>
      <TextInput
        style={styles.input}
        placeholder="ejemplo@correo.com"
        placeholderTextColor="#555555"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <Text style={styles.label}>Contraseña</Text>
      <TextInput
        style={styles.input}
        placeholder="Mínimo 6 caracteres"
        placeholderTextColor="#555555"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={styles.boton}
        onPress={manejarAccion}
        disabled={cargando}
      >
        {cargando ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.botonTexto}>
            {modo === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#F2ECE4',
    justifyContent: 'center',
    padding: 24,
  },
  titulo: { fontSize: 34, fontWeight: '900', color: '#141414', textAlign: 'center' },
  subtitulo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C221E',
    textAlign: 'center',
    marginBottom: 24,
  },
  selectorFila: {
    flexDirection: 'row',
    backgroundColor: '#E4D8CA',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#2C221E',
  },
  selectorBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  selectorBtnActivo: { backgroundColor: '#2C221E' },
  selectorTexto: { fontSize: 15, fontWeight: 'bold', color: '#141414' },
  selectorTextoActivo: { color: '#FFFFFF' },
  label: { fontSize: 16, fontWeight: 'bold', color: '#141414', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#2C221E',
    borderRadius: 12,
    padding: 14,
    fontSize: 17,
    color: '#141414',
  },
  boton: {
    backgroundColor: '#2C221E',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  botonTexto: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});