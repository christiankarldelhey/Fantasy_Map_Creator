// ---------------------------------------------------------------------------
// Mover crossings — the Living Map rail.
//
// mover_legs is the authored agenda: where a being is, and when. Each in-world
// day this service turns active legs into concrete events along the traveller's
// path:
//
//   march     — the mover sits at today's baked trail point. Within
//               contact_radius_km → Crossing; within notice_radius_km → Trace.
//               visibility 'signs' caps it at Trace, 'hidden' silences it.
//   resident  — anchored to a place. Met when the traveller sleeps there;
//               greeting=true also fires on pass-through near the place.
//   presence  — roams a region: not a point but a pool entry. Injected into
//               the phase encounter pool at the leg's level (+ road_bias).
//
// Voice lives in entities_narration contacts scoped by mover_leg_id
// (aspect = the Trace, variants = the Crossing). This module only decides
// WHAT happened; the contact says what it felt like.
// ---------------------------------------------------------------------------
import pool from '../../../../db.js';

const EARTH_RADIUS_KM = 6371;

function haversineKm([lng1, lat1], [lng2, lat2]) {
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

// Legs live on the in-world date: every leg whose window covers `dateISO`,
// with the being (entities), the anchor point (locations), and its authored
// contact (entities_narration scoped by mover_leg_id).
export async function loadActiveLegs(dateISO) {
  const { rows } = await pool.query(
    `SELECT l.id AS leg_id, l.entity_id, l.kind AS leg_kind, l.leg_index,
            l.region_id, l.location_id, l.location_type, l.level, l.road_bias,
            l.notice_radius_km, l.contact_radius_km, l.visibility, l.greeting,
            l.active_phases, l.hostile,
            e.slug AS entity_slug, e.name AS entity_name,
            e.type AS entity_type, e.danger, e.shadow_weight, e.active,
            COALESCE(e.family, p.slug) AS family,
            ST_X(loc.geom) AS loc_lng, ST_Y(loc.geom) AS loc_lat,
            n.id AS contact_id, n.aspect, n.variants, n.disposition, n.facts,
            n.interactive, n.tags AS contact_tags, n.priority
       FROM mover_legs l
       JOIN entities e ON e.id = l.entity_id
       LEFT JOIN entities p ON p.id = e.parent_id
       LEFT JOIN locations loc ON loc.id = l.location_id
       LEFT JOIN entities_narration n
              ON n.mover_leg_id = l.id AND n.kind = 'contact'
      WHERE $1::date BETWEEN l.date_from AND l.date_to`,
    [dateISO]
  );
  return rows;
}

// Today's baked position of every march leg (mover_trails is resampled per day).
export async function marchPositions(dateISO) {
  const { rows } = await pool.query(
    `SELECT leg_id, ST_X(geom) AS lng, ST_Y(geom) AS lat
       FROM mover_trails WHERE date = $1::date`,
    [dateISO]
  );
  return new Map(rows.map((r) => [r.leg_id, [r.lng, r.lat]]));
}

const GREETING_RADIUS_KM = 0.75;

/**
 * Deterministic crossings and traces along the day's walked path.
 *
 * @param {Object[]} legs - rows from loadActiveLegs()
 * @param {Map} trailsByLeg - leg_id → [lng,lat] today (marchPositions)
 * @param {Object[]} dayPath - [{lng, lat, hour_float, phase, region, region_id}]
 * @param {Object|null} overnightLocation - where the day ends (resident rail)
 * @param {number} arrivalHourFloat - when the traveller reaches the stop
 * @returns {{crossings: Object[], traces: Object[]}}
 */
export function detectMoverCrossings({ legs, trailsByLeg, dayPath, overnightLocation, arrivalHourFloat }) {
  const crossings = [];
  const traces = [];

  const pathInPhases = (leg) =>
    dayPath.filter((p) => !p.phase || leg.active_phases.includes(p.phase));

  for (const leg of legs) {
    if (leg.visibility === 'hidden' && leg.leg_kind !== 'resident') continue;

    if (leg.leg_kind === 'march') {
      const pos = trailsByLeg.get(leg.leg_id);
      if (!pos) continue;
      let best = null;
      for (const p of pathInPhases(leg)) {
        const d = haversineKm([p.lng, p.lat], pos);
        if (!best || d < best.dist) best = { dist: d, point: p };
      }
      if (!best) continue;
      const base = { leg, hour_float: best.point.hour_float, phase: best.point.phase, region: best.point.region, region_id: best.point.region_id };
      const contactKm = Number(leg.contact_radius_km);
      const noticeKm = Number(leg.notice_radius_km);
      if (leg.visibility === 'visible' && Number.isFinite(contactKm) && best.dist <= contactKm) {
        crossings.push(base);
      } else if (Number.isFinite(noticeKm) && best.dist <= noticeKm) {
        traces.push(base);
      }
    }

    if (leg.leg_kind === 'resident') {
      const locMatch = overnightLocation && (
        (leg.location_id != null && overnightLocation.id === leg.location_id) ||
        (leg.location_id == null && leg.location_type && overnightLocation.type === leg.location_type)
      );
      if (locMatch) {
        crossings.push({ leg, hour_float: arrivalHourFloat, phase: 'before_sleep', region: overnightLocation.region ?? null, region_id: overnightLocation.region_id ?? null });
        continue;
      }
      // greeting: fires even on pass-through near the place
      if (leg.greeting && leg.loc_lng != null) {
        let best = null;
        for (const p of pathInPhases(leg)) {
          const d = haversineKm([p.lng, p.lat], [leg.loc_lng, leg.loc_lat]);
          if (!best || d < best.dist) best = { dist: d, point: p };
        }
        if (best && best.dist <= GREETING_RADIUS_KM) {
          crossings.push({ leg, hour_float: best.point.hour_float, phase: best.point.phase, region: best.point.region, region_id: best.point.region_id });
        }
      }
    }
  }

  return { crossings, traces };
}

/**
 * Presence legs as pool entries for a region step: synthetic entity rows
 * carrying a probability_by_region at the leg's level (+ road_bias delta).
 * The _moverLeg marker routes resolution to the leg contact.
 */
export function presencePoolEntries(legs, { regionName, regionId, road_type, phase }) {
  const out = [];
  for (const leg of legs) {
    if (leg.leg_kind !== 'presence') continue;
    if (leg.region_id == null || Number(leg.region_id) !== Number(regionId)) continue;
    if (!leg.active_phases.includes(phase)) continue;
    const bias = Number(leg.road_bias?.[road_type] ?? 0);
    out.push({
      id: leg.entity_id,
      name: leg.entity_name,
      slug: leg.entity_slug,
      type: leg.entity_type,
      active: leg.active ?? 'all-day',
      danger: leg.danger,
      family: leg.family ?? null,
      shadow_weight: leg.shadow_weight ?? 0,
      probability_by_region: [{ region: regionName, probability: Number(leg.level ?? 1) + bias }],
      _moverLeg: leg,
    });
  }
  return out;
}
