export const GENRES = [
  { id: "horror", label: "Horror", blurb: "Dark atmosphere, thunder, ghosts" },
  { id: "romance", label: "Romance", blurb: "Soft colors, emotional narration" },
  { id: "action", label: "Action", blurb: "Kinetic panels, impact frames" },
  { id: "fantasy", label: "Fantasy", blurb: "Myth, magic, wide vistas" },
  { id: "thriller", label: "Thriller", blurb: "Tension, cold light, twists" },
  { id: "sci-fi", label: "Sci-Fi", blurb: "Neon tech, vast future cities" },
  { id: "adventure", label: "Adventure", blurb: "Journeys, maps, discovery" },
  { id: "comedy", label: "Comedy", blurb: "Bright, bouncy, punchlines" },
  { id: "mystery", label: "Mystery", blurb: "Shadow, clues, slow reveal" },
] as const;

export const LENGTHS = [
  { id: "short", label: "Short", blurb: "4 scenes" },
  { id: "medium", label: "Medium", blurb: "6 scenes" },
  { id: "long", label: "Long", blurb: "9 scenes" },
] as const;

export const ART_STYLES = [
  { id: "inked-noir", label: "Inked Noir", blurb: "High-contrast halftone ink" },
  { id: "manga", label: "Manga", blurb: "Screentone, sharp linework" },
  { id: "painted", label: "Painted", blurb: "Textured digital painting" },
  { id: "retro-pulp", label: "Retro Pulp", blurb: "1950s newsprint color" },
] as const;

export const DURATIONS = [
  { id: "30s", label: "30s", blurb: "Teaser" },
  { id: "60s", label: "60s", blurb: "Short" },
  { id: "2m", label: "2 min", blurb: "Full episode" },
] as const;

export const VOICES = [
  { id: "male", label: "Male", blurb: "Warm, grounded" },
  { id: "female", label: "Female", blurb: "Clear, expressive" },
  { id: "horror", label: "Horror", blurb: "Low, breathy dread" },
  { id: "romantic", label: "Romantic", blurb: "Soft, intimate" },
] as const;
