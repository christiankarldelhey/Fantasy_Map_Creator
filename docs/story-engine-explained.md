# Story Engine — Qué es, explicado sin código

> Documento para público general. No hace falta saber programar. Todo se explica
> con la analogía que le da sentido: la mente de una persona.

---

## La idea en un párrafo

Cuando jugás un juego narrado, hoy el narrador recibe los hechos del mundo tal
cual ocurrieron: "llovieron 6mm, caminaste 14km, comiste una ración, viste unas
huellas". Todos los personajes reciben el mismo mundo crudo, y por lo tanto
todos lo cuentan igual.

**Story Engine es el servicio que interpone una mente entre el mundo y el
narrador.** El narrador ya no recibe los hechos: recibe *lo que ese personaje
percibió, recordó, creyó y sintió* de esos hechos. El mundo decide qué pasa;
la mente decide cómo se vivió.

## Por qué importa

Un ranger y un hobbit que caminan bajo la misma lluvia no viven la misma
lluvia. El ranger la registra y sigue; el hobbit la siente en los huesos y la
va a recordar. Si el narrador recibe "llovió 6mm" para ambos, escribe el mismo
párrafo para dos personas distintas. Si recibe *cómo lo vivió cada uno*, la
historia se vuelve personal sin que el juego tenga que inventar nada nuevo.

## Story Engine por dentro: dos motores y dos paneles

```
Story Engine  (el servicio completo)
│
├── Mind Engine      — la mente: percibe, recuerda, cree, siente
│   └── Mind Tuner      → panel para tunear cada mente
│
├── Narrator Engine  — la voz: convierte lo percibido en prosa vía IA
│   └── Narration Tuner → panel para tunear cómo se nombran las cosas
```

- **Mind Engine** es la parte nueva. Es una simulación acotada de vida
  interior: percepción, memoria, creencias, necesidades, ánimo.
- **Narrator Engine** es lo que ya existe hoy: toma contexto, arma el pedido a
  la IA y produce la narrativa.
- Los **Tuners** son los admins: paneles visuales para cambiar cómo funciona
  cada motor *sin tocar código ni volver a desplegar*.

---

## La mente, pieza por pieza

Cada concepto de Mind Engine corresponde a algo que tu propia mente hace.

### Percepción — notar, no notar, malinterpretar

Los hechos del mundo llegan como una lista plana de *eventos*: "llovió", "hubo
un encuentro", "el cuerpo reporta cansancio". La mente pasa cada uno por un
filtro: ¿lo noté? ¿lo noté bien?

Una persona cansada o asustada puede *malinterpretar* lo que ve: la huella de
un animal se convierte en presagio. Eso es un `misread`: el evento pasó, pero
la versión que llega a la narración está torcida por el estado del personaje.

### Memoria — el olvido es el feature

