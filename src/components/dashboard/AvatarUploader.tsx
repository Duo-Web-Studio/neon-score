import { useRef, useState } from "react";
import { Camera, Loader2, Trash2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB
const ACCEPTED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const TARGET_W = 900;
const TARGET_H = 1200; // 3:4 portrait

interface Props {
  onChanged?: (url: string | null) => void;
}

/**
 * Resizes/crops the image to a centered 3:4 portrait JPEG (max 900x1200).
 */
async function processImage(file: File): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  const targetRatio = TARGET_W / TARGET_H; // 0.75
  const srcRatio = img.width / img.height;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (srcRatio > targetRatio) {
    // too wide → crop sides
    sw = img.height * targetRatio;
    sx = (img.width - sw) / 2;
  } else if (srcRatio < targetRatio) {
    // too tall → crop top/bottom
    sh = img.width / targetRatio;
    sy = (img.height - sh) / 2;
  }

  const canvas = document.createElement("canvas");
  canvas.width = TARGET_W;
  canvas.height = TARGET_H;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, TARGET_W, TARGET_H);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Falha ao processar imagem"))),
      "image/jpeg",
      0.88
    );
  });
}

export function AvatarUploader({ onChanged }: Props) {
  const { user, profile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(profile?.avatar_url ?? null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!user) return;
    if (!ACCEPTED.includes(file.type)) {
      toast({ title: "Formato inválido", description: "Use JPG, PNG ou WEBP.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({
        title: "Imagem muito grande",
        description: "O arquivo deve ter no máximo 12 MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const blob = await processImage(file);
      const path = `${user.id}/avatar.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg", cacheControl: "3600" });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${data.publicUrl}?v=${Date.now()}`;

      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", user.id);
      if (updErr) throw updErr;

      setPreviewUrl(url);
      onChanged?.(url);
      toast({ title: "Foto atualizada", description: "Sua foto de perfil foi atualizada." });
    } catch (e) {
      toast({ title: "Erro ao enviar", description: (e as Error).message ?? "Tente novamente.", variant: "destructive" });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (!user) return;
    setUploading(true);
    try {
      await supabase.storage.from("avatars").remove([`${user.id}/avatar.jpg`]);
      const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
      if (error) throw error;
      setPreviewUrl(null);
      onChanged?.(null);
      toast({ title: "Foto removida" });
    } catch (e) {
      toast({ title: "Erro ao remover", description: (e as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="h-48 w-36 overflow-hidden rounded-2xl border border-border/50 bg-muted/30 shadow-lg ring-1 ring-primary/20">
          {previewUrl ? (
            <img src={previewUrl} alt="Foto de perfil" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <User className="h-16 w-16" />
            </div>
          )}
        </div>
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-background/70 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      <div className="flex gap-2">
        <Button
          type="button"
          variant="default"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="gradient-yellow-orange text-primary-foreground"
        >
          <Camera className="mr-2 h-4 w-4" />
          {previewUrl ? "Trocar foto" : "Adicionar foto"}
        </Button>
        {previewUrl && (
          <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={handleRemove}>
            <Trash2 className="mr-2 h-4 w-4" />
            Remover
          </Button>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Proporção 3:4 (retrato). JPG, PNG ou WEBP. Máx. 12&nbsp;MB.
      </p>
    </div>
  );
}
