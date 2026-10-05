# The mind admin is a separate Vue app; SQLAdmin removed

The public-facing mind admin (live graph of a Mind, Episode-tape scrubber that rewires the graph, Trait sliders) is built as its own Vue 3 + Vite app (`mind-studio/`) talking to the JSON admin API at `/studio/api`, served as static files by the story-engine at `/studio`. It is not a section of `frontend/`, because that would tie it to the Middle Earth game it must be independent of.

SQLAdmin at `/admin` was originally kept, frozen, as a raw debugging tool. It was later removed entirely (`app/admin.py`, the `sqladmin` dependency): the Studio is the only admin surface, and two admin UIs invited confusion. Raw inspection still exists through the DB itself and the `/studio/api` JSON.

## Considered Options

- **Server-rendered pages with htmx**: fewer moving parts, but an animated graph with a timeline scrubber fights the tool.
- **A section of `frontend/`**: reuses everything but couples the admin to one host.
- **Keep SQLAdmin as a debug surface**: chosen initially, reverted once the Studio proved it could carry the inspection load — a second admin was more confusing than useful.
