# Movers (Living Map) — en pausa

Estado al 2026-11-03. Este doc es el punto de entrada para retomar los movers:
qué está hecho, qué falta, qué ya se acordó y dónde vive cada cosa.

## Qué son

Seres autorados (personas, compañías, huestes sin rostro) cuya presencia en el
mapa es función de la **fecha del mundo** (TA 3017–3018). Aparecen, marchan y
desaparecen por calendario, en recorridos que el viajero no puede cambiar. No son
`entities`: una Entity es un arquetipo con probabilidad por región; un Mover es
*alguien en particular* con agenda.

## Fuentes de verdad (no mover de lugar)

- **Vocabulario**: `backend/CONTEXT.md` — Mover, Leg, March, Presence, Resident,
  Trail, Crossing, Trace, Beat, Unease, One-shot.
- **Decisión**: `docs/adr/0012-movers-authored-beings-not-entities.md`.
- **Mapa de contextos**: `CONTEXT-MAP.md` (Mind Engine / Game World).
- **Formato de autoría y bake**: `database/seeds/README.md` § "Authoring movers".
- **Issues**: épica #25; tickets #26–#33 (sistema) y #35–#45 (wave 1).
- Semillero de ideas del autor (fuera del repo): `Ideas narrativas.md`, usado con
  `data_public/interactivity/PROMPT_forja_historias.md`.

## Acuerdos ya cerrados

1. **Familia de seed separada** (ADR-0012): `campaigns`, `movers`, `mover_legs`,
   `mover_beats`, `mover_trails`. Inmutable en runtime: ningún código de juego
   escribe ahí.
2. **Un Mover = secuencia de Legs**, cada una con ventana de fechas, `visibility`
   (`visible | signs | hidden`), su propio Trace y su propio Beat (el encuentro
   cambia según la etapa). Huecos entre legs = fuera del tablero (Gandalf en Orthanc).
3. **Tipos de Leg**:
   - **March**: GeoJSON dibujado a mano → bake a un punto por día en `mover_trails`.
     Doble radio: `notice_radius_km` → Trace, `contact_radius_km` → Crossing.
   - **Presence**: región + ventana + `level` + `road_bias`. Entra al pool de la
     fase **marcado** y *reemplaza* un pick aleatorio (no suma: máx. un encuentro
     por fase).
   - **Resident**: anclado a una location (o tipo + región). Dispara cuando el
     viajero **pernocta** ahí; `greeting: true` lo amplía a pasar por el lugar.
4. **One-shot por leg y por viaje**: quedarse cerca narra más Traces, no repite el Beat.
5. **`active_phases`** por leg (`morning / afternoon / before_sleep / mid_night`),
   validado también con CHECK en DB.
6. **Campaigns**: arcos compartidos entre legs de distintos movers (ej.
   `gollum-hunt`, `mirror-hunt`). Arcos conjuntos = dos movers con trails
   coincidentes, sin mecanismo especial.
7. **v1 = Beats estáticos**. El schema separa identidad / agenda / contenido para
   que los encuentros interactivos lleguen sin re-migrar.
8. **Calendario único**: todos los jugadores comparten el calendario TA; la ventana
   autorada acota el mundo. `stamp1950` sigue siendo solo el ancla del clima.
9. **Nada de hobbits de la Comunidad** en el camino (rompería la historia).
10. Crossings/Traces se calculan en la generación del día, se persisten en
    `trip_days` y llegan al narrador y al Mind como **eventos** (el Mind no sabe
    nada de movers: ADR 0004/0005).

## Hecho (en `master` tras este PR)

- **#26 schema**: `database/migrations/create_movers_tables.sql` (idempotente,
  corre en cada deploy desde `ensureSchema()` de `load-seeds.js`) + `schema.sql`.
