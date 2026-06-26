import { getDistance } from './routing.js';

// ============================================================================
// Trip geometry helpers (pure functions)
// ----------------------------------------------------------------------------
// Turn a computed route (output of services/routing.js computeRoute) into a
// flat, time-ordered list of 2-point segments, and provide helpers to slice
// the route into a single day's leg based on walking time.
// ============================================================================

/**
 * Classify a road/segment name into a coarse travel type.
 * @param {string} name
 * @param {string} type - 'on_road' | 'off_road'
 * @returns {'road_major'|'road'|'trail'|'off_road'}
 */
export function classifyRoadType(name, type) {
  if (type === 'off_road') return 'off_road';
  if (typeof name === 'string') {
    const n = name.toLowerCase();
    if (n.includes('trail')) return 'trail';
    if (n.includes('royal') || n.includes('main')) return 'road_major';
  }
  return 'road';
}

/**
 * Flatten a route into an ordered array of 2-point segments with travel time.
 * @param {Object} route - computeRoute output
 * @returns {Array<{from:number[], to:number[], seconds:number, distance_m:number,
 *                   road_name:string, road_type:string, biome_type:string,
 *                   altitude_type:string, kind:string}>}
 */
export function flattenRoute(route) {
  const segments = [];
  if (!route || !route.geometry) return segments;

  const pushLineString = (geometry, props, kind) => {
    if (!geometry || !Array.isArray(geometry.coordinates)) return;
    const coords = geometry.coordinates;
    const totalSeconds = Number(props.travel_time_seconds) || 0;

    // Compute total length to distribute seconds across sub-pairs.
    let totalLen = 0;
    const pairLens = [];
    for (let i = 0; i < coords.length - 1; i++) {
      const len = getDistance(coords[i], coords[i + 1]);
      pairLens.push(len);
      totalLen += len;
    }

    for (let i = 0; i < coords.length - 1; i++) {
      const len = pairLens[i];
      const seconds = totalLen > 0 ? totalSeconds * (len / totalLen) : 0;
      segments.push({
        from: coords[i],
        to: coords[i + 1],
        seconds,
        distance_m: len,
        road_name: props.name || (kind === 'off_road' ? 'off_road' : 'Regular Road'),
        road_type: classifyRoadType(props.name, kind),
        biome_type: props.biome_type || 'plain',
        altitude_type: props.altitude_type || 'plain',
        kind,
      });
    }
  };

  const g = route.geometry;
  if (g.off_road_start) pushLineString(g.off_road_start.geometry, g.off_road_start.properties || {}, 'off_road');
  if (g.on_road && Array.isArray(g.on_road.features)) {
    for (const f of g.on_road.features) {
      pushLineString(f.geometry, f.properties || {}, 'on_road');
    }
  }
  if (g.off_road_end) pushLineString(g.off_road_end.geometry, g.off_road_end.properties || {}, 'off_road');

  return segments;
}

/**
 * Linear interpolation between two [lng, lat] points.
 */
export function interpolate(a, b, f) {
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}

/**
 * Total travel time (seconds) of all segments.
 */
export function totalSeconds(segments) {
  return segments.reduce((sum, s) => sum + s.seconds, 0);
}

/**
 * Position [lng, lat] along the route at a given cumulative travel time.
 */
export function positionAtSeconds(segments, s) {
  if (segments.length === 0) return null;
  if (s <= 0) return segments[0].from;

  let acc = 0;
  for (const seg of segments) {
    if (s <= acc + seg.seconds) {
      const f = seg.seconds > 0 ? (s - acc) / seg.seconds : 0;
      return interpolate(seg.from, seg.to, f);
    }
    acc += seg.seconds;
  }
  return segments[segments.length - 1].to;
}

/**
 * Extract a single day's leg between two cumulative-time bounds.
 *
 * @returns {{
 *   coordinates: number[][],
 *   segments: Array,            // segments overlapping the window (with overlap_seconds)
 *   start: number[],
 *   end: number[],
 *   distance_m: number,
 *   seconds: number,
 *   roadTypeBreakdown: Object   // { road: meters, trail: meters, off_road: meters }
 * }}
 */
export function sliceLeg(segments, startS, endS) {
  const start = positionAtSeconds(segments, startS);
  const end = positionAtSeconds(segments, endS);

  const coords = [start];
  const legSegments = [];
  const roadTypeBreakdown = {};
  let distance = 0;

  let acc = 0;
  for (const seg of segments) {
    const segStart = acc;
    const segEnd = acc + seg.seconds;
    acc = segEnd;

    // Overlap between [segStart, segEnd] and [startS, endS]
    const overlapStart = Math.max(segStart, startS);
    const overlapEnd = Math.min(segEnd, endS);
    if (overlapEnd <= overlapStart) continue;

    const overlapSeconds = overlapEnd - overlapStart;
    const fraction = seg.seconds > 0 ? overlapSeconds / seg.seconds : 0;
    const overlapDistance = seg.distance_m * fraction;
    distance += overlapDistance;

    roadTypeBreakdown[seg.road_type] = (roadTypeBreakdown[seg.road_type] || 0) + overlapDistance;

    legSegments.push({ ...seg, overlap_seconds: overlapSeconds, overlap_distance_m: overlapDistance });

    // Add the segment endpoint vertex when it falls strictly inside the window
    if (segEnd > startS && segEnd < endS) {
      coords.push(seg.to);
    }
  }

  coords.push(end);

  // Dedupe consecutive identical coordinates
  const cleaned = coords.filter((c, i) => i === 0 || c[0] !== coords[i - 1][0] || c[1] !== coords[i - 1][1]);

  return {
    coordinates: cleaned,
    segments: legSegments,
    start,
    end,
    distance_m: distance,
    seconds: Math.max(0, Math.min(endS, totalSeconds(segments)) - startS),
    roadTypeBreakdown,
  };
}
