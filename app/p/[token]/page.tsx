import { PublicCanvasView } from "@/components/canvas/PublicCanvasView";

interface PublicCanvasPageProps {
  params: Promise<{ token: string }>;
}

export default async function PublicCanvasPage({ params }: PublicCanvasPageProps) {
  const { token } = await params;
  return <PublicCanvasView token={token} />;
}
