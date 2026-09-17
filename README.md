# Respiro - App de Apoyo al Cuidador

Aplicación móvil desarrollada con React Native (Expo) y Supabase para la gestión y acompañamiento integral de cuidadores de personas mayores o en situación de dependencia.

---

## 1. Requisitos Previos

Antes de comenzar, se debe contar con el siguiente entorno configurado en el equipo:

* Node.js: Versión LTS recomendada (v18 o superior).
* Git: Para clonar el repositorio y sincronizar ramas de trabajo.
* Expo Go: Aplicación instalada en el teléfono móvil (disponible en Google Play Store y App Store).
* VS Code (o editor de código de preferencia).

---

## 2. Comandos de Instalación del Entorno

Abre la terminal en la raíz de tu equipo y ejecuta los siguientes comandos en orden:

```bash
git clone <URL_DEL_REPOSITORIO>
cd RESPIRO/app
```

Instalar las dependencias base del proyecto:
```bash
npm install
```

Instalar el cliente de Supabase:
```bash
npm install @supabase/supabase-js
```

Instalar las librerías nativas verificadas para Expo (evita problemas de compilación nativa):
```bash
npx expo install @react-native-async-storage/async-storage
```

Instalar la librería de iconos vectoriales:
```bash
npx expo install @expo/vector-icons
```

Instalar el sistema de navegación de Expo:
```bash
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
```

Alinear y corregir versiones de dependencias según el SDK de Expo instalado:
```bash
npx expo install --fix
```

---

## 3. Configuración del Cliente Supabase

El archivo `src/lib/supabase.ts` centraliza la conexión con la base de datos y la persistencia de sesión:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = '[https://qhtdperoxxvcpmfcbcsi.supabase.co](https://qhtdperoxxvcpmfcbcsi.supabase.co)';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFodGRwZXJveHh2Y3BtZmNiY3NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1OTgwMzEsImV4cCI6MjEwNTE3NDAzMX0.gKgvYzVZVquOkCaxLUqoewRsWJoPFKpINfUSCsXU31E';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

---

## 4. Configuración de Supabase y Base de Datos (PostgreSQL)

### Ajustes en el Panel de Supabase Authentication
1. Entrar en la web de Supabase a **Authentication > Providers > Email**.
2. **Enable Email provider:** Activado (ON).
3. **Allow new users to sign up:** Activado (ON).
4. **Allow Email logins:** Activado (ON).
5. **Confirm email:** Desactivado (OFF) para permitir registros y pruebas directas en desarrollo.

### Esquema de Tablas (Ejecutar en SQL Editor de Supabase)

```sql
-- Tabla: cuidadores
create table cuidadores (
  id uuid references auth.users on delete cascade primary key,
  nombre text not null,
  telefono text,
  correo text unique not null,
  especialidades text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla: pacientes
create table pacientes (
  id uuid default gen_random_uuid() primary key,
  cuidador_id uuid references cuidadores(id) on delete cascade,
  nombre text not null,
  edad integer not null,
  rut text,
  diagnostico text,
  alergias text,
  contacto_emergencia text,
  telefono_emergencia text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tabla: medicamentos
create table medicamentos (
  id uuid default gen_random_uuid() primary key,
  paciente_id uuid references pacientes(id) on delete cascade,
  nombre text not null,
  dosis text not null,
  horario text not null,
  stock integer default 0,
  tomado boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

### Cuenta de Acceso de Prueba
* **Correo:** `admin@admin.com`
* **Contraseña:** `admin123`

---

## 5. Comandos de Ejecución

Para iniciar el servidor de desarrollo local:

```bash
npx expo start -c
```

Para ejecutar en modo túnel (permite que cualquiera pruebe la app desde otra red Wi-Fi o datos móviles):

```bash
npx expo start --tunnel
```

---

## 6. Estructura de Archivos del Proyecto

```text
src/
├── app/
│   ├── _layout.tsx           # Guardián general de rutas y verificación de sesión
│   ├── login.tsx             # Inicio de sesión y registro de cuidadores
│   ├── ficha.tsx             # Formulario y detalle clínico del paciente
│   ├── horas_medicas.tsx     # Agenda de citas médicas y controles
│   ├── perfil.tsx            # Datos de la cuenta y botón de cerrar sesión
│   └── (tabs)/               # Menú con pestañas fijas inferiores
│       ├── _layout.tsx       # Configuración visual de la barra de pestañas
│       ├── index.tsx         # Pantalla principal con accesos directos
│       ├── pacientes.tsx     # Lista general de pacientes registrados
│       ├── medicacion.tsx    # Control de tomas y stock de fármacos
│       └── foro.tsx          # Comunidad y consultas de cuidadores
└── lib/
    └── supabase.ts           # Cliente configurado de Supabase
```

---

## 7. Flujo de Trabajo con Git

Para evitar conflictos en archivos compartidos, seguir estos pasos:

1. Actualizar la rama principal antes de programar:
```bash
git checkout main
git pull origin main
```

2. Crear una rama específica para la tarea asignada:
```bash
git checkout -b feature/nombre-de-la-pantalla
```

3. Guardar cambios con mensajes descriptivos:
```bash
git add .
git commit -m "feat: agrega formulario en pantalla de pacientes"
```

4. Subir la rama al repositorio remoto:
```bash
git push origin feature/nombre-de-la-pantalla
```

5. Crear un Pull Request en GitHub para revisar y fusionar con main.