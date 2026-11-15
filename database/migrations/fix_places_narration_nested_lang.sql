-- fix_places_narration_nested_lang.sql
-- Unwrap pathological {en:{en:{en:…}}} nesting in places_narration.type/name.
--
-- Cause: early writes stored type/name as {en: <previous object>} instead of
-- the scalar, and preserveSpatial keeps `type` for anchored rows — so the
-- corruption froze in the DB while the JSON sources healed long ago.
-- All corrupted rows sit under a finite en-chain ending in a real {en,es}
-- leaf; walk it and keep the innermost object.
--
-- Idempotent: after one pass no row has type->'en' of type 'object'.

DO $$
BEGIN
  -- type
  WITH RECURSIVE un AS (
    SELECT id, type AS v, 0 AS d FROM places_narration
     WHERE type IS NOT NULL AND jsonb_typeof(type->'en') = 'object'
    UNION ALL
    SELECT id, v->'en', d + 1 FROM un
     WHERE jsonb_typeof(v->'en') = 'object' AND d < 100
  )
  UPDATE places_narration p SET type = leaf.v
    FROM (SELECT DISTINCT ON (id) id, v FROM un ORDER BY id, d DESC) leaf
   WHERE p.id = leaf.id;

  -- name
  WITH RECURSIVE un AS (
    SELECT id, name AS v, 0 AS d FROM places_narration
     WHERE name IS NOT NULL AND jsonb_typeof(name->'en') = 'object'
    UNION ALL
    SELECT id, v->'en', d + 1 FROM un
     WHERE jsonb_typeof(v->'en') = 'object' AND d < 100
  )
  UPDATE places_narration p SET name = leaf.v
    FROM (SELECT DISTINCT ON (id) id, v FROM un ORDER BY id, d DESC) leaf
   WHERE p.id = leaf.id;
END $$;

