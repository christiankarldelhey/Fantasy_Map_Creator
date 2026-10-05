export type Spotlight = 'tape' | 'memories' | 'traces' | 'beliefs' | 'lens' | 'resonance'

export interface TourStep {
  spotlight: Spotlight
  title: string
  body: string
}

// Agnostic words only: an Episode is whatever the Host calls a stretch
// of life (a day, a scene, a session).
export const STEPS: TourStep[] = [
  {
    spotlight: 'tape',
    title: 'Llega un episodio',
    body: 'El mundo le manda a la mente lo que pasó: dónde estuvo, qué vio, con quién se cruzó, cómo está su cuerpo. Cada cuadro de la cinta es uno de esos episodios.',
  },
  {
    spotlight: 'memories',
    title: 'Nota algunas cosas, y las guarda',
    body: 'No registra todo: lo que sus sentidos alcanzan y lo que le pesa. Cada cosa que guarda es una lamparita; brilla según su fuerza. Las de borde claro nacieron en este episodio.',
  },
  {
    spotlight: 'traces',
    title: 'Lo que nadie vuelve a traer, se apaga',
    body: 'Un recuerdo que no se evoca pierde fuerza episodio a episodio. Cuando cae del todo, se olvida: queda solo el contorno punteado, para que puedas ver lo que perdió.',
  },
  {
    spotlight: 'beliefs',
    title: 'De lo que recuerda nacen creencias',
    body: 'Cada tanto la mente reflexiona y saca conclusiones. Las creencias son las lámparas del centro; los hilos llevan a los recuerdos que las sostienen.',
  },
  {
    spotlight: 'lens',
    title: 'Antes de narrar, le susurra al narrador',
    body: 'Lo que tiene por cierto, los recuerdos que vuelven y lo que pide el cuerpo: eso es lo que la mente le dice al narrador antes de que escriba el episodio.',
  },
  {
    spotlight: 'resonance',
    title: 'Lo que resonó cambió la historia',
    body: 'No todo lo que la mente susurra llega a la prosa. Los cables dorados marcan lo que sí resonó en la narración. Esa diferencia es la que importa.',
  },
]
