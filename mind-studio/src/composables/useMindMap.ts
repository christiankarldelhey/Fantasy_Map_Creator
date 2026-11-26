// useMindMap — fetch graph.json and lay it out as one explorable canvas:
// WORLD (the Host) → the Open contract → its parts → the anatomy of an
// Event → the kinds it can be; then INSIDE THE MIND — the traced step
// chain for open → narrate → close. Every node carries the real golden-day
// data it transformed; every step names a glossary Concept.
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

const X = { world: 0, contract: 300, part: 620, anatomy: 940, kind: 1260 }
const Y = { lane1: 0, world: 80, steps: 860, close: 1120 }
const PART_CONCEPT: Record<string, string> = {
  events: 'Event', character: 'Character', condition: 'Condition',
  fate: 'Fate', arc: 'Arc', episode: 'Episode', language: 'Inner language',
}

const fmt = (v: unknown, cap = 1400): string => {
  const s = JSON.stringify(v, null, 1)
  return s.length > cap ? s.slice(0, cap) + '\n…' : s
}

export function useMindMap() {
  const graph: Ref<MindMapGraph | null> = ref(null)
  const error = ref<string | null>(null)
  const loading = ref(true)
  const stage = ref<string>('overview')

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
    if (stage.value !== 'overview') return stageLayout(g, stage.value).nodes
    const out: Node<MapNodeData>[] = []
    const push = (id: string, x: number, y: number, data: MapNodeData) =>
      out.push({ id, type: 'map', position: { x, y }, data })

    const tip = (term?: string) =>
      term && g.glossary[term] ? g.glossary[term] : undefined
    const lives = (term?: string) =>
      term && g.concepts[term]?.lives_in
        ? `lives in ${g.concepts[term].lives_in}` : undefined

    // --- WORLD lane -----------------------------------------------------
    push('lane-world', X.world, Y.lane1, {
      kind: 'lane', title: 'WORLD — the Host speaks the contract',
    })
    push('world', X.world, Y.world, {
      kind: 'world', title: 'World',
      tip: 'The Host — reports what happened, already verbalized. Never decides how it was lived.',
    })
    push('open', X.contract, Y.world - 60, {
      kind: 'contract', title: 'Open', sub: 'POST /episodes',
      example: g.request,
    })
    push('narrate', X.contract, Y.world + 160, {
      kind: 'contract', title: 'Narrate', sub: 'POST /episodes/{id}/narrate',
      example: g.prompt,
    })
    push('close', X.contract, Y.world + 380, {
      kind: 'contract', title: 'Close', sub: 'POST /episodes/{id}/close',
      example: g.trace.close.length ? { outcome: 'see close steps →' } : undefined,
    })

    // --- contract parts --------------------------------------------------
    const parts = ['events', 'character', 'condition', 'fate', 'arc', 'episode', 'language']
      .filter((k) => k in g.request)
    parts.forEach((key, i) => {
      const concept = PART_CONCEPT[key]
      push(`part-${key}`, X.part, Y.world - 120 + i * 92, {
        kind: 'part', title: key, sub: concept,
        tip: tip(concept), meta: lives(concept),
        example: g.request[key],
      })
    })

    // --- event anatomy ----------------------------------------------------
    const events = (g.request.events || []) as Record<string, any>[]
    const sample = events[0] || {}
    const anatomy = Object.keys(sample).filter((k) => sample[k] != null)
    anatomy.forEach((key, i) => {
      push(`an-${key}`, X.anatomy, Y.world - 120 + i * 92, {
        kind: 'part', title: key, sub: 'event field',
        example: sample[key],
      })
    })

    // --- kinds ------------------------------------------------------------
    const kinds = [...new Set(events.map((e) => e.type))] as string[]
    kinds.forEach((k, i) => {
      push(`kind-${k}`, X.kind, Y.world - 80 + i * 84, {
        kind: 'kind', title: k,
        example: events.find((e) => e.type === k),
      })
    })

    // --- the mind: traced chains -------------------------------------------
    const uniq = (seg: MindMapTrace[]) => {
      const seen = new Set<string>()
      return seg.filter((e) => {
        const fn = e.fn.split('.').pop()!
        if (seen.has(fn)) return false
        seen.add(fn)
        return true
      })
    }

    push('lane-mind', 0, Y.steps - 90, {
      kind: 'lane',
      title: `INSIDE THE MIND — ${g.meta.golden_day?.label || 'golden day'}`,
    })

    const openChain = uniq(g.trace.flow.open)
    openChain.forEach((e, i) => {
      const fn = e.fn.split('.').pop()!
      push(`s-${fn}`, 0 + i * 250, Y.steps, {
        kind: 'step', title: e.term, sub: fn,
        tip: tip(e.term), meta: lives(e.term),
        example: { in: e.in, out: e.out },
        rules: (g.test_rules[fn] || []).slice(0, 8),
      })
    })

    const nx = openChain.length * 250
    push('s-narrate_day', nx, Y.steps, {
      kind: 'step', title: 'Inner language', sub: 'narrate_day',
      tip: tip('Inner language'), meta: lives('Inner language'),
      example: { prompt: g.prompt },
      rules: (g.test_rules['narrate_day'] || []).slice(0, 8),
    })

    const closeChain = uniq(g.trace.flow.close)
    closeChain.forEach((e, i) => {
      const fn = e.fn.split('.').pop()!
      push(`c-${fn}`, 0 + i * 250, Y.close, {
        kind: 'step', title: e.term, sub: fn,
        tip: tip(e.term), meta: lives(e.term),
        example: { in: e.in, out: e.out },
        rules: (g.test_rules[fn] || []).slice(0, 8),
      })
    })
    return out
  })

  const edges = computed<Edge[]>(() => {
    const g = graph.value
    if (!g) return []
    if (stage.value !== 'overview') return stageLayout(g, stage.value).edges
    const out: Edge[] = []
    const e = (id: string, source: string, target: string, cls = '') =>
      out.push({ id, source, target, class: cls })

    e('w-open', 'world', 'open')
    const parts = nodes.value
      .filter((n) => n.id.startsWith('part-')).map((n) => n.id)
    parts.forEach((p) => e(`open-${p}`, 'open', p))
    nodes.value.filter((n) => n.id.startsWith('an-'))
      .forEach((a) => e(`ev-${a.id}`, 'part-events', a.id))
    nodes.value.filter((n) => n.id.startsWith('kind-'))
      .forEach((k) => e(`type-${k.id}`, 'an-type', k.id))

    // Contract → steps: narrate feeds the narration step, close feeds the
    // close chain.
    if (nodes.value.some((n) => n.id === 's-narrate_day'))
      e('narrate-step', 'narrate', 's-narrate_day', 'cross')
    const closeFirst = g.trace.flow.close[0]
    if (closeFirst)
      e('close-step', 'close', `c-${closeFirst.fn.split('.').pop()}`, 'cross')

    // parts → the steps that read that concept (the semantic link)
    const flowFns = new Set(
      [...g.trace.flow.open, ...g.trace.flow.close]
        .map((t) => t.fn.split('.').pop()!))
    for (const s of g.steps) {
      if (!flowFns.has(s.fn)) continue
      const chain = g.trace.flow.open.some(
        (t) => t.fn.split('.').pop() === s.fn) ? 's' : 'c'
      for (const r of s.reads || []) {
        const part = Object.entries(PART_CONCEPT)
          .find(([, c]) => c === r)?.[0]
        if (part && nodes.value.some((n) => n.id === `part-${part}`))
          e(`reads-${part}-${s.fn}`, `part-${part}`, `${chain}-${s.fn}`, 'reads')
      }
    }

    // the traced order itself
    const chain = (seg: MindMapTrace[], p: string) => {
      let prev: string | null = null
      const seen = new Set<string>()
      for (const t of seg) {
        const fn = t.fn.split('.').pop()!
        if (seen.has(fn)) continue
        seen.add(fn)
        if (prev) e(`flow-${p}-${prev}-${fn}`, `${p}-${prev}`, `${p}-${fn}`)
        prev = `${p}-${fn}`
      }
      return prev
    }
    const lastOpen = chain(g.trace.flow.open, 's')
    if (lastOpen) e('flow-narrate', lastOpen, 's-narrate_day')
    const firstClose = g.trace.flow.close[0]
    if (firstClose)
      e('flow-to-close', 's-narrate_day',
        `c-${firstClose.fn.split('.').pop()}`)
    chain(g.trace.flow.close, 'c')
    return out
  })

  return { graph, error, loading, nodes, edges, fmt, stage, stages }
}