-- type.es → type.en backfill. type is vocabulary, not prose: the English
-- word must exist. ~300 anchored records preserve their type through
-- reseeds, so the JSON fix alone never reaches the DB. Same map as
-- database/seeds/scripts/fix-type-en.mjs (keep them in sync).
UPDATE places_narration p
   SET type = jsonb_build_object('en', m.en, 'es', p.type->>'es')
  FROM (VALUES
    ($$pueblo$$, $$town$$),
    ($$aldea$$, $$village$$),
    ($$caserío$$, $$hamlet$$),
    ($$ciudad$$, $$city$$),
    ($$municipio$$, $$municipality$$),
    ($$pueblo de mercado$$, $$market town$$),
    ($$pueblo minero$$, $$mining town$$),
    ($$pueblo pesquero$$, $$fishing town$$),
    ($$pueblo costero$$, $$coastal town$$),
    ($$aldea de pescadores$$, $$fishing village$$),
    ($$aldea pesquera$$, $$fishing village$$),
    ($$aldea costera$$, $$coastal village$$),
    ($$aldea fluvial$$, $$river village$$),
    ($$aldea de montaña$$, $$mountain village$$),
    ($$pueblo fronterizo$$, $$border town$$),
    ($$aldea fortificada$$, $$fortified village$$),
    ($$pueblo fortificado$$, $$fortified village$$),
    ($$ciudad fortificada$$, $$fortified city$$),
    ($$pueblo-guarnición$$, $$garrison village$$),
    ($$pueblo de guarnición$$, $$garrison town$$),
    ($$posta-guarnición$$, $$garrison post$$),
    ($$pueblo-templo$$, $$temple town$$),
    ($$aldea de clan$$, $$clan village$$),
    ($$aldea dividida$$, $$divided village$$),
    ($$aldea recelosa$$, $$wary village$$),
    ($$aldea remanente$$, $$surviving village$$),
    ($$pueblo deshabitado$$, $$abandoned town$$),
    ($$pueblo semiocupado$$, $$half-occupied town$$),
    ($$pueblo en declive$$, $$declining town$$),
    ($$asentamiento repoblado$$, $$resettled settlement$$),
    ($$aldea de suministro$$, $$supply village$$),
    ($$pueblo de turbera$$, $$peat village$$),
    ($$aldea del vado$$, $$ford village$$),
    ($$pueblo del guardián$$, $$warden village$$),
    ($$solar$$, $$seat$$),
    ($$solar hobbit$$, $$hobbit seat$$),
    ($$solar en declive$$, $$declining seat$$),
    ($$casa señorial$$, $$manor house$$),
    ($$smial$$, $$smial$$),
    ($$aldea hobbit$$, $$hobbit village$$),
    ($$asentamiento élfico$$, $$elven settlement$$),
    ($$aldea élfica$$, $$elven village$$),
    ($$ciudad élfica$$, $$elven city$$),
    ($$claro élfico$$, $$elven clearing$$),
    ($$puerto élfico$$, $$elven port$$),
    ($$ciudad-puerto élfica$$, $$elven port city$$),
    ($$torre élfica$$, $$elven tower$$),
    ($$castillo$$, $$castle$$),
    ($$fortaleza$$, $$fortress$$),
    ($$ciudadela$$, $$citadel$$),
    ($$torre$$, $$tower$$),
    ($$torreón$$, $$keep$$),
    ($$torre de vigilancia$$, $$watchtower$$),
    ($$torre de almenara$$, $$beacon tower$$),
    ($$almenara$$, $$beacon$$),
    ($$atalaya enemiga$$, $$enemy watchtower$$),
    ($$puesto enemigo$$, $$enemy post$$),
    ($$fortaleza enemiga$$, $$enemy fortress$$),
    ($$fortaleza-capital enemiga$$, $$enemy capital fortress$$),
    ($$castillo enemigo$$, $$enemy castle$$),
    ($$aldea enemiga$$, $$enemy village$$),
    ($$plaza orca ocupada$$, $$occupied orc hold$$),
    ($$castillo-guarnición$$, $$garrison castle$$),
    ($$castillo-asentamiento$$, $$castle settlement$$),
    ($$castillo-hacienda$$, $$castle estate$$),
    ($$castillo fronterizo$$, $$border castle$$),
    ($$fortaleza de clan$$, $$clan fortress$$),
    ($$fortaleza del paso$$, $$pass fortress$$),
    ($$fortaleza oscura$$, $$dark fortress$$),
    ($$fortaleza en ruinas$$, $$ruined fortress$$),
    ($$ciudadela enana tomada$$, $$taken dwarven citadel$$),
    ($$castillo deshabitado$$, $$abandoned castle$$),
    ($$fuerte semiocupado$$, $$half-occupied fort$$),
    ($$torre semiocupada$$, $$half-occupied tower$$),
    ($$ciudadela semiocupada$$, $$half-occupied citadel$$),
    ($$fortaleza semiocupada$$, $$half-occupied fortress$$),
    ($$posada semiocupada$$, $$half-occupied inn$$),
    ($$casa semiocupada$$, $$half-occupied house$$),
    ($$puesto semiocupado$$, $$half-occupied post$$),
    ($$ruina$$, $$ruin$$),
    ($$ruinas$$, $$ruins$$),
    ($$ruinas de aldea$$, $$village ruins$$),
    ($$ruinas de pueblo$$, $$town ruins$$),
    ($$ruinas de ciudad$$, $$city ruins$$),
    ($$ruinas de torre$$, $$tower ruins$$),
    ($$ruinas de castillo$$, $$castle ruins$$),
    ($$ruinas de fortaleza$$, $$fortress ruins$$),
    ($$ruinas de posada$$, $$inn ruins$$),
    ($$ruinas de atalaya$$, $$watchtower ruins$$),
    ($$ruinas de hacienda$$, $$estate ruins$$),
    ($$ruinas de casa señorial$$, $$manor ruins$$),
    ($$ruinas de ciudad-portuaria$$, $$port city ruins$$),
    ($$ruina habitada$$, $$inhabited ruin$$),
    ($$ruina maldita$$, $$cursed ruin$$),
    ($$ruinas élficas$$, $$elven ruins$$),
    ($$ruinas nando$$, $$nando ruins$$),
    ($$ciudad en ruinas$$, $$ruined city$$),
    ($$campamento$$, $$camp$$),
    ($$campamento fluvial$$, $$river camp$$),
    ($$campamento ocasional$$, $$occasional camp$$),
    ($$posada$$, $$inn$$),
    ($$posada de camino$$, $$wayside inn$$),
    ($$posada-forja$$, $$inn-forge$$),
    ($$posada remanente$$, $$surviving inn$$),
    ($$puente-posada$$, $$bridge inn$$),
    ($$puesto comercial$$, $$trading post$$),
    ($$puesto del vado$$, $$ford post$$),
    ($$aserradero$$, $$sawmill$$),
    ($$astillero$$, $$shipyard$$),
    ($$mina$$, $$mine$$),
    ($$mina-ciudad$$, $$mine-city$$),
    ($$mina-fortaleza$$, $$mine-fortress$$),
    ($$bosque$$, $$forest$$),
    ($$bosque pantanoso$$, $$marshy forest$$),
    ($$cascada$$, $$waterfall$$),
    ($$lago$$, $$lake$$),
    ($$colina$$, $$hill$$),
    ($$páramo$$, $$moor$$),
    ($$caverna$$, $$cavern$$),
    ($$puerto$$, $$port$$),
    ($$aldea portuaria$$, $$port village$$),
    ($$pueblo portuario$$, $$port village$$),
    ($$torre-puerto$$, $$tower-port$$),
    ($$pueblo-portuaria$$, $$port town$$),
    ($$cabo-almenara$$, $$beacon cape$$),
    ($$vado histórico$$, $$historic ford$$),
    ($$paso de montaña$$, $$mountain pass$$),
    ($$paso montañoso$$, $$mountain pass$$),
    ($$terreno ritual$$, $$ritual ground$$),
    ($$punto de interés$$, $$point of interest$$),
    ($$torre-casa de sanadores$$, $$healer's tower-house$$),
    ($$casa-faro$$, $$lighthouse house$$),
    ($$casa deshabitada$$, $$abandoned house$$)
  ) AS m(es, en)
 WHERE p.type->>'en' IS NULL
   AND p.type->>'es' = m.es;
