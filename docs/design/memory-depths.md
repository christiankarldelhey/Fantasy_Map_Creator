# Memory depths — fresh / consolidated / conviction

Spec del modelo de memoria acordado (sesión de grill, 2025). El glosario
ya refleja los tres depths (`CONTEXT.md · Memory`). Estado: aprobado en
diseño, pendiente de implementación — tickets fase C en `wayfinder/tickets/`.

## Modelo

Una sola tabla `memories`, una vida en tres profundidades (`depth`):

| Depth | Row | Vida | Puertas de evocación |
|---|---|---|---|
| **N1 fresh** | `kind='episodic'`, `consolidated=false`, ≤ `fresh_episodes` vividos | decae rápido; muere bajo `forget_threshold` | **recencia sola** — se presenta sin conexión |
| **N2 larga** | `consolidated=true` | decae lento (`consolidated_decay`) | tag contenido (exacto/facet) · semántica ≥ `retrieval_semantic_min` · **felt ≥ `felt_gate_min`** (nuevo) |
| **N3 conviction** | `kind='conviction'` + facet | nunca se olvida; la Reflection la gira | igual que N2; debilitada queda "susurro bajo el floor" |

Canales paralelos, no parte del ciclo de vida:

- **Relations** — sedimento numérico por sujeto; se alimenta del imprint
  de cada ítem percibido y del re-feed de memorias voceadas. Sobrevive a
  las memorias que la hicieron ("se olvida el mordisco, queda el miedo").
- **Musings** — voz autorada; gatea por cualquier tag del día (incluye
  ambient), por stems si no tiene tags, o por `context:*` (gates sobre el
  día entero, ver §5). Sin fuerza, sin evidencia, nunca decae.
- **Patterns** — bookkeeping de recurrencia en la misma tabla; nunca evoca.

## 1. Codificación — solo lo distintivo

Un ítem del `perceived_day` con salience > 0 y reading propio (sin
palabras no hay impresión: `reading:'silent'` o desc que resuelve a un
nombre pelado no codifica) computa su **firma** — la identidad del
"tipo de cosa": `(kind, entity, firma de contact-tags)`. Nace memoria
solo si cumple una de:

```
NOVEL    — ninguna memoria viva comparte su firma
RECORD   — importance > mejor importance de las memorias de su firma
RUPTURE  — ítem break de racha (la ruptura ES la noticia)
FOCUS    — fue el Focus del episodio
```

Efectos: el boilerplate muere en la puerta (segunda noche igual, cuarto
cielo nublado, pan repetido, "town"), sin hardcodear kinds; la primera
tormenta codifica, la segunda solo si fue peor; la repetición mediocre
deja de llenar la tabla. La absorción por firma generaliza la actual
`by_desc` (desc exacta) y el arco `need:` ya funciona así.

## 2. Evocación — gates por profundidad

En `retrieve()`:

- **Canal fresco**: `consolidated=false` y `idx − created_episode ≤
  fresh_episodes` (default 2, wiring) → se presenta al scoring sin
  contact gate. La tormenta de ayer colorea el día soleado.
- **N2/N3**: las puertas actuales (contact tag exacto o facet,
  semántica ≥ floor) **más el canal felt**: `felt_proximity(mem.felt,
  day_pulls) ≥ felt_gate_min` (default ~0.7) también abre — un día gris
  despierta el duelo viejo sin necesitar tag. Solo consolidadas.
- Patterns nunca candidatas (ya). Importance floor y refractario se
  mantienen.

## 3. Scoring — recencia en días vividos

```
score = α·recency + β·importance + γ·relevance + δ·sim + felt·proximity
```

- **recency usa `episode_idx`** (días vividos, reloj C29), no
  `episode_date`: un mes de descanso entre viajes no envejece
  mecánicamente la memoria. `episode_date` queda para lectura narrativa
  ("hace un mes") en el lens.
- **Las consolidadas no suman el término alpha** — compiten por conexión
  pura: β·importance + γ·relevance + δ·sim + felt. Esto resucita las
  seeds del preset (hoy `created_date` ~1460–1850 ⇒ recency=0 exacto;
  42 memorias, 0 evocaciones en 25 episodios de Celebrían).
- `retrieval_min_score` se recalibra para el reparto sin alpha en
  consolidadas (el ranking lo deciden conexión y peso, no frescura).
- Voicing sin cambios: top-K → el Lens elige → voiced re-siente
  (strength+, imprint→Relations, mood→su felt).

## 4. Promociones

- **N1 → N2**: sin cambios de regla — nace consolidada si `importance ≥
  fixed_threshold` (lo excepcional no hace cola), o consolida si
  `voiced ≥ evocations_to_fix` con `importance ≥ consolidate_min`
  (la mente fija lo que nombra).
- **N2 → N3**: nunca automático. La Reflection acuña convictions con
  `evidence: [memory_id]` (la memoria original sigue su vida; la
  creencia le sobrevive). Seeds declaradas = convictions de nacimiento.
  **Una Relation jamás produce una Belief** — el vector nunca verbaliza.

## 5. `context:*` — gates sobre el día entero (musings + beliefs)

Generalizar `context:solitude` (hoy hardcodeado a `contact_seen`) en un
evaluador declarado: `_day_contexts(perceived_day, needs_active)` → set
de contextos verdaderos. Un tag `context:X` en musing o belief exige
`X ∈ contexts` — los de ausencia hablan cuando el día no trajo algo.

Vocabulario inicial: `solitude` (sin contacto), `company` (con
contacto), `danger` (tags de peligro percibidos), `safe` (sin peligro),
`deprivation` (need fisiológica abierta). Declarados en un registry —
agregar uno nuevo es una entrada, no un if. Memorias no usan
`context:*`: su canal de ausencia ya existe (rupture items + felt).

## 6. Verbalización

- **Ahora**: el filtro distintivo limpia el corpus; el Lens sigue
  envolviendo lo evocado como pasado.
- **Después (ticket propio)**: la Reflection extiende `reword` a las
  top-K memorias voceadas del día — reescritura a primera persona en la
  voz del personaje. Las convenciones `reword` ya existen para
  convictions.

## Fuera de scope

- Scenes y granularidad escena-nivel (feature aparte).
- Migración editorial de seeds que nunca conecten → convictions
  (decisión data-driven tras observar evocación con la física nueva).
- Evocación por ausencia para memorias (cubierto por rupture + felt).
- Reflection escribiendo musings (si llega, las musings se vuelven un
  depth autorado-por-la-mente — repensar entonces).

## Criterios de aceptación

- Memoria < `fresh_episodes` evoca sin tag contact; pasada la ventana,
  necesita conexión.
- Consolidada evoca por `felt_proximity ≥ felt_gate_min` sin tags.
- `episode_date` distante no mata el término alpha (recency por idx).
- Seed de Celebrían con tags conectables puede evocar (hoy: imposible).
- Segundo ítem misma-firma con menor salience no codifica; uno que rompe
  récord se absorbe/refuerza.
- `context:safe` en una musing dispara solo en días sin peligro.
- `_compact_duplicates` y tests existentes adaptados; suite `pytest`
  completa verde.

## Knobs nuevos (wiring)

`fresh_episodes` (2) · `felt_gate_min` (0.7) · `retrieval_min_score`
recalibrado · `consolidated_decay` ya existe.
