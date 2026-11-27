# Threats fork on the road: an attack is a Situation the Mind chooses through

Attacks were the poorest beats of the day. A wolf pack that "breaks cover
and comes in low and fast" reached the narrator as one bare line, with no
choice, no roll and no cost, and the narrator was free to dissolve it
(Celebrian, day 2: the attack vanished from the chapter). The machinery to
do better already existed in ADR-0019 (Situations, Interactions, one
choosing, skill checks, typed effects) and a persistent wound Condition
already existed in the host. Two narrow gates kept them apart. This ADR
opens them and leaves the rest to authored content.

**Threats fork wherever they happen.** ADR-0019's code let an options
Situation contest only at the shelter window, since every authored contact
fork was an evening offer ("stay the night or walk on"). Threat forms
(`attacks`, `sudden_peril`) now contest at their own hour on the road: the
host filters the feasible options, the Mind picks through `POST /choose`,
the skill rolls `success`/`failure`, and the effects land before the
Episode opens. Any other fork still waits for the shelter window.
`confronts` stays out on purpose: hundreds of its Situations already carry
authored talk/avoid forks that were written for the evening and never ran
on the road. They join only after their own reviewed batch.

**A wound is a typed effect.** The wound Condition (`none → wounded →
badly_wounded`, healed one tier by a good night) was fed only by
`rollResistance`, which was switched off and untuned. It is now fed by a
`wound` effect authored on an Interaction's outcome, so the cost of a fight
is content, not a formula. This stays inside ADR-0019's rule that effects
change only Condition and never declare a feeling.

**`defy` leans on hatred, `avoid` on fear.** Both Acts used to sit in the
same away-from bias, driven by fear, so a terrified traveller and one who
hates wargs scored "flee" and "fight" alike. `defy` is now pushed by
distaste (negative affection) and `avoid` keeps the fear. The Act
vocabulary does not change; this is the weight tuning ADR-0019 allows.

**An attack never kills.** The worst authored result is *badly wounded*.
Death stays the host's Fate, declared before the day is told, so the
narrator always knows the closing in advance.

**The chosen result is binding prose.** A resolved threat reaches the
narrator as `OUTCOME (narrate this, do not change it)` together with the
body's cost. The Mind's echoes on the same encounter (a standing feeling,
a belief) stay as the reason behind the choice.

## Considered options

- **Content only, options left as `sole`**: rejected. The prose improves,
  but the traveller still never chooses and never bleeds.
- **Turn `ENABLE_RESISTANCE_ROLL` on**: rejected. It gives a wound without a
  choice, from a formula the code itself marks as untuned.
- **A new threat-archetype layer (pack, brute, swarm, terror…)**:
  rejected. It is new machinery. The scope ladder already does the job:
  `family` rows through the `entity_ids` whitelist, `entity_type` for
  homogeneous types and as the fallback, and concrete entities as
  overrides.
- **New Acts (`flee`, `fight`, `hide`)**: rejected. They would grow a
  closed vocabulary shared by two systems. Retuning `defy` is enough.
- **A third `partial` result**: deferred. "Wins but pays" is authored
  inside `success` until it proves too coarse.
- **Death from a failed roll**: rejected. Dying is a narrative verdict, not
  a dice result.

## Consequences

- Option difficulty derives from the creature's danger (`4 + danger × 2`),
  tuned per family where the fight warrants it. Each option kind rolls a
  fixed skill: `endurance` or `stealth` to get away, `melee` or `ranged`
  to fight, `intimidation` to stand, `persuasion` or `deception` with
  people. Yielding food or gear rolls nothing and always costs.
- `choose` already multiplies by `p_success`, so a traveller strong with
  the bow and weak on foot prefers to shoot without any extra rule.
- When the player takes over the choosing ("choose your own adventure"),
  they get the same feasible pool. No schema changes.
- Content lands family by family as seed JSON plus additive SQL
  migrations, starting with a wolf pilot calibrated on a real trip day.
