// useMindMap — fetch graph.json and lay it out as one explorable canvas:
// INSIDE THE MIND — the traced step chain for open → narrate → close.
// Every node carries the real golden-day data it transformed; every step
// names a glossary Concept.
import { computed, ref, type Ref } from 'vue'
import type { Edge, Node } from '@vue-flow/core'
import { fetchMindMap } from '../api'
import type { MindMapGraph, MindMapTrace } from '../types'

export interface MapNodeData {
  kind: 'lane' | 'world' | 'contract' | 'part' | 'step' | 'kind' | 'concept' | 'io'
  title: string
  sub?: string
  tip?: string
  meta?: string
  example?: unknown
  rules?: string[]
}

const fmt = (v: unknown, cap = 1400): string => {
  const s = JSON.stringify(v, null, 1)
  return s.length > cap ? s.slice(0, cap) + '\n…' : s
}

export function useMindMap() {
  const graph: Ref<MindMapGraph | null> = ref(null)
  const error = ref<string | null>(null)
  const loading = ref(true)
  const stage = ref<string>('perception')

  async function load() {
    loading.value = true
    try {
      graph.value = await fetchMindMap()
      error.value = null
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      graph.value = null
    } finally {
      loading.value = false
    }
  }
  load()

  // The stages the manifest knows, in first-appearance order.
  const stages = computed<string[]>(() => {
    const g = graph.value
    if (!g) return []
    const seen = new Set<string>()
    for (const c of Object.values(g.concepts)) {
      if (c.stage) seen.add(c.stage)
    }
    return [...seen]
  })

  // --- per-stage layout ---------------------------------------------------
  // A stage = the traced steps whose term is a concept of that stage. Depth-0
  // containers unfold their depth-1 children as the pipeline, in call order;
  // children keep whatever term they own (Relation sediment happens INSIDE
  // perception). Concept nodes annotate what each step writes.
  const stageLayout = (g: MindMapGraph, stageName: string) => {
    const nodes: Node<MapNodeData>[] = []
    const edges: Edge[] = []
    const push = (id: string, x: number, y: number, data: MapNodeData) =>
      nodes.push({ id, type: 'map', position: { x, y }, data })
    const e = (id: string, source: string, target: string, cls = '') =>
      edges.push({ id, source, target, class: cls })
    const tip = (term?: string) =>
      term && g.glossary[term] ? g.glossary[term] : undefined
    const lives = (term?: string) =>
      term && g.concepts[term]?.lives_in
        ? `lives in ${g.concepts[term].lives_in}` : undefined
    const stageOf = (term: string) => g.concepts[term]?.stage
    const fnStep = (fn: string) => g.steps.find((s) => s.fn === fn)

    const seg = [...g.trace.open, ...g.trace.close]
    // Steps record on EXIT: a container's children land right before it —
    // the contiguous depth>0 run ending at the container entry.
    let y = 110
    for (let i = 0; i < seg.length; i++) {
      const entry = seg[i]
      const fn = entry.fn.split('.').pop()!
      if (entry.depth !== 0 || stageOf(entry.term) !== stageName) continue

      const span: MindMapTrace[] = []
      for (let j = i - 1; j >= 0 && seg[j].depth > 0; j--)
        span.unshift(seg[j])
      const children: MindMapTrace[] = []
      const seen = new Set<string>()
      for (const t of span) {
        const cfn = t.fn.split('.').pop()!
        if (seen.has(cfn)) continue
        seen.add(cfn)
        children.push(t)
      }

      push(`st-head-${fn}`, 0, y - 60, {
        kind: 'lane',
        title: `${entry.term} — ${fn}()`,
        tip: tip(entry.term), meta: lives(entry.term),
      })
      // in → children chain → out
      push(`st-in-${fn}`, 0, y, {
        kind: 'io', title: 'in', sub: 'the stage reads',
        example: entry.in,
      })
      let prev = `st-in-${fn}`
      children.forEach((t, k) => {
        const cfn = t.fn.split('.').pop()!
        const x = 300 + k * 280
        push(`st-${fn}-${cfn}`, x, y, {
          kind: 'step', title: t.term, sub: cfn,
          tip: tip(t.term), meta: lives(t.term),
          example: { in: t.in, out: t.out },
          rules: (g.test_rules[cfn] || []).slice(0, 6),
        })
        e(`st-e-${fn}-${cfn}`, prev, `st-${fn}-${cfn}`)
        prev = `st-${fn}-${cfn}`
        // What the step writes → a concept card below it.
        const writes = (fnStep(cfn)?.writes || [])
          .filter((w) => w !== t.term)
        writes.forEach((w, m) => {
          const wid = `st-w-${fn}-${cfn}-${w}`
          push(wid, x, y + 170 + m * 100, {
            kind: 'concept', title: w,
            tip: tip(w), meta: lives(w),
          })
          e(`st-we-${fn}-${cfn}-${w}`, `st-${fn}-${cfn}`, wid, 'reads')
        })
      })
      const ox = 300 + Math.max(children.length, 1) * 280
      push(`st-out-${fn}`, ox, y, {
        kind: 'io', title: 'out', sub: entry.term,
        tip: tip(entry.term), meta: lives(entry.term),
        example: entry.out,
      })
      e(`st-oe-${fn}`, prev, `st-out-${fn}`)
      y += 170 + Math.max(
        ...children.map((t) =>
          (fnStep(t.fn.split('.').pop()!)?.writes || []).length),
        1) * 100 + 140
    }

    // Stage concepts not drawn anywhere yet — the fields the stage computes
    // inside its container without a step of their own (Salience, Novelty,
    // Recurrence) sit in a bottom row.
    const drawn = new Set(
      nodes.filter((n) => n.data?.kind !== 'io').map((n) => n.data?.title))
    const orphans = Object.entries(g.concepts)
      .filter(([n, c]) => c.stage === stageName && !drawn.has(n))
      .map(([n]) => n)
    orphans.forEach((n, i) => {
      push(`st-orphan-${n}`, 300 + i * 280, y, {
        kind: 'concept', title: n,
        tip: tip(n), meta: lives(n),
      })
    })
    return { nodes, edges }
  }

  const nodes = computed<Node<MapNodeData>[]>(() => {
    const g = graph.value
    if (!g) return []
    return stageLayout(g, stage.value).nodes
  })

  const edges = computed<Edge[]>(() => {
    const g = graph.value
    if (!g) return []
    return stageLayout(g, stage.value).edges
  })

  return { graph, error, loading, nodes, edges, fmt, stage, stages }
}
