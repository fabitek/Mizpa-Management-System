# 🚀 Guía de Despliegue a Producción (Supabase + Vercel)

Esta guía detalla los pasos exactos para desplegar **Mizpa Management System** en **Supabase** (Base de datos PostgreSQL + Storage + Auth) y **Vercel** (Hosting Next.js Serverless).

---

## 1. Configuración de Supabase (Base de Datos)

1. Ingresa a [supabase.com](https://supabase.com) y crea un nuevo proyecto (ej. `mizpa-production`).
2. En el menú lateral izquierdo, ve a **SQL Editor**.
3. Haz clic en **New query** y copia todo el contenido del archivo [`supabase/migrations/001_initial_schema.sql`](./supabase/migrations/001_initial_schema.sql).
4. Haz clic en **Run**.
   - Esto creará las 5 tablas principales (`players`, `matches`, `attendances`, `financial_entries`, `goal_events`), los índices, las políticas RLS y el usuario administrador por defecto (`Fabián Téllez`).
5. Ve a **Project Settings** -> **API** y copia las siguientes credenciales:
   - **Project URL** (`https://<project-ref>.supabase.co`)
   - **anon / public key** (`eyJhb...`)
   - **service_role key** (clave secreta para operaciones administrativas seguras)

---

## 2. Configuración de Autenticación de Google (Opcional / Recomendado)

1. En Supabase, ve a **Authentication** -> **Providers** -> **Google**.
2. Habilita el interruptor y pega tu `Client ID` y `Client Secret` de Google Cloud Console.
3. En **Authentication** -> **URL Configuration**, añade la URL de redirección:
   - `https://<tu-app>.vercel.app/auth/callback`

---

## 3. Despliegue en Vercel

1. Sube tu código a un repositorio de GitHub (o GitLab/Bitbucket).
2. Entra a [vercel.com](https://vercel.com) y haz clic en **Add New...** -> **Project**.
3. Importa el repositorio del proyecto `Mizpa Management System`.
4. En la sección **Environment Variables**, añade:

| Variable | Valor |
| :--- | :--- |
| `DATA_SOURCE` | `supabase` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<tu-project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhb...` (tu anon key) |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhb...` (tu service role key) |
| `NEXT_PUBLIC_SITE_URL` | `https://<tu-app>.vercel.app` |

5. Haz clic en **Deploy**.
6. En menos de 2 minutos, tu sistema estará 100% operativo en producción.

---

## 4. Verificación Post-Despliegue

- [ ] Ingresar a `https://<tu-app>.vercel.app/matches` y verificar que el partido cargue desde Supabase.
- [ ] Ingresar a `https://<tu-app>.vercel.app/players` y probar la creación de un nuevo jugador o carga masiva.
- [ ] Probar el enlace RSVP público (`/rsvp/<match-id>`) desde un dispositivo móvil.
- [ ] Probar el cálculo y liquidación de cuotas en `/matches` y verificar que el saldo se refleje en `/wallet`.
