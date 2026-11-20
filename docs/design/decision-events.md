# Decisiones como eventos — nota de diseño

Resumen de la discusión sobre el modelo de eventos, tras la auditoría de kinds.
Estado: **PARKED — revertido**. El modelo "todo outcome mintea su propio kind"
fue re-pensado: los events conservan sus types actuales y solo los
special cases retypean (un encounter que termina en meal llega como `meal`;
ídem `rest`). Lo que sigue queda como referencia del análisis que llevó ahí —
la tabla de schema común y las preguntas abiertas viven en la discusión del
issue de schema de eventos.

## Contexto: la auditoría de kinds (wire real vs registry)

El sobre común ya es uniforme — todo evento viaja
`{ id?, type, when: {phase?, hour?}, where: {region?, place?}, data: {...} }`.

Hallazgos principales:

- **`interaction` es un kind mudo**: no está declarado en el registry, cae al
  default "worldly moment", y como manda `description` en vez de `reading` su
  lectura resuelve `None` → nunca puede ser Focus ni momento. Sobrevive solo
  porque el `/perceive` mid-day ya lo sedimentó.
- **Registry desactualizado**: `rest` declara `place/description/quality` pero
  el wire manda el modelo entidad (`entity/npc*/shadow_effect`); `climate`
  declara métricas que ya no viajan; `encounter` declara 9 campos de ~20;
  `meal`/`ambience` tienen campos muertos y faltantes.
- **Kinds declarados que el wire nunca manda**: `contact` (es `encounter`),
  `note` (va por `narration_notes`), `travel`/`body` (van por `condition`).
- **El truco `land`+`subtype`**: los subtypes ('terrain','water','place') son
  nombres de kinds declarados — funcionan como umbrella implícito.

## La decisión de diseño

**"Interaction" no es un kind — es el mecanismo.** La resolución de un fork ES
un evento real y debe mintearse como el kind que es: el fork de la noche
produce `rest`, una comida dada produce `meal`, un stance produce `talk`.

El modelo atómico: **el evento es el átomo; todo lo que "pasó" es un evento;
`type` dice qué pasó; `source` dice cómo entró al día.**

Dos familias, mismo sobre:

1. **Eventos-situación** (source `world`/`ambient`): lo que el mundo presentó —
   `encounter`, `ambience`, `rest` mundanos, `climate`, `land`, `meal` común.
2. **Eventos-opción** (source `decision`): lo que se resolvió en un fork —
   `talk`, `avoid`, `defy`, `rest`, `meal`, `gain` (nombre pendiente).

Proveniencia: `data.decision: {situation_id, interaction_id, act, outcome,
skill, difficulty, roll}` — los links a `/choose` y el roll de la acción
(**no** `data.check`: ese campo dispara el check de percepción de la Mente).

## La regla de kind — función pura, cero DB

```
types = {e.type for e in outcome.effects}

if   {'rest','lodging'} ∩ types                 → 'rest'
elif 'meal' in types                            → 'meal'
elif {'item','coins','heal','water'} ∩ types    → 'gain'   (nombre pendiente)
else                                            → act   (talk/avoid/defy; accept→talk)
```

- `water` confirmado siempre `{refill:true}` → `gain`, no `meal`.
- `shadow` aislado no decide kind: cae a `act`, viaja como `shadow_effect`.
- Única decisión de juicio: el orden `rest > meal > gain` (elegido: la
  experiencia corporal pesa más que el recibo material).

## Anti-duplicación (3 reglas)

- **Stance → el evento-opción**: cuando un outcome mintea `talk`/`avoid`/`defy`,
  su texto sale de `substance.stance`/`traveller_stance` del encounter —
  el encounter queda en presentación, la conducta vive en su evento.
- **Overnight → fusión**: el outcome minteado ES el `rest` de la noche;
  `restEvent()` le suma `lodging:*`/`indoor`/`npc`. `turned_away` = un `rest`
  con `lodging:turned_away` + noche pobre.
- **Sole rows** = stances incondicionales → mintean su evento igual.
- **Ambient** → intocable (ya está fusionado: situación = opción resuelta).
- La "oferta" de la noche NO es evento separado (la resolución `rest` es el
  beat; la escena de la puerta como beforealla queda para una decisión futura).

## Kind vs manner — los dos ejes

- **`type`** = familia del evento → contrato: role/source/reading/subjects.
- **`form`/`act`/`subtype`** = la manera dentro de la familia → significado
  vía semantic pack (`tag:form:*` ya discrimina delta/weight/wakes).
- Regla: kind = la cosa que pasó, al grano en que pasó. Donde la manera ES el
  evento (outcomes), la manera ES el kind.

## La cadena emocional (ADR 0017) — ya existe, falta vocabulario

```
tags → SEMANTIC PACK (world_delta objetivo)
     → RELATIONS sediment (resistance)
     → felt_through (standing + personality.sensitivity — EL PERFIL dobla aquí)
     → mood_delta → valence/mood + imprint → valence del recuerdo
```

- El diccionario ES el semantic pack (`semantics.py` + tabla `mind.semantics`).
- Nombre propuesto para CONTEXT: **Semantics → Relations → Imprint → Mood**.
- **Brecha**: el pack cubre vocabulario del mundo (`tag:form:*`, `tag:outcome:
  wounded/slain`, `tag:lodging:*`, `tag:given`, `tag:changed`) pero NO el de
  conducta (`tag:act:*`, `tag:outcome:success/failure`, `need_tags`). Los nuevos
  eventos caerían emocionalmente planos → el issue debe incluir el **mapa
  semántico** de cada kind/act (data, tunable por juego).

## Por qué minteo runtime y no eventos en DB

La parte authored YA está en la DB (`outcomes.*.text` + `effects`); el sobre
lleva contexto que solo existe al resolverse (id, hour, where, decision,
after-vitals, npc). `perceived_day` ya es el log persistido.

## Pendientes abiertos

- Nombre de `gain` (`supply`? `provision`?) — en suspenso.
- Mapa completo acts × families de situaciones (`ovn:*`, `e0*`, sole,
  failure outcomes) → kinds, para el issue.
- Filas semánticas por kind/act — redactarlas como parte del issue.
- `rest`-offer como evento antesala — decisión futura, no ahora.

## Estado del working tree

- **Sin commitear**: cleanup de Etapa 0 (wire character→canal único,
  tolerancias legacy muertas: KIND_ALIASES, is_mind_item por type, fallbacks
  when.episode/date, pipeline _evoked, 'traits', comentario de toEvents) —
  792 tests mind + 326 backend verdes.
- Migraciones: cadena reparada en master (#182), DB local en 0034.
- Falta local: `npm run db:seed` para interactions.

## Próximos pasos (mañana)

1. Commit + PR del cleanup de Etapa 0 (revisar diff entero antes).
2. Redactar el issue "outcomes como eventos" con: modelo atómico, regla de
   kind, anti-duplicación, `decision` con skill, mapa acts×families, mapa
   semántico propuesto, edge cases (turned_away, failure, sole, multi-effect).
3. Decidir `gain` y el orden `rest > meal > gain` en el issue mismo.
