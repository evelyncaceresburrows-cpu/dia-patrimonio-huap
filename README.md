# Día del Patrimonio HUAP — Posta Central

Sitio web institucional para el **Día del Patrimonio 2026** del Hospital de Urgencia Asistencia Pública (HUAP / Posta Central). Recorrido por la historia, la memoria pública y el rol sanitario del HUAP en Santiago.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | HTML estático + Tailwind CDN + vanilla JS (single-page app con vistas) |
| Backend | Vercel Serverless Functions (Node.js 18+) |
| Base de datos | Supabase (Postgres) |
| Email | Resend |
| Deploy | Vercel |
| Mapa | OpenStreetMap (embed iframe) + enlace a Google Maps |

> **Nota arquitectónica.** El proyecto original venía como un único `index.html` sin build system. Se mantuvo esa arquitectura y se agregó solamente la capa mínima necesaria (`api/` + `package.json` + `vercel.json`) para que sea deployable en Vercel con base de datos y correo reales.

## Estructura

```
dia-patrimonio-huap/
├── public/
│   ├── index.html              # Sitio (5 vistas: inicio, historia, recorrido, info, participa)
│   └── uploads/                # Imágenes y assets
├── api/
│   └── participa.js            # Endpoint serverless: valida → Supabase → Resend
├── supabase/
│   └── schema.sql              # Esquema SQL a aplicar en Supabase
├── package.json
├── vercel.json
├── .env.example                # Variables documentadas (NO contiene secretos)
├── .gitignore
└── README.md
```

## Correr localmente

```bash
# 1) Instalar dependencias
npm install

# 2) Copiar y completar variables de entorno
cp .env.example .env.local
# Edita .env.local con tus credenciales reales (ver sección "Variables de entorno")

# 3) Levantar el servidor (front + serverless functions)
#    Requiere Vercel CLI: npm i -g vercel
npm run dev
# → abre http://localhost:3000
```

Si solo querés ver el frontend sin backend (formulario no funcionará):

```bash
npm run serve   # http://localhost:3000  (sirve /public con `serve`)
```

## Variables de entorno

Todas se configuran en Vercel (Project → Settings → Environment Variables) y para desarrollo local en `.env.local`. Ninguna está hardcodeada en el código.

| Variable | Origen | Obligatoria |
|---|---|---|
| `SUPABASE_URL` | supabase.com → Project Settings → API → Project URL | sí |
| `SUPABASE_SERVICE_ROLE_KEY` | supabase.com → Project Settings → API → service_role secret | sí |
| `SUPABASE_ANON_KEY` | supabase.com → Project Settings → API → anon public | reservada para uso futuro |
| `RESEND_API_KEY` | resend.com → API Keys → Create API Key | sí |
| `RESEND_FROM` | Remitente. Mientras no haya dominio verificado, dejar `"HUAP Patrimonio <onboarding@resend.dev>"` | sí |
| `CONTACT_EMAIL_TO` | Correo donde llegan los testimonios. Configurado: `evelyncaceresburrows@gmail.com` | sí |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile (anti-spam). Opcional. | no |

## Base de datos

