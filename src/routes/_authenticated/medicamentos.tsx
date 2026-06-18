import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pill, Trash2, Pencil, Camera, X, Clock, Package, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { MedicationRow } from "@/lib/medication-utils";

export const Route = createFileRoute("/_authenticated/medicamentos")({
  head: () => ({ meta: [{ title: "Medicamentos — Minha Rotina" }] }),
  component: MedicationsPage,
});

function useMedications() {
  return useQuery({
    queryKey: ["medications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MedicationRow[];
    },
  });
}

function MedicationsPage() {
  const { data: meds, isLoading } = useMedications();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MedicationRow | null>(null);
  const qc = useQueryClient();

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("medications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medications"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Medicamento removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Medicamentos</h1>
          <p className="text-sm text-muted-foreground">Seus medicamentos cadastrados</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4" /> Novo</Button>
          </DialogTrigger>
          <MedicationDialog
            key={editing?.id ?? "new"}
            editing={editing}
            onClose={() => { setOpen(false); setEditing(null); }}
          />
        </Dialog>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground">Carregando…</div>
      ) : !meds || meds.length === 0 ? (
        <Card className="p-10 text-center">
          <Pill className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold">Nenhum medicamento ainda</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Cadastre seus medicamentos para receber lembretes nos horários certos.
          </p>
          <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4" /> Cadastrar primeiro</Button>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {meds.map((med) => (
            <Card key={med.id} className="p-4 flex gap-3">
              <div className="w-14 h-14 rounded-xl bg-primary-soft text-primary flex items-center justify-center overflow-hidden shrink-0">
                {med.photo_url ? (
                  <img src={med.photo_url} alt={med.name} className="w-full h-full object-cover" />
                ) : (
                  <Pill className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{med.name}</h3>
                {med.dosage && <p className="text-sm text-muted-foreground">{med.dosage}</p>}
                {med.times.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {med.times.map((t) => (
                      <span key={t} className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-foreground flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />{t}
                      </span>
                    ))}
                  </div>
                )}
                {med.doctor && (
                  <p className="text-xs text-muted-foreground mt-2">Dr(a). {med.doctor}</p>
                )}
                <StockBadge med={med} />
              </div>
              <div className="flex flex-col gap-1">
                <Button size="icon" variant="ghost" onClick={() => { setEditing(med); setOpen(true); }}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost"
                        onClick={() => { if (confirm(`Remover ${med.name}?`)) del.mutate(med.id); }}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StockBadge({ med }: { med: MedicationRow }) {
  const qty = med.stock_quantity ?? 0;
  const threshold = med.stock_threshold ?? 4;
  if (qty === 0 && threshold === 0) return null;
  const low = qty <= threshold;
  return (
    <div className={`mt-2 inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded font-medium ${
      low ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
    }`}>
      {low ? <AlertTriangle className="w-3 h-3" /> : <Package className="w-3 h-3" />}
      {qty} em estoque {low && "• comprar"}
    </div>
  );
}

function MedicationDialog({ editing, onClose }: { editing: MedicationRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(editing?.name ?? "");
  const [dosage, setDosage] = useState(editing?.dosage ?? "");
  const [frequency, setFrequency] = useState(editing?.frequency ?? "Diário");
  const [times, setTimes] = useState<string[]>(editing?.times ?? ["08:00"]);
  const [startDate, setStartDate] = useState(editing?.start_date ?? new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(editing?.end_date ?? "");
  const [doctor, setDoctor] = useState(editing?.doctor ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(editing?.photo_url ?? null);
  const [stockQuantity, setStockQuantity] = useState<string>(String(editing?.stock_quantity ?? 0));
  const [stockThreshold, setStockThreshold] = useState<string>(String(editing?.stock_threshold ?? 4));
  const [pillsPerDose, setPillsPerDose] = useState<string>(String(editing?.pills_per_dose ?? 1));
  const [alertPhone, setAlertPhone] = useState(editing?.alert_phone ?? "");
  const [saving, setSaving] = useState(false);

  function addTime() { setTimes([...times, "12:00"]); }
  function removeTime(i: number) { setTimes(times.filter((_, idx) => idx !== i)); }
  function updateTime(i: number, v: string) {
    setTimes(times.map((t, idx) => (idx === i ? v : t)));
  }

  function onPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function uploadPhoto(userId: string): Promise<string | null> {
    if (!photoFile) return editing?.photo_url ?? null;
    const ext = photoFile.name.split(".").pop() || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("medication-photos")
      .upload(path, photoFile, { upsert: false });
    if (error) throw error;
    const { data } = await supabase.storage
      .from("medication-photos")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    return data?.signedUrl ?? null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Informe o nome do medicamento");
    if (times.length === 0) return toast.error("Adicione ao menos um horário");
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sessão expirada");
      const photoUrl = await uploadPhoto(userData.user.id);

      const payload = {
        user_id: userData.user.id,
        name: name.trim(),
        dosage: dosage.trim() || null,
        frequency: frequency.trim() || null,
        times: times.filter(Boolean),
        start_date: startDate,
        end_date: endDate || null,
        doctor: doctor.trim() || null,
        notes: notes.trim() || null,
        photo_url: photoUrl,
        stock_quantity: Math.max(0, Number(stockQuantity) || 0),
        stock_threshold: Math.max(0, Number(stockThreshold) || 4),
        pills_per_dose: Math.max(1, Number(pillsPerDose) || 1),
        alert_phone: alertPhone.trim() || null,
      };

      if (editing) {
        const { error } = await supabase.from("medications").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Medicamento atualizado");
      } else {
        const { error } = await supabase.from("medications").insert(payload);
        if (error) throw error;
        toast.success("Medicamento cadastrado");
      }
      qc.invalidateQueries({ queryKey: ["medications"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar medicamento" : "Novo medicamento"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Photo */}
        <div className="flex items-center gap-3">
          <label className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center overflow-hidden cursor-pointer hover:bg-muted/70 transition relative">
            {photoPreview ? (
              <img src={photoPreview} alt="" className="w-full h-full object-cover" />
            ) : (
              <Camera className="w-6 h-6 text-muted-foreground" />
            )}
            <input type="file" accept="image/*" className="hidden" onChange={onPhotoChange} />
          </label>
          <div className="text-sm text-muted-foreground">
            <p>Foto da caixa</p>
            <p className="text-xs">(opcional)</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="name">Nome*</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dosage">Dosagem</Label>
            <Input id="dosage" value={dosage} onChange={(e) => setDosage(e.target.value)}
                   placeholder="ex: 1 comprimido 50mg" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="freq">Frequência</Label>
            <Input id="freq" value={frequency} onChange={(e) => setFrequency(e.target.value)}
                   placeholder="ex: Diário" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Horários*</Label>
          <div className="space-y-2">
            {times.map((t, i) => (
              <div key={i} className="flex gap-2">
                <Input type="time" value={t} onChange={(e) => updateTime(i, e.target.value)} />
                {times.length > 1 && (
                  <Button type="button" size="icon" variant="ghost" onClick={() => removeTime(i)}>
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addTime}>
              <Plus className="w-4 h-4" /> Adicionar horário
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="start">Início</Label>
            <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="end">Término (opcional)</Label>
            <Input id="end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="doctor">Médico responsável</Label>
          <Input id="doctor" value={doctor} onChange={(e) => setDoctor(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Observações</Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
