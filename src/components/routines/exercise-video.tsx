import { YouTubeEmbed } from "@/components/portal/youtube-embed";
import { exerciseVideo, type Exercise } from "@/lib/routines/library";

/** The movement demo: an uploaded file or the YouTube link. */
export function ExerciseVideo({ exercise }: { exercise: Pick<Exercise, "name" | "youtube_url" | "video_path"> }) {
  const video = exerciseVideo(exercise);
  if (!video) return <p className="text-sm text-muted">Este ejercicio todavía no tiene video.</p>;
  if (video.kind === "youtube") return <YouTubeEmbed videoId={video.id} title={`Video: ${exercise.name}`} />;
  return (
    <video
      src={video.url}
      controls
      playsInline
      preload="metadata"
      aria-label={`Video: ${exercise.name}`}
      className="aspect-video w-full rounded-xl bg-black object-contain"
    />
  );
}
