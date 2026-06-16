import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText, Plus, Upload, Download, Trash2, Eye, FileImage, FileType, Pill, Stethoscope, ClipboardList, Files,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/documentos")({
  head: () => ({ meta: [{ title: "Central de Documentos — Minha Rotina" }] }),
  component: DocumentsPage,
});

type Category = "receita" | "exame" | "laudo" | "outros";

type DocRow = {
  id: string;
  user_id: string;
  category: Category;
  title: string;
  description: string | null;
  document_date: string | null;
  doctor_name: string | null;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
};

const CATEGORIES: Record<Category, { label: string; icon: typeof FileText; color: string }> = {
  receita: { label: "Receitas",  icon: Pill,          color: "hsl(195 85% 45%)" },
  exame:   { label: "Exames",    icon: Stethoscope,   color: "hsl(140 60% 40%)" },
  laudo:   { label: "Laudos",    icon: ClipboardList, color: "hsl(260 60% 55%)" },
  outros:  { label: "Outros",    icon: Files,         color: "hsl(220 15% 50%)" },
};

const MAX_FILE_MB = 20;

function formatSize(bytes: number | null) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mime: string | null) {
  if (mime?.startsWith("image/")) return FileImage;
  if (mime === "application/pdf") return FileType;
  return FileText;
}

function DocumentsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"todos" | Category>("todos");
  const [open, setOpen] = useState(false);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["medical_documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medical_documents")
        .select("*")
        .order("document_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DocRow[];
    },
  });

  const filtered = useMemo(
    () => (filter === "todos" ? docs : docs.filter((d) => d.category === filter)),
    [docs, filter],
  );

  const counts = useMemo(() => {
    const c = { receita: 0, exame: 0, laudo: 0, outros: 0 } as Record<Category, number>;
    docs.forEach((d) => { c[d.category]++; });
    return c;
  }, [docs]);

  const deleteMut = useMutation({
    mutationFn: async (doc: DocRow) => {
      await supabase.storage.from("medical-documents").remove([doc.file_path]);
      const { error } = await supabase.from("medical_documents").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medical_documents"] });
      toast.success("Documento removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function openDoc(doc: DocRow) {
    const { data, error } = await supabase.storage
      .from("medical-documents")
      .createSignedUrl(doc.file_path, 60);
    if (error || !data) { toast.error("Não foi possível abrir"); return; }
    window.open(data.signedUrl, "_blank");
  }

  async function downloadDoc(doc: DocRow) {
    const { data, error } = await supabase.storage
      .from("medical-documents")
      .createSignedUrl(doc.file_path, 60, { download: doc.file_name });
    if (error || !data) { toast.error("Não foi possível baixar"); return; }
    window.location.href = data.signedUrl;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Central de Documentos
          </h1>
          <p className="text-sm text-muted-foreground">
            Receitas, exames, laudos e outros documentos médicos.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Novo</Button>
          </DialogTrigger>
          <UploadDialog onClose={() => setOpen(false)} />
        </Dialog>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(Object.keys(CATEGORIES) as Category[]).map((key) => {
          const cfg = CATEGORIES[key];
          const Icon = cfg.icon;
          return (
            <Card key={key} className="p-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                      style={{ background: cfg.color }}>
                  <Icon className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-xs text-muted-foreground">{cfg.label}</p>
                  <p className="text-xl font-semibold">{counts[key]}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="todos">Todos</TabsTrigger>
          {(Object.keys(CATEGORIES) as Category[]).map((k) => (
            <TabsTrigger key={k} value={k}>{CATEGORIES[k].label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">Nenhum documento</p>
          <p className="text-sm text-muted-foreground">
            Adicione receitas, exames e laudos para mantê-los sempre à mão.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => {
            const Icon = fileIcon(doc.mime_type);
            const cat = CATEGORIES[doc.category];
            return (
              <Card key={doc.id} className="p-4">
                <div className="flex items-start gap-3">
                  <span className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0"
                        style={{ background: cat.color }}>
                    <Icon className="w-5 h-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium truncate">{doc.title}</p>
                      <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {cat.label}
                      </span>
                    </div>
                    {doc.doctor_name && (
                      <p className="text-xs text-muted-foreground">Dr(a). {doc.doctor_name}</p>
                    )}
                    {doc.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{doc.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {doc.document_date
                        ? new Date(doc.document_date + "T00:00:00").toLocaleDateString("pt-BR")
                        : new Date(doc.created_at).toLocaleDateString("pt-BR")}
                      {" · "}{formatSize(doc.file_size)}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => openDoc(doc)} aria-label="Ver">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => downloadDoc(doc)} aria-label="Baixar">
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost"
                            onClick={() => { if (confirm("Remover este documento?")) deleteMut.mutate(doc); }}
                            aria-label="Excluir">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UploadDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<Category>("receita");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [documentDate, setDocumentDate] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { toast.error("Selecione um arquivo"); return; }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(`Arquivo maior que ${MAX_FILE_MB}MB`); return;
    }
    if (!title.trim()) { toast.error("Informe um título"); return; }

    setSaving(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) throw new Error("Sessão inválida");
      const userId = userData.user.id;

      const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
      const path = `${userId}/${crypto.randomUUID()}${ext ? "." + ext : ""}`;

      const { error: upErr } = await supabase.storage
        .from("medical-documents")
        .upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("medical_documents").insert({
        user_id: userId,
        category,
        title: title.trim(),
        description: description.trim() || null,
        document_date: documentDate || null,
        doctor_name: doctorName.trim() || null,
        file_name: file.name,
        file_path: path,
        file_size: file.size,
        mime_type: file.type || null,
      });
      if (insErr) {
        await supabase.storage.from("medical-documents").remove([path]);
        throw insErr;
      }

      qc.invalidateQueries({ queryKey: ["medical_documents"] });
      toast.success("Documento adicionado");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Novo documento</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSave} className="space-y-3">
        <div>
          <Label>Categoria</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(CATEGORIES) as Category[]).map((k) => (
                <SelectItem key={k} value={k}>{CATEGORIES[k].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Título *</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)}
                 placeholder="Ex.: Hemograma completo" required />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Data</Label>
            <Input type="date" value={documentDate} onChange={(e) => setDocumentDate(e.target.value)} />
          </div>
          <div>
            <Label>Médico(a)</Label>
            <Input value={doctorName} onChange={(e) => setDoctorName(e.target.value)} placeholder="Opcional" />
          </div>
        </div>
        <div>
          <Label>Observações</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
                    rows={2} placeholder="Opcional" />
        </div>
        <div>
          <Label>Arquivo * <span className="text-xs text-muted-foreground">(até {MAX_FILE_MB}MB)</span></Label>
          <input ref={fileRef} type="file" className="hidden"
                 accept="image/*,application/pdf"
                 onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <Button type="button" variant="outline" className="w-full justify-start gap-2"
                  onClick={() => fileRef.current?.click()}>
            <Upload className="w-4 h-4" />
            {file ? `${file.name} (${formatSize(file.size)})` : "Selecionar arquivo"}
          </Button>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
