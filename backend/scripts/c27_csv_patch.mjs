// One-shot: add `commands` column (17) to npc_interactions.csv and author
// the C27 commands + stance rewrites. Idempotent: sets fields by header.
import fs from 'node:fs';

const PATH = process.argv[2] || '../database/seeds/data/csv/npc_interactions.csv';
const text = fs.readFileSync(PATH, 'utf8');

// Same CSV parser as load-seeds.js
function parseCsv(text) {
  const rows = [];
  let cur = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') { cur.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      cur.push(field); field = '';
      if (cur.length > 1 || cur[0] !== '') rows.push(cur);
      cur = [];
    } else field += ch;
  }
  if (field !== '' || cur.length) { cur.push(field); rows.push(cur); }
  return rows;
}

const esc = (f) => (/[",\n]/.test(f) ? `"${f.replace(/"/g, '""')}"` : f);

const COMMANDS = {
  '0a1d0004-0000-4000-8000-0a1d00000004': [{ type: 'meal', food: 'hot food at the farmhouse table' }, { type: 'item', slug: 'trail_rations', qty: 1 }],
  '0a1d0003-0000-4000-8000-0a1d00000003': [{ type: 'meal', food: 'what was left on the gate-stone' }, { type: 'water_refill' }],
  '0a1d0006-0000-4000-8000-0a1d00000006': [{ type: 'meal', food: 'a share of the pot' }],
  '0a1d0007-0000-4000-8000-0a1d00000007': [{ type: 'meal', food: 'new bread and honey', drink: 'the one good cup' }],
  '0a1d0012-0000-4000-8000-0a1d00000012': [{ type: 'meal', food: 'meat and ale at the bench' }, { type: 'item', slug: 'trail_rations', qty: 1 }],
  '0a1d0014-0000-4000-8000-0a1d00000014': [{ type: 'meal', food: 'bread, oil and olives' }],
  '0a1d0016-0000-4000-8000-0a1d00000016': [{ type: 'meal', food: "the household's hot food" }, { type: 'item', slug: 'common_arrows', qty: 8 }],
  '0a1d0017-0000-4000-8000-0a1d00000017': [{ type: 'meal', food: 'smoked fish and flat bread' }],
  '0a1d0018-0000-4000-8000-0a1d00000018': [{ type: 'meal', food: 'seal-meat at the fire' }],
  '0a1d0019-0000-4000-8000-0a1d00000019': [{ type: 'meal', food: 'a share of what is on the spit' }],
  '0a1d0001-0000-4000-8000-0a1d00000001': [{ type: 'meal', food: 'thin barley bread and a share of the pot' }],
  '0e1f0002-0000-4000-8000-0e1f00000002': [{ type: 'heal' }, { type: 'meal', food: 'food at their fire' }],
  '0e1f0004-0000-4000-8000-0e1f00000004': [{ type: 'item', slug: 'common_arrows', qty: 6 }, { type: 'item', slug: 'trail_rations', qty: 1 }],
  '0e1f0005-0000-4000-8000-0e1f00000005': [{ type: 'item', slug: 'trail_rations', qty: 4 }],
  '0e1f0006-0000-4000-8000-0e1f00000006': [{ type: 'meal', food: 'a meal at the camp they made' }, { type: 'water_refill' }],
  '0e1f0007-0000-4000-8000-0e1f00000007': [{ type: 'item', slug: 'trail_rations', qty: 2 }],
  '0ca10002-0000-4000-8000-0ca100000002': [{ type: 'meal', food: 'the hot meal that should not exist where it is standing' }],
  '0ba10003-0000-4000-8000-0ba100000003': [{ type: 'item', slug: 'trail_rations', qty: 1 }],
};
const STANCES = {
  '0a1d0006-0000-4000-8000-0a1d00000006': 'Eats what they give. Tells them only what they can use. Walks on while the light lasts.',
  '0a1d0014-0000-4000-8000-0a1d00000014': 'Gives a name they can write down. Eats the bread and olives. Leaves while the light holds.',
  '0a1d0017-0000-4000-8000-0a1d00000017': 'Takes the oar for the crossing. Earns the breakfast. Walks on.',
  '0a1d0018-0000-4000-8000-0a1d00000018': 'Accepts the seal-meat and the grass packing. Repays the kindness as he can.',
  '0a1d0019-0000-4000-8000-0a1d00000019': 'Sits where he is put. Eats his share. Gives them word of the war-bands and moves on.',
  '0a1d0001-0000-4000-8000-0a1d00000001': 'Takes the fire and the share of the pot. Pays in news and an hour of hands before walking on.',
  '0e1f0006-0000-4000-8000-0e1f00000006': 'Accepts the meal and the hot water. Answers about the road. Does not confirm the assumption.',
  '0e1f0007-0000-4000-8000-0e1f00000007': 'Refuses the escort. Takes what they press on her for the road. Does not answer the question.',
  '0e1f0008-0000-4000-8000-0e1f00000008': 'Eats little. Rests at the edge of their firelight a while. Says nothing about why the place was made there.',
  '0ca10002-0000-4000-8000-0ca100000002': 'Eats. Rests in the shelter of their fire a while. Remembers the counsel word for word.',
};

const rows = parseCsv(text);
const header = rows[0];
let cmdIdx = header.indexOf('commands');
if (cmdIdx === -1) {
  header.push('commands');
  cmdIdx = header.length - 1;
}
const stanceIdx = header.indexOf('traveller_stance');

let touched = 0;
for (const r of rows.slice(1)) {
  const id = r[0];
  const hasCmd = COMMANDS[id] || STANCES[id];
  if (!hasCmd) {
    while (r.length < header.length) r.push('');
    continue;
  }
  while (r.length < header.length) r.push('');
  if (COMMANDS[id]) r[cmdIdx] = JSON.stringify(COMMANDS[id]);
  if (STANCES[id]) r[stanceIdx] = STANCES[id];
  touched++;
}

const out = rows.map((r) => r.map(esc).join(',')).join('\n') + '\n';
fs.writeFileSync(PATH, out);
console.log(`rows=${rows.length - 1} touched=${touched} cols=${header.length}`);
