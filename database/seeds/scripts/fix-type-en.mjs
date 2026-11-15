#!/usr/bin/env node
// Fill `en` in places_narration-style type objects that only carry `es`.
// Rule: single-word vocabulary values live in English; `es` keeps the
// Spanish gloss. Applies to data/json/places.json (the authored source).
// The same map is embedded in fix_places_narration_nested_lang.sql for
// the DB-side backfill (anchored rows preserve type through reseeds).
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(__dirname, '../data/json/places.json');

export const ES_TYPE_EN = {
  // settlements
  'pueblo': 'town', 'aldea': 'village', 'caserío': 'hamlet',
  'ciudad': 'city', 'municipio': 'municipality',
  'pueblo de mercado': 'market town', 'pueblo minero': 'mining town',
  'pueblo pesquero': 'fishing town', 'pueblo costero': 'coastal town',
  'aldea de pescadores': 'fishing village', 'aldea pesquera': 'fishing village',
  'aldea costera': 'coastal village', 'aldea fluvial': 'river village',
  'aldea de montaña': 'mountain village', 'pueblo fronterizo': 'border town',
  'aldea fortificada': 'fortified village', 'pueblo fortificado': 'fortified village',
  'ciudad fortificada': 'fortified city', 'pueblo-guarnición': 'garrison village',
  'pueblo de guarnición': 'garrison town', 'posta-guarnición': 'garrison post',
  'pueblo-templo': 'temple town', 'aldea de clan': 'clan village',
  'aldea dividida': 'divided village', 'aldea recelosa': 'wary village',
  'aldea remanente': 'surviving village', 'pueblo deshabitado': 'abandoned town',
  'pueblo semiocupado': 'half-occupied town', 'pueblo en declive': 'declining town',
  'asentamiento repoblado': 'resettled settlement',
  'aldea de suministro': 'supply village', 'pueblo de turbera': 'peat village',
  'aldea del vado': 'ford village', 'pueblo del guardián': 'warden village',
  // seats, manors, hobbit & elven settlements
  'solar': 'seat', 'solar hobbit': 'hobbit seat', 'solar en declive': 'declining seat',
  'casa señorial': 'manor house', 'smial': 'smial',
  'aldea hobbit': 'hobbit village', 'asentamiento élfico': 'elven settlement',
  'aldea élfica': 'elven village', 'ciudad élfica': 'elven city',
  'claro élfico': 'elven clearing', 'puerto élfico': 'elven port',
  'ciudad-puerto élfica': 'elven port city', 'torre élfica': 'elven tower',
  // military
  'castillo': 'castle', 'fortaleza': 'fortress', 'ciudadela': 'citadel',
  'torre': 'tower', 'torreón': 'keep', 'torre de vigilancia': 'watchtower',
  'torre de almenara': 'beacon tower', 'almenara': 'beacon',
  'atalaya enemiga': 'enemy watchtower', 'puesto enemigo': 'enemy post',
  'fortaleza enemiga': 'enemy fortress', 'fortaleza-capital enemiga': 'enemy capital fortress',
  'castillo enemigo': 'enemy castle', 'aldea enemiga': 'enemy village',
  'plaza orca ocupada': 'occupied orc hold',
  'castillo-guarnición': 'garrison castle', 'castillo-asentamiento': 'castle settlement',
  'castillo-hacienda': 'castle estate', 'castillo fronterizo': 'border castle',
  'fortaleza de clan': 'clan fortress', 'fortaleza del paso': 'pass fortress',
  'fortaleza oscura': 'dark fortress', 'fortaleza en ruinas': 'ruined fortress',
  'ciudadela enana tomada': 'taken dwarven citadel', 'castillo deshabitado': 'abandoned castle',
  // half-occupied
  'fuerte semiocupado': 'half-occupied fort', 'torre semiocupada': 'half-occupied tower',
  'ciudadela semiocupada': 'half-occupied citadel', 'fortaleza semiocupada': 'half-occupied fortress',
  'posada semiocupada': 'half-occupied inn', 'casa semiocupada': 'half-occupied house',
  'puesto semiocupado': 'half-occupied post',
  // ruins
  'ruina': 'ruin', 'ruinas': 'ruins', 'ruinas de aldea': 'village ruins',
  'ruinas de pueblo': 'town ruins', 'ruinas de ciudad': 'city ruins',
  'ruinas de torre': 'tower ruins', 'ruinas de castillo': 'castle ruins',
  'ruinas de fortaleza': 'fortress ruins', 'ruinas de posada': 'inn ruins',
  'ruinas de atalaya': 'watchtower ruins', 'ruinas de hacienda': 'estate ruins',
  'ruinas de casa señorial': 'manor ruins', 'ruinas de ciudad-portuaria': 'port city ruins',
  'ruina habitada': 'inhabited ruin', 'ruina maldita': 'cursed ruin',
  'ruinas élficas': 'elven ruins', 'ruinas nando': 'nando ruins',
  'ciudad en ruinas': 'ruined city',
  // camps & lodging
  'campamento': 'camp', 'campamento fluvial': 'river camp',
  'campamento ocasional': 'occasional camp', 'posada': 'inn',
  'posada de camino': 'wayside inn', 'posada-forja': 'inn-forge',
  'posada remanente': 'surviving inn', 'puente-posada': 'bridge inn',
  // industry & trade
  'puesto comercial': 'trading post', 'puesto del vado': 'ford post',
  'aserradero': 'sawmill', 'astillero': 'shipyard',
  'mina': 'mine', 'mina-ciudad': 'mine-city', 'mina-fortaleza': 'mine-fortress',
  // landscape & misc
  'bosque': 'forest', 'bosque pantanoso': 'marshy forest', 'cascada': 'waterfall',
  'lago': 'lake', 'colina': 'hill', 'páramo': 'moor', 'caverna': 'cavern',
  'puerto': 'port', 'aldea portuaria': 'port village', 'pueblo portuario': 'port village',
  'torre-puerto': 'tower-port', 'pueblo-portuaria': 'port town',
  'cabo-almenara': 'beacon cape', 'vado histórico': 'historic ford',
  'paso de montaña': 'mountain pass', 'paso montañoso': 'mountain pass',
  'terreno ritual': 'ritual ground', 'punto de interés': 'point of interest',
  'torre-casa de sanadores': "healer's tower-house", 'casa-faro': 'lighthouse house',
  'casa deshabitada': 'abandoned house',
};

const doc = JSON.parse(await fs.readFile(FILE, 'utf8'));
let filled = 0;
const missing = new Set();
for (const r of doc.records) {
  const t = r.type;
  if (t && typeof t === 'object' && !t.en && t.es) {
    const en = ES_TYPE_EN[t.es];
    if (en) { t.en = en; filled++; }
    else missing.add(t.es);
  }
}
await fs.writeFile(FILE, JSON.stringify(doc, null, 1) + '\n', 'utf8');
console.log(`filled en for ${filled} records` +
  (missing.size ? ` — UNMAPPED es values: ${[...missing].join(', ')}` : ''));
