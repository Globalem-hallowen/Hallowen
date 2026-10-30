# Jurado Halloween 2026 · Globalem

Aplicación web para que el jurado califique el concurso de Halloween del viernes 30 de octubre de 2026:
**Isla mejor decorada** ($300.000) y **Mejor disfraz individual** ($200.000).

- **Página:** HTML estático publicado en GitHub Pages. Funciona desde cualquier red, en celular o computador.
- **Datos:** Supabase (PostgreSQL). Las reglas del concurso viven en la base de datos.

## Estructura

```
index.html                    Estructura de la página e íconos SVG
config.js                     URL y clave pública de Supabase
css/
  tokens.css                  Paleta, fuentes y medidas (variables :root)
  base.css                    Tipografía, encabezado, botones, fondo y avisos
  home.css · pin.css          Inicio y teclado del PIN
  judge.css · sheet.css       Lista del jurado y hoja de calificación
  admin.css · awards.css      Panel de administración y premiación
  modern.css                  Capa visual moderna (va de última)
js/
  main.js                     Punto de entrada
  data.js                     Jurados, grupos, criterios y premios
  state.js                    Estado compartido de la aplicación
  utils.js                    $, escape de HTML, localStorage, íconos y avisos
  api.js                      Llamadas a las funciones hw_* de Supabase
  sync.js                     Tiempo real (consulta cada 2,5 s) y sesión
  router.js                   Render general y navegación entre pantallas
  items.js                    Islas y participantes, nota completa y suma
  scores.js                   Guardado de notas
  results.js                  Cálculo de puntajes, puestos y desempate
  admin-actions.js            Cerrar, revelar, participantes y PIN
  export.js                   Exportar a CSV (Excel)
  events.js                   Clics y teclado
  webs.js                     Telarañas del fondo
  views/                      Una pantalla por archivo: home, pin, judge, sheet, admin, awards
database/schema.sql           Tablas, reglas, funciones de la API y datos iniciales
.github/workflows/pages.yml   Publicación automática en GitHub Pages
```

El JavaScript usa módulos del navegador (`import`/`export`), sin compilación ni dependencias.
Por eso la página se abre desde un servidor (`localhost` o GitHub Pages), no con doble clic en el archivo.

## Puesta en marcha

### 1. Base de datos (una vez)

En Supabase → **SQL Editor → New query**, pega [`database/schema.sql`](database/schema.sql) y presiona **Run**.
Se puede volver a ejecutar sin perder datos.

### 2. Clave pública

En Supabase → **Project Settings → API Keys**, copia la clave **anon public** (`eyJ...`) o
**publishable** (`sb_publishable_...`) y pégala en `config.js`.

Esa clave es pública por diseño: las tablas tienen RLS sin políticas y la página solo puede ejecutar las
funciones `hw_*`, que validan PIN y sesión. **Nunca** pongas en este repositorio la contraseña de la base de
datos ni la clave `service_role` / `secret`.

### 3. Publicar

1. Sube este contenido a un repositorio de GitHub (rama `main`).
2. En el repositorio: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Cada `push` a `main` publica la página. La dirección aparece en **Actions** y en **Settings → Pages**
   (por ejemplo `https://<usuario>.github.io/<repositorio>/`).

### Probar en el computador

Cualquier servidor estático sirve, por ejemplo:

```bash
python -m http.server 8000
```

y abre `http://localhost:8000`.

## PIN iniciales

| Quién | PIN |
|---|---|
| Jorge | 4817 |
| Juliana | 2593 |
| Tifanny | 7364 |
| Panel de administración | 3108 |

Cámbialos en **Panel → Ajustes** antes del evento: el repositorio puede ser público.

## Reglas que aplica la base de datos

- Cada jurado entra con su PIN y solo puede leer y editar **sus propias** notas.
- Con la votación cerrada, se rechaza cualquier cambio de notas.
- Los resultados solo se publican cuando la organizadora presiona **Revelar resultados**.
- 5 PIN incorrectos seguidos bloquean a ese usuario durante 5 minutos.
- Puntaje final = suma de los tres jurados (máximo 120). Empate: gana la mayor suma en "Creatividad y originalidad".
- Si un jurado marca "No se disfrazó / no corresponde a la temática", la persona queda fuera del premio.

## API (funciones de Supabase)

| Función | Quién |
|---|---|
| `hw_public(p_v)` | Todos: participantes, estado y resultados revelados |
| `hw_login(p_who, p_pin)` / `hw_session` / `hw_logout` | Entrada con PIN |
| `hw_mine`, `hw_save_score` | Jurado |
| `hw_admin_all`, `hw_admin_state`, `hw_admin_add_person`, `hw_admin_update_person`, `hw_admin_remove_person`, `hw_admin_set_pin` | Organizadora |

El tiempo real funciona por consulta cada 2,5 s: la base de datos lleva un número de versión y solo envía
datos cuando algo cambió.

## Antes del evento: borrar notas de prueba

```sql
update estado_concurso set votacion_cerrada = false, resultados_revelados = false, resultados = null where id = 1;
delete from calificaciones;
delete from sesiones;
delete from intentos_login;
delete from participantes where nombre like 'ZZ Prueba%';
```