- **#27 autoría + bake**: `seedMovers()` en `load-seeds.js` (YAML + GeoJSON →
  filas, determinístico), `npm run db:seed:movers`, validaciones en
  `validate-seeds.js`, sección en `database/seeds/README.md`.
  `js-yaml` declarado en `database/seeds/package.json` (lo necesita la imagen Docker).
- **Wave 1 autorada** (37 movers, 857 puntos de trail, 18 trails):
  - Canon (#35–#45): gandalf, the-nine, aragorn, gollum, boromir, erebor-emissary,
    dol-guldur-army + morgul-host (20 de junio), legolas, gloin-gimli, radagast,
    gildor, butterbur, bill-ferny, bombadil, shire-riders.
  - Folklore e inventados: 3 dragones del norte, old-man-willow, treebeard,
    lassemista, troll-mother, troll-brothers, peregrinos de Lindon (elleth, joyful,
    silent), dagorlad-pair + dagorlad-dead, abbot, masked-numenoreans, blue-wizards,
    dunadan-watcher, umli, beornida, apple-hobbit, glass-eye.

**Importante**: hoy **nada en runtime lee estas tablas**. Están en la base, pero
el juego no cambia hasta que se haga #28 en adelante.

## Pendiente

Orden sugerido (cada uno es un issue con criterios de aceptación):

1. **#28 Crossings & Traces (March)** — en `backend/domains/game/services/world/tripDay.js`:
   `ST_DWithin` entre la geometría del día y el punto de trail de esa fecha;
   persistir `crossings` / `traces` (JSONB) en `trip_days` (nueva migración en
   `database/migrations/` + `ensureSchema`); one-shot; pasar al prompt y a los
   eventos del Mind. Tests: dentro/fuera de radios, dedup, días sin movers iguales
   a hoy.
2. **#29 Presence en el pool de fase** — entrada marcada en `buildRegionPool`,
   ajustada por `road_bias`; tests de ventana/road_bias/vacío.
3. **#30 Resident** — disparo por pernocte (`places_interactions` overnight),
   `greeting`, ventanas estacionales; sin tocar el schema de `places_interactions`.
4. **#31 `GET /movers?date&bbox`** — posiciones de legs `visible` + regiones con
   **Unease** (leg hostil activa, sin posiciones). Nunca devolver `signs`/`hidden`.
5. **#32 Frontend living map** — tokens por tipo (hueste / compañía / persona),
   tinte de Unease, avanza con `world_date`, i18n; una llamada por fecha/viewport,
   sin mandar trails al cliente.
6. **#33 Fechas TA en la ficción** — mostrar "10 March, TA 3018"; definir la
   `world_date` inicial de jugadores nuevos dentro de la ventana y cómo rebasear
   a los existentes. Ningún lugar visible debe mostrar 1950.

### Limpieza al retomar
- Cerrar #26, #27 y #35–#45 en GitHub (el trabajo ya está), o revisar contra cada
  issue que los anclajes canónicos estén cubiertos.
- `AGENTS.md` y `docs/agents/domain.md` todavía dicen que solo hay un glosario
  (Mind Engine); ahora existe `backend/CONTEXT.md` y `CONTEXT-MAP.md`.

## Niebla (sin decidir)

- Cómo se ven los encuentros interactivos post-v1 (superficie de diálogo/elección).
- Si las legs hostiles también deberían "calentar" el pool ambiental de encuentros
  mientras están activas (flag `heats_region`, diferido).
- Contenido más allá de fines de 3018: nuevas waves extienden la ventana.

## Cómo trabajar los datos

```bash
cd backend
npm run db:seed:movers     # solo movers, iteración rápida
npm run db:seed:validate   # tiene que quedar en verde
```

Ojo: `.git/hooks/post-merge` (y `post-commit` si tocás `database/seeds/`) corren
`npm run db:seed` solos contra el `DATABASE_URL` de `backend/.env`. En prod los
seeds se cargan en cada deploy de `master` (`postdeploy`).