1. Crear proyecto gratis en [supabase.com](https://supabase.com).
2. En el dashboard, ir a **SQL Editor → New query**.
3. Pegar el contenido de [`supabase/schema.sql`](./supabase/schema.sql) y ejecutar.
4. En **Project Settings → API**, copiar:
   - `Project URL` → variable `SUPABASE_URL`
   - `service_role` secret → variable `SUPABASE_SERVICE_ROLE_KEY` ⚠ (mantener privada, NUNCA exponer en frontend)
5. En **Table Editor** debería aparecer la tabla `participa_submissions`.

### Tabla creada

`participa_submissions` con campos: `id`, `created_at`, `nombre`, `vinculo`, `testimonio`, `anio`, `autorizacion`, `ip_address`, `user_agent`, `email`, `source`, `status`. Tiene RLS activado: solo el backend (con service role) puede escribir.

## Email transaccional

1. Crear cuenta en [resend.com](https://resend.com).
2. **API Keys → Create API Key** → copiar a `RESEND_API_KEY`.
3. Mientras no exista dominio verificado, `RESEND_FROM` debe ser `onboarding@resend.dev` (sandbox de Resend).
4. Cuando haya dominio institucional (ej. `huap.cl`), agregarlo en Resend → Domains → DNS, esperar verificación y actualizar `RESEND_FROM` a `"HUAP Patrimonio <patrimonio@huap.cl>"` o equivalente.

Los correos llegan a `CONTACT_EMAIL_TO` (`evelyncaceresburrows@gmail.com`) con:
- subject: `[Posta Central] Nuevo testimonio de {nombre}`
- HTML con todos los campos del formulario + metadatos técnicos.

## Endpoints

| Método | Ruta | Función |
|---|---|---|
| POST | `/api/participa` | Recibe testimonio del form, valida, persiste en Supabase, envía email. Devuelve `{ ok: true, id }` o `{ ok: false, error }`. |

## Deploy en Vercel

```bash
# 1) Instalar CLI (una vez)
npm i -g vercel

# 2) Login
vercel login

# 3) Desde la carpeta del proyecto
vercel
# Aceptar defaults; cuando pregunte por directorio root, dejar el actual.

# 4) Configurar variables de entorno
#    Dashboard de Vercel → tu proyecto → Settings → Environment Variables
#    Agregar todas las del .env.example (excepto los placeholders).

# 5) Deploy a producción
vercel --prod
```

Alternativa por dashboard: importar el repo de GitHub en `vercel.com/new`, definir las variables de entorno antes del primer deploy.

## GitHub

```bash
# Desde /dia-patrimonio-huap
git init
git add .
git commit -m "feat: sitio Día del Patrimonio HUAP 2026 — frontend + backend"

# Crear repo vacío en github.com (sin README, sin .gitignore, sin licencia)
# Luego:
git branch -M main
git remote add origin https://github.com/<TU-USUARIO>/dia-patrimonio-huap.git
git push -u origin main
```

## Investigación de datos (fuentes verificadas)

La sección "Cómo llegar" e "Información práctica" usa datos verificados, **no inventados**:

- **Dirección oficial histórica**: Av. Portugal 125, Santiago Centro.
- **Urgencias (desde febrero 2025)**: ingreso por Curicó 345, edificio Monseñor Valech.
- **Metro más cercano**: Universidad Católica (Línea 1), 2–5 min a pie.
- **Alternativa**: Baquedano (L1/L5), 7 min a pie.
- **Paradero referencial**: PA532 — Parada 1 / Posta Central.

Fuentes:
- Servicio de Salud Metropolitano Central — [Urgencia del HUAP cambia su ubicación](https://ssmc.gob.cl/urgencia-del-huap-cambia-su-ubicacion-tras-52-anos-de-funcionamiento/)
- Sitio institucional HUAP — [huap.redsalud.gob.cl](https://huap.redsalud.gob.cl/)
- Moovit — [Cómo llegar a HUAP](https://moovitapp.com/index/en/public_transit-Hospital_de_Urgencia_Asistencia_P%C3%BAblica_HUAP-Santiago-site_20359688-642)
- Wikipedia — [Hospital de Urgencia Asistencia Pública](https://es.wikipedia.org/wiki/Hospital_de_Urgencia_Asistencia_P%C3%BAblica)

## Seguridad

- `SUPABASE_SERVICE_ROLE_KEY` solo se usa en la función serverless (servidor), nunca expuesta al cliente.
- `RESEND_API_KEY` igual: solo backend.
- Row Level Security activado en la tabla; sin policies públicas.
- Validación del payload en el endpoint (longitudes, campos obligatorios, checkbox de autorización).
- IP y User-Agent guardados para auditoría y futuro rate-limiting.
- Las claves del `.env.example` son placeholders. El `.gitignore` excluye `.env.local`, `.env` y `.vercel`.

## Pendientes / futuro

- [ ] Agregar Cloudflare Turnstile o hCaptcha en el form (variable `TURNSTILE_SECRET_KEY` ya soportada en el endpoint, solo falta enchufar el widget en el HTML).
- [ ] Configurar dominio propio en Resend para que el remitente sea `@huap.cl` u otro institucional.
- [ ] Si se quiere un dashboard para revisar testimonios, basta con usar el Table Editor de Supabase.