Todo lo percibido compite por convertirse en recuerdo. Un sistema de
*importancia* puntúa cada evento: peligro, novedad ("primera vez que veo
esto"), carga emocional, y — clave — **cuánto le importa el tema a esta mente
en particular**.

Lo que se recuerda decae con el tiempo, salvo que sea evocado. Un cerebro que
lo recuerda todo es un log, no una mente: por eso el olvido está diseñado, no
es una falla. Y hay tres caminos a la permanencia:

1. **Nacer fijo** — lo que fue demasiado importante (un encuentro mortal, una
   promesa) no decae nunca.
2. **Volverse tema** — lo trivial repetido ("lleva lloviznando toda la
   semana") deja de ser 7 recuerdos y se convierte en *una* idea persistente.
   Los fragmentos mueren; la repetición queda.
3. **Consolidarse por uso** — lo que se evoca muchas veces termina fijo. Como
   en la vida: lo que recordás seguido, lo recordás.

### Creencias — lo que la mente concluye de lo que vivió

De las memorias, la mente extrae *creencias* con un nivel de confianza: "los
montaraces ayudan", "el sur es peligroso", "puedo con esto". Las creencias se
refuerzan, se debilitan y hasta pueden *invertirse* — una creencia
contradicha muchas veces da vuelta el signo (crecimiento); una negativa que
se refuerza demasiado se vuelve trauma.

Dos reglas las hacen creíbles:

- **Ninguna creencia sin evidencia**: cada una apunta a recuerdos reales que
  la sustentan. La mente no alucina conclusiones.
- **Las creencias de origen se marcan**: un personaje puede llegar con
  creencias de su historia personal (`seed`) — vienen de fábrica, pero son
  mutables como todas: la experiencia puede cambiarlas.

### Necesidades — los hilos abiertos

Hambre, sed, una promesa sin cumplir, un encuentro que quedó a medias. Son
*open loops*: aparecen en el resumen que recibe el narrador como intenciones
("resolver el hambre", "¿en qué quedó lo del hobbit?") que la prosa puede
hacer actuar — sin tocar la mecánica del juego.

### Ánimo — la capa rápida

Valencia (bien/mal), activación (calma/alerta) y emoción dominante. Cambia por
episodio según lo que pasó recientemente, el cuerpo y los rasgos.

### El lente — el resumen que recibe el narrador

Todo lo anterior se comprime en un texto: "cómo este personaje ve el mundo
*hoy*". Eso es lo que el narrador usa para escribir. El resultado: la misma
jornada narrada distinto según quién la vivió.

---

## Los dos paneles (admins)

### Narration Tuner — cómo se nombran las cosas

La capa que traduce números a palabras: "entre 2 y 8mm de lluvia → *light
rain*", "más de 25km/h de viento → *ventoso*". Hoy esas tablas están escritas
en código; el panel las convierte en **datos editables**: cambiar un umbral o
una frase es editar una fila, no deployar.

Es **una sola capa por juego**, compartida por todas las mentes — porque "qué
es 6mm de lluvia" es un hecho del mundo, no del observador. Lo que difiere
por personaje no es cómo se nombra la lluvia, sino cuánto le pesa.

*(Más adelante: una mente podría tener overrides propios — el hobbit que llama
"tormenta" a lo que el ranger llama "llovizna". La puerta queda abierta.)*

### Mind Tuner — cómo funciona cada mente

El panel del cerebro. Edita **moldes** y **perfiles vivos**:

- **Moldes**: arquetipos con nombre (`default`, "elfo veterano", "hobbit
  miedoso", "Aranath"). Definen pesos temáticos, parámetros de cableado y
  creencias iniciales.
- **Perfiles vivos**: cada personaje recibe *una copia* de un molde al
  nacer. Desde ahí, el perfil diverge por lo que vive — memorias, creencias,
  ánimo — y por lo que el admin edite. Cambiar el molde no reconfigura
  cerebros que ya vivieron cosas.

Los settings que el Mind Tuner controla:

- **Pesos temáticos** (`theme_weights`): cuánto le importa cada tema a esta
  mente. Un personaje con interés gastronómico recuerda y evoca sus comidas;
  para otro, comer pasa sin dejar rastro. Es el foco atencional hecho dato.
- **Cableado** (`wiring`): los números del motor — qué tan rápido se olvida,
  qué tan fácil se consolida un recuerdo, cuánto pesa la novedad vs. la
  emoción al decidir qué importa.
- **Creencias semilla**: la historia previa del personaje, cargada como
  creencias iniciales.

Y una herramienta clave: **el tester** — una pantalla donde escribís un valor
de prueba ("precipitación: 6mm") y ves al instante qué frase produce la
configuración actual y cuánto le pesaría a cada mente. Editar sin ver el
efecto es editar a ciegas.

### Regla de autoría

El diseño separa dos canales y no los mezcla:

- **La config la escribe el humano** (vía Tuner o molde).
- **El contenido lo escribe la vida** (memorias, creencias, ánimo — se acumulan
  solos jugando).

Más adelante, las creencias podrían *recablear* levemente la mente (una
creencia fuerte amplifica el peso de su tema). Pero siempre como dato
inspectable — "le pesa más el clima *porque cree* X" — nunca como un número
mágico que nadie decidió.

---

## El flujo, en la vida de un episodio

Un episodio (un día, una escena) tiene tres momentos:

1. **Abrir** — el juego manda los hechos. La mente los percibe, evoca
   recuerdos, calcula el ánimo y produce el *paquete*: el día tal como lo
   vivió el personaje + el lente.
2. **Narrar** — con ese paquete se construye el pedido a la IA y sale la
   prosa.
3. **Cerrar** — el juego ya guardó su verdad; le avisa a la mente, que
   aprende: qué eventos se vuelven recuerdos, qué decae, qué se olvida.

Si el juego nunca cierra un episodio, la mente simplemente no lo recuerda —
no hay inconsistencia. Y si el servicio está caído, el juego narra igual, sin
lente. La mente nunca bloquea la partida.

## Qué no hace (a propósito)

- **No decide qué pasa en el mundo.** El juego produce los hechos; la mente
  solo decide cómo se vivieron.
- **No escribe el estado del juego.** Vida, energía, inventario, posición:
  todo eso es del juego. La mente tiene su propia base — *su* memoria — y es
  lo único que escribe.
- **No es una IA todo el tiempo.** Percibir, recordar, olvidar y sentir son
  reglas deterministas. La IA aparece en la narración y, más adelante, en la
  reflexión que consolida creencias — ni siquiera todos los días.

## Por qué esto no es "de la Tierra Media"

Nada de lo anterior sabe qué es un hobbit. La mente solo conoce eventos
genéricos (`clima`, `encuentro`, `comida`, `cuerpo`...), y el juego que la
usa es quien traduce su mundo a ese idioma. El mismo Story Engine puede darle
interioridad a un superviviente medieval, un piloto espacial o un detective —
cada juego trae su mundo; la mente pone el modo de vivirlo.
