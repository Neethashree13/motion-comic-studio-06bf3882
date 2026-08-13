import { createFileRoute, Link } from "@tanstack/react-router";
import { CharacterCard, type CharacterRecord } from "@/components/CharacterCard";
import { listCharacterLibrary } from "@/lib/characters.functions";

import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { ComicPanel, type PanelRecord } from "@/components/ComicPanel";
import { ComicReader } from "@/components/ComicReader";
import { SceneImageCard, type SceneRecord } from "@/components/SceneImageCard";
import { ImageLightbox } from "@/components/ImageLightbox";
import { VideoStudio } from "@/components/VideoStudio";

import type { SceneImage } from "@/components/ImageStatusBadge";
import { generatePanels, getProject, regeneratePanel } from "@/lib/projects.functions";
import {
  generateSceneNarration,
  listSceneAudio,
  type SceneAudioRecord,
} from "@/lib/narration.functions";
import {
  deleteSceneImage,
  generatePanelImage,
  generateSceneImage,
  listSceneImages,
  selectSceneImage,
} from "@/lib/images.functions";

export const Route = createFileRoute("/project/$projectId")({
  head: () => ({
    meta: [
      { title: "Comic project — ComicVerse AI" },
      {
        name: "description",
        content:
          "Scene-by-scene comic artwork, character sheets, panel prompts and narration for your AI-generated comic story.",
      },
      { property: "og:title", content: "Comic project — ComicVerse AI" },
      { property: "og:description", content: "Scene images, characters, narration and a full-screen reader." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProjectPage,
});

type ViewMode = "grid" | "scene" | "story";

function ProjectPage() {
  const { projectId } = Route.useParams();
  const queryClient = useQueryClient();
  const [sceneIndex, setSceneIndex] = useState(0);
  const [readerOpen, setReaderOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("grid");
  const [busyScene, setBusyScene] = useState<string | null>(null);
  const [queueLeft, setQueueLeft] = useState(0);
  const [imageError, setImageError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; scene: SceneRecord } | null>(null);
  const [busyAudio, setBusyAudio] = useState<string | null>(null);
  const [audioQueueLeft, setAudioQueueLeft] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [busyPanel, setBusyPanel] = useState<string | null>(null);
  const [panelQueueLeft, setPanelQueueLeft] = useState(0);
  const [panelError, setPanelError] = useState<string | null>(null);

  const load = useServerFn(getProject);
  const loadImages = useServerFn(listSceneImages);
  const makePanels = useServerFn(generatePanels);
  const redoPanel = useServerFn(regeneratePanel);
  const makeImage = useServerFn(generateSceneImage);
  const makePanelImage = useServerFn(generatePanelImage);
  const pickImage = useServerFn(selectSceneImage);
  const dropImage = useServerFn(deleteSceneImage);
  const loadAudio = useServerFn(listSceneAudio);
  const makeNarration = useServerFn(generateSceneNarration);

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => load({ data: { projectId } }),
    refetchInterval: busyPanel !== null ? 1_500 : false,
  });

  const imagesQuery = useQuery({
    queryKey: ["scene-images", projectId],
    queryFn: () => loadImages({ data: { projectId } }),
    refetchInterval: busyScene !== null ? 1_500 : false,
  });

  const audioQuery = useQuery({
    queryKey: ["scene-audio", projectId],
    queryFn: () => loadAudio({ data: { projectId } }),
  });

  const loadCast = useServerFn(listCharacterLibrary);
  const castQuery = useQuery({
    queryKey: ["character-library"],
    queryFn: () => loadCast({ data: {} }),
  });


  const refreshImages = () => queryClient.invalidateQueries({ queryKey: ["scene-images", projectId] });

  const panelsMutation = useMutation({
    mutationFn: () => makePanels({ data: { projectId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project", projectId] }),
  });
  const regenMutation = useMutation({
    mutationFn: (panelId: string) => redoPanel({ data: { panelId } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project", projectId] }),
  });
  const selectMutation = useMutation({
    mutationFn: (imageId: string) => pickImage({ data: { imageId } }),
    onSuccess: refreshImages,
  });
  const deleteMutation = useMutation({
    mutationFn: (imageId: string) => dropImage({ data: { imageId } }),
    onSuccess: refreshImages,
  });

  async function runImage(sceneId: string, alternate = false) {
    setImageError(null);
    setBusyScene(sceneId);
    console.info("[scene-image] button clicked", { sceneId, alternate });
    try {
      console.info("[scene-image] calling generateSceneImage", { sceneId, alternate });
      await makeImage({ data: { sceneId, alternate } });
      console.info("[scene-image] generateSceneImage completed", { sceneId, alternate });
      await refreshImages();
    } catch (error) {
      console.error("[scene-image] generateSceneImage failed", { sceneId, alternate, error });
      setImageError(error instanceof Error ? error.message : "Image generation failed.");
      await refreshImages();
    } finally {
      setBusyScene(null);
    }
  }

  async function runNarration(sceneId: string, regenerate = false) {
    setAudioError(null);
    setBusyAudio(sceneId);
    try {
      await makeNarration({ data: { sceneId, regenerate } });
      await queryClient.invalidateQueries({ queryKey: ["scene-audio", projectId] });
    } catch (error) {
      setAudioError(error instanceof Error ? error.message : "Narration failed.");
      await queryClient.invalidateQueries({ queryKey: ["scene-audio", projectId] });
    } finally {
      setBusyAudio(null);
    }
  }

  async function narrateAll(sceneIds: string[]) {
    for (let i = 0; i < sceneIds.length; i += 1) {
      setAudioQueueLeft(sceneIds.length - i);
      // eslint-disable-next-line no-await-in-loop
      await runNarration(sceneIds[i]!);
    }
    setAudioQueueLeft(0);
  }

  async function generateAllPanelImages() {
    const pendingPanels = (panels as PanelRecord[]).filter((p) => p.image_status !== "ready");
    if (pendingPanels.length === 0) return;

    setPanelError(null);
    for (let i = 0; i < pendingPanels.length; i += 1) {
      setPanelQueueLeft(pendingPanels.length - i);
      setBusyPanel(pendingPanels[i]!.id);
      try {
        // eslint-disable-next-line no-await-in-loop
        await makePanelImage({ data: { panelId: pendingPanels[i]!.id } });
        // eslint-disable-next-line no-await-in-loop
        await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Panel image generation failed.";
        setPanelError(msg);
        console.error("[panel-images] generation failed:", msg);
        // Continue with next panel instead of stopping
      }
    }
    setBusyPanel(null);
    setPanelQueueLeft(0);
  }

  async function runAll(sceneIds: string[]) {
    setImageError(null);
    console.info("[scene-image] generate all clicked", { sceneIds, count: sceneIds.length });
    for (let i = 0; i < sceneIds.length; i += 1) {
      setQueueLeft(sceneIds.length - i);
      // eslint-disable-next-line no-await-in-loop
      await runImage(sceneIds[i]!);
    }
    setQueueLeft(0);
  }

  if (projectQuery.isLoading) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <p className="mx-auto max-w-6xl px-5 py-16 text-sm text-muted-foreground">Loading project…</p>
      </div>
    );
  }

  if (projectQuery.isError || !projectQuery.data) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <p className="mx-auto max-w-6xl px-5 py-16 text-sm text-destructive">
          This project could not be loaded.
        </p>
      </div>
    );
  }

  const { project, characters, scenes, panels } = projectQuery.data;
  const sceneList = scenes as SceneRecord[];
  const images = (imagesQuery.data ?? []) as SceneImage[];
  const imagesByScene = new Map<string, SceneImage[]>();
  for (const image of images) {
    const list = imagesByScene.get(image.scene_id) ?? [];
    list.push(image);
    imagesByScene.set(image.scene_id, list);
  }
  const selectedFor = (sceneId: string) => {
    const list = imagesByScene.get(sceneId) ?? [];
    return list.find((image) => image.is_selected) ?? list[list.length - 1] ?? null;
  };

  const audioRows = (audioQuery.data ?? []) as SceneAudioRecord[];
  const audioByScene = new Map<string, SceneAudioRecord>();
  for (const row of audioRows) {
    const current = audioByScene.get(row.scene_id);
    if (!current || row.version >= current.version || row.is_selected) audioByScene.set(row.scene_id, row);
  }
  const narratedCount = sceneList.filter(
    (scene) => audioByScene.get(scene.id)?.status === "completed",
  ).length;
  const unnarratedScenes = sceneList
    .filter((scene) => audioByScene.get(scene.id)?.status !== "completed")
    .map((scene) => scene.id);

  const readyCount = sceneList.filter((scene) => selectedFor(scene.id)?.status === "ready").length;
  const currentScene = sceneList[Math.min(sceneIndex, Math.max(sceneList.length - 1, 0))];
  const scenePanels = (panels as PanelRecord[]).filter((panel) => panel.scene_id === currentScene?.id);
  const missingScenes = sceneList
    .filter((scene) => selectedFor(scene.id)?.status !== "ready")
    .map((scene) => scene.id);

  const cardProps = {
    busyScene,
    onGenerate: (sceneId: string) => void runImage(sceneId),
    onAlternate: (sceneId: string) => void runImage(sceneId, true),
    onSelect: (imageId: string) => selectMutation.mutate(imageId),
    onDelete: (imageId: string) => deleteMutation.mutate(imageId),
    onFullscreen: (url: string, scene: SceneRecord) => setLightbox({ url, scene }),
    onNarrate: (sceneId: string) => runNarration(sceneId),
    onRenarrate: (sceneId: string) => runNarration(sceneId, true),
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">
          {project.genre} · {project.art_style}
        </p>
        <h1 className="mt-3 text-4xl sm:text-6xl">{project.title}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">{project.logline}</p>

        <div className="mt-6 flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <span className="rounded-sm border border-border px-3 py-2">Story ✓</span>
          <span className="rounded-sm border border-border px-3 py-2">{sceneList.length} scenes</span>
          <span className="rounded-sm border border-border px-3 py-2">{panels.length} panels</span>
          <span className="rounded-sm border border-primary/60 px-3 py-2 text-primary">
            {readyCount}/{sceneList.length} scene images
          </span>
          <span className="rounded-sm border border-primary/60 px-3 py-2 text-primary">
            {narratedCount}/{sceneList.length} narrated
          </span>
        </div>

        <section className="mt-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl">Character gallery</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Locked characters attach their approved reference art to every scene image, so faces, hair,
                clothing and colours stay identical.
              </p>
            </div>
            <Link
              to="/characters"
              className="rounded-sm border border-border px-5 py-3 text-xs uppercase tracking-[0.2em] hover:border-primary hover:text-primary"
            >
              Character library
            </Link>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {((castQuery.data ?? []) as unknown as CharacterRecord[])
              .filter((character) => character.project_id === projectId)
              .map((character) => (
                <CharacterCard key={character.id} character={character} />
              ))}
          </div>
        </section>


        <section className="mt-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl">Scene artwork</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                One illustrated comic image per scene, drawn from the locked character sheet.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex rounded-sm border border-border">
                {(["grid", "scene", "story"] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setView(mode)}
                    className={`px-4 py-2 text-[10px] uppercase tracking-[0.2em] ${
                      view === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {mode === "grid" ? "Grid" : mode === "scene" ? "Scene" : "Full story"}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setReaderOpen(true)}
                className="rounded-sm border border-border px-5 py-3 text-xs uppercase tracking-[0.2em] hover:border-primary hover:text-primary"
              >
                Full-screen reader
              </button>
              <button
                type="button"
                disabled={busyScene !== null || missingScenes.length === 0}
                onClick={() => void runAll(missingScenes)}
                className="rounded-sm bg-primary px-6 py-3 font-display text-lg tracking-wider text-primary-foreground disabled:opacity-40"
              >
                {queueLeft > 0
                  ? `Drawing… ${queueLeft} left`
                  : missingScenes.length === 0
                    ? "All scenes drawn"
                    : `Generate ${missingScenes.length} images`}
              </button>
              <button
                type="button"
                disabled={busyAudio !== null || unnarratedScenes.length === 0}
                onClick={() => void narrateAll(unnarratedScenes)}
                className="rounded-sm border border-primary/60 px-6 py-3 text-xs uppercase tracking-[0.2em] text-primary disabled:opacity-40"
              >
                {audioQueueLeft > 0
                  ? `Narrating… ${audioQueueLeft} left`
                  : unnarratedScenes.length === 0
                    ? "All scenes narrated"
                    : `Narrate ${unnarratedScenes.length} scenes`}
              </button>
            </div>
          </div>

          {imageError ? <p className="mt-4 text-sm text-destructive">{imageError}</p> : null}
          {audioError ? <p className="mt-2 text-sm text-destructive">{audioError}</p> : null}

          {view === "grid" ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {sceneList.map((scene) => (
                <SceneImageCard
                  key={scene.id}
                  scene={scene}
                  images={imagesByScene.get(scene.id) ?? []}
                  busy={busyScene === scene.id}
                  onGenerate={cardProps.onGenerate}
                  onAlternate={cardProps.onAlternate}
                  onSelect={cardProps.onSelect}
                  onDelete={cardProps.onDelete}
                  onFullscreen={cardProps.onFullscreen}
                  audio={audioByScene.get(scene.id) ?? null}
                  audioBusy={busyAudio === scene.id}
                  onNarrate={cardProps.onNarrate}
                  onRenarrate={cardProps.onRenarrate}
                />
              ))}
            </div>
          ) : null}

          {view === "scene" && currentScene ? (
            <div className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-primary">
                  Scene {sceneIndex + 1} of {sceneList.length}
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setSceneIndex((value) => Math.max(0, value - 1))}
                    disabled={sceneIndex === 0}
                    className="rounded-sm border border-border px-4 py-2 text-xs uppercase tracking-[0.2em] disabled:opacity-30"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    onClick={() => setSceneIndex((value) => Math.min(sceneList.length - 1, value + 1))}
                    disabled={sceneIndex >= sceneList.length - 1}
                    className="rounded-sm border border-border px-4 py-2 text-xs uppercase tracking-[0.2em] disabled:opacity-30"
                  >
                    Next
                  </button>
                </div>
              </div>
              <div className="mt-4 grid gap-5 lg:grid-cols-2">
                <SceneImageCard
                  scene={currentScene}
                  images={imagesByScene.get(currentScene.id) ?? []}
                  busy={busyScene === currentScene.id}
                  onGenerate={cardProps.onGenerate}
                  onAlternate={cardProps.onAlternate}
                  onSelect={cardProps.onSelect}
                  onDelete={cardProps.onDelete}
                  onFullscreen={cardProps.onFullscreen}
                  audio={audioByScene.get(currentScene.id) ?? null}
                  audioBusy={busyAudio === currentScene.id}
                  onNarrate={cardProps.onNarrate}
                  onRenarrate={cardProps.onRenarrate}
                />
                <div className="panel rounded-sm bg-card p-5">
                  <h3 className="text-2xl">Panels in this scene</h3>
                  <div className="mt-4 grid gap-4">
                    {scenePanels.map((panel) => (
                      <ComicPanel
                        key={panel.id}
                        panel={panel}
                        onRegenerate={(panelId) => regenMutation.mutate(panelId)}
                        regenerating={regenMutation.isPending && regenMutation.variables === panel.id}
                      />
                    ))}
                    {scenePanels.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No panels boarded for this scene yet.</p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {view === "story" ? (
            <div className="mt-6 space-y-6">
              {sceneList.map((scene) => (
                <SceneImageCard
                  key={scene.id}
                  scene={scene}
                  images={imagesByScene.get(scene.id) ?? []}
                  busy={busyScene === scene.id}
                  onGenerate={cardProps.onGenerate}
                  onAlternate={cardProps.onAlternate}
                  onSelect={cardProps.onSelect}
                  onDelete={cardProps.onDelete}
                  onFullscreen={cardProps.onFullscreen}
                  audio={audioByScene.get(scene.id) ?? null}
                  audioBusy={busyAudio === scene.id}
                  onNarrate={cardProps.onNarrate}
                  onRenarrate={cardProps.onRenarrate}
                />
              ))}
            </div>
          ) : null}
        </section>

        <section className="mt-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl">Panel breakdown</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {panels.length > 0
                  ? `${panels.length} panels across ${sceneList.length} scenes.`
                  : "Break the scenes into 6–20 illustrated panels."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={panelsMutation.isPending}
                onClick={() => panelsMutation.mutate()}
                className="rounded-sm border border-primary/60 px-6 py-3 text-xs uppercase tracking-[0.2em] text-primary disabled:opacity-40"
              >
                {panelsMutation.isPending
                  ? "Boarding panels…"
                  : panels.length > 0
                    ? "Rebuild panels"
                    : "Generate panels"}
              </button>
              <button
                type="button"
                disabled={busyPanel !== null || panels.length === 0 || (panels as PanelRecord[]).every((p) => p.image_status === "ready")}
                onClick={() => void generateAllPanelImages()}
                className="rounded-sm bg-primary px-6 py-3 font-display text-lg tracking-wider text-primary-foreground disabled:opacity-40"
              >
                {panelQueueLeft > 0
                  ? `Drawing panels… ${panelQueueLeft} left`
                  : (panels as PanelRecord[]).every((p) => p.image_status === "ready")
                    ? "All panels drawn"
                    : `Draw ${(panels as PanelRecord[]).filter((p) => p.image_status !== "ready").length} panels`}
              </button>
            </div>
          </div>

          {panelsMutation.isError ? (
            <p className="mt-4 text-sm text-destructive">{panelsMutation.error.message}</p>
          ) : null}
          {panelError ? <p className="mt-4 text-sm text-destructive">{panelError}</p> : null}

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {(panels as PanelRecord[]).map((panel) => (
              <ComicPanel
                key={panel.id}
                panel={panel}
                onRegenerate={(panelId) => regenMutation.mutate(panelId)}
                regenerating={regenMutation.isPending && regenMutation.variables === panel.id}
              />
            ))}
          </div>
        </section>

        <VideoStudio projectId={projectId} />
      </main>


      {readerOpen && currentScene ? (
        <ComicReader
          panels={scenePanels}
          sceneTitle={currentScene.title}
          narration={currentScene.narration}
          dialogue={currentScene.dialogue}
          sceneImage={selectedFor(currentScene.id)}
          audio={audioByScene.get(currentScene.id) ?? null}
          audioBusy={busyAudio === currentScene.id}
          onNarrate={() => runNarration(currentScene.id)}
          onRenarrate={() => runNarration(currentScene.id, true)}
          index={sceneIndex}
          total={sceneList.length}
          onClose={() => setReaderOpen(false)}
          onPrev={() => setSceneIndex((value) => Math.max(0, value - 1))}
          onNext={() => setSceneIndex((value) => Math.min(sceneList.length - 1, value + 1))}
        />
      ) : null}

      {lightbox ? (
        <ImageLightbox
          url={lightbox.url}
          title={`Scene ${lightbox.scene.scene_number} — ${lightbox.scene.title}`}
          narration={lightbox.scene.narration}
          dialogue={lightbox.scene.dialogue}
          onClose={() => setLightbox(null)}
        />
      ) : null}
    </div>
  );
}
