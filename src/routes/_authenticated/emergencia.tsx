import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle, Phone, MessageCircle, Heart, Plus, Trash2, Pencil, User, Siren, X,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/emergencia")({
  head: () => ({ meta: [{ title: "Emergência — Minha Rotina" }] }),
  component: EmergencyPage,
});

type Profile = {
  id?: string;
  blood_type: string | null;
  allergies: string | null;
  chronic_conditions: string | null;
  notes: string | null;
};

type Contact = {
  id: string;
  name: string;
  phone: string;
  relationship: string | null;
  is_primary: boolean;
  priority: number;
};

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function sanitizePhone(p: string) {
  return p.replace(/[^\d+]/g, "");
}

function EmergencyPage() {
  const qc = useQueryClient();
  const [sosOpen, setSosOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  const profileQuery = useQuery({
    queryKey: ["medical_profile"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("medical_profiles")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return (data as Profile) ?? null;
    },
  });

  const contactsQuery = useQuery({
    queryKey: ["emergency_contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emergency_contacts")
        .select("*")
        .order("is_primary", { ascending: false })
        .order("priority", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Contact[];
    },
  });

  const profile = profileQuery.data;
  const contacts = contactsQuery.data ?? [];
  const primary = contacts.find((c) => c.is_primary) ?? contacts[0];

  const saveProfile = useMutation({
    mutationFn: async (p: Profile) => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("Sem usuário");
      const payload = {
        user_id: uid,
        blood_type: p.blood_type || null,
        allergies: p.allergies || null,
        chronic_conditions: p.chronic_conditions || null,
        notes: p.notes || null,
      };
      const { error } = await supabase
        .from("medical_profiles")
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medical_profile"] });
      toast.success("Perfil médico salvo");
      setProfileOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveContact = useMutation({
    mutationFn: async (c: Partial<Contact> & { id?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) throw new Error("Sem usuário");
      const payload = {
        user_id: uid,
        name: c.name!,
        phone: sanitizePhone(c.phone || ""),
        relationship: c.relationship || null,
        is_primary: !!c.is_primary,
        priority: c.priority ?? 0,
      };
      if (c.is_primary) {
        await supabase
          .from("emergency_contacts")
          .update({ is_primary: false })
          .eq("user_id", uid);
      }
      if (c.id) {
        const { error } = await supabase
          .from("emergency_contacts")
          .update(payload)
          .eq("id", c.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("emergency_contacts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emergency_contacts"] });
      toast.success("Contato salvo");
      setContactOpen(false);
      setEditingContact(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("emergency_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["emergency_contacts"] });
      toast.success("Contato removido");
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Siren className="w-6 h-6 text-destructive" />
          Emergência
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Acesso rápido ao seu perfil médico e contatos de emergência
        </p>
      </div>

      {/* Botão SOS */}
      <Card className="p-6 border-destructive/40 bg-destructive/5">
        <div className="flex flex-col items-center text-center gap-4">
          <button
            onClick={() => setSosOpen(true)}
            className="w-40 h-40 rounded-full bg-destructive text-destructive-foreground shadow-lg active:scale-95 transition-transform flex flex-col items-center justify-center gap-2 hover:bg-destructive/90"
            aria-label="Acionar emergência"
          >
            <AlertTriangle className="w-12 h-12" />
            <span className="text-2xl font-bold">SOS</span>
          </button>
          <p className="text-sm text-muted-foreground max-w-sm">
            Toque para abrir as opções de emergência: ligar, enviar mensagem e mostrar perfil médico.
          </p>
        </div>
      </Card>

      {/* Perfil médico */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Heart className="w-4 h-4 text-destructive" /> Perfil médico
          </h2>
          <Button size="sm" variant="outline" onClick={() => setProfileOpen(true)}>
            <Pencil className="w-3.5 h-3.5" /> Editar
          </Button>
        </div>
        {profile ? (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Tipo sanguíneo" value={profile.blood_type} highlight />
            <Field label="Alergias" value={profile.allergies} />
            <Field label="Condições crônicas" value={profile.chronic_conditions} full />
            {profile.notes && <Field label="Observações" value={profile.notes} full />}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhuma informação cadastrada. Toque em <strong>Editar</strong> para começar.
          </p>
        )}
      </Card>

      {/* Contatos */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2">
            <User className="w-4 h-4" /> Contatos de emergência
          </h2>
          <Dialog open={contactOpen} onOpenChange={(o) => {
            setContactOpen(o);
            if (!o) setEditingContact(null);
          }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-3.5 h-3.5" /> Adicionar</Button>
            </DialogTrigger>
            <ContactDialog
              contact={editingContact}
              onSave={(c) => saveContact.mutate(c)}
              saving={saveContact.isPending}
            />
          </Dialog>
        </div>
        {contacts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum contato cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {contacts.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                <div className="w-10 h-10 rounded-full bg-primary-soft text-primary flex items-center justify-center font-semibold">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{c.name}</p>
                    {c.is_primary && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-destructive/10 text-destructive font-medium">
                        Principal
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {c.phone}{c.relationship ? ` · ${c.relationship}` : ""}
                  </p>
                </div>
                <a href={`tel:${c.phone}`} className="p-2 rounded-lg bg-primary-soft text-primary hover:bg-primary/10" aria-label="Ligar">
                  <Phone className="w-4 h-4" />
                </a>
                <button onClick={() => { setEditingContact(c); setContactOpen(true); }}
                        className="p-2 rounded-lg text-muted-foreground hover:bg-muted" aria-label="Editar">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => { if (confirm("Remover contato?")) deleteContact.mutate(c.id); }}
                        className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Remover">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* SOS Sheet */}
      <SosDialog
        open={sosOpen}
        onClose={() => setSosOpen(false)}
        primary={primary}
        contacts={contacts}
        profile={profile}
      />

      {/* Profile dialog */}
      <ProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        profile={profile}
        onSave={(p) => saveProfile.mutate(p)}
        saving={saveProfile.isPending}
      />
    </div>
  );
}

function Field({ label, value, highlight, full }: { label: string; value: string | null; highlight?: boolean; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`mt-0.5 ${highlight ? "text-lg font-bold text-destructive" : "text-sm"}`}>
        {value || <span className="text-muted-foreground font-normal">—</span>}
      </p>
    </div>
  );
}

function ProfileDialog({
  open, onOpenChange, profile, onSave, saving,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  profile: Profile | null | undefined;
  onSave: (p: Profile) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<Profile>({
    blood_type: null, allergies: null, chronic_conditions: null, notes: null,
  });

  useEffect(() => {
    if (open) {
      setForm({
        blood_type: profile?.blood_type ?? null,
        allergies: profile?.allergies ?? null,
        chronic_conditions: profile?.chronic_conditions ?? null,
        notes: profile?.notes ?? null,
      });
    }
  }, [open, profile]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Perfil médico</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Tipo sanguíneo</Label>
            <Select
              value={form.blood_type ?? ""}
              onValueChange={(v) => setForm({ ...form, blood_type: v || null })}
            >
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {BLOOD_TYPES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Alergias</Label>
            <Textarea
              placeholder="Ex: penicilina, dipirona, frutos do mar"
              value={form.allergies ?? ""}
              onChange={(e) => setForm({ ...form, allergies: e.target.value })}
            />
          </div>
          <div>
            <Label>Condições crônicas</Label>
            <Textarea
              placeholder="Ex: hipertensão, diabetes tipo 2"
              value={form.chronic_conditions ?? ""}
              onChange={(e) => setForm({ ...form, chronic_conditions: e.target.value })}
            />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea
              placeholder="Outras informações importantes"
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSave(form)} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ContactDialog({
  contact, onSave, saving,
}: {
  contact: Contact | null;
  onSave: (c: Partial<Contact> & { id?: string }) => void;
  saving: boolean;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);

  useEffect(() => {
    setName(contact?.name ?? "");
    setPhone(contact?.phone ?? "");
    setRelationship(contact?.relationship ?? "");
    setIsPrimary(contact?.is_primary ?? false);
  }, [contact]);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{contact ? "Editar contato" : "Novo contato"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Nome</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Maria Silva" />
        </div>
        <div>
          <Label>Telefone</Label>
          <Input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(11) 99999-0000"
          />
        </div>
        <div>
          <Label>Relação</Label>
          <Input
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            placeholder="Ex: filha, esposo, vizinho"
          />
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg border">
          <div>
            <p className="text-sm font-medium">Contato principal</p>
            <p className="text-xs text-muted-foreground">Aparece em destaque no SOS</p>
          </div>
          <Switch checked={isPrimary} onCheckedChange={setIsPrimary} />
        </div>
      </div>
      <DialogFooter>
        <Button
          onClick={() => {
            if (!name.trim() || !phone.trim()) {
              toast.error("Nome e telefone são obrigatórios");
              return;
            }
            onSave({
              id: contact?.id,
              name: name.trim(),
              phone: phone.trim(),
              relationship: relationship.trim(),
              is_primary: isPrimary,
            });
          }}
          disabled={saving}
        >
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function SosDialog({
  open, onClose, primary, contacts, profile,
}: {
  open: boolean;
  onClose: () => void;
  primary: Contact | undefined;
  contacts: Contact[];
  profile: Profile | null | undefined;
}) {
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    if (!open) setShowProfile(false);
  }, [open]);

  function buildMessage() {
    const parts = ["🚨 Emergência! Preciso de ajuda."];
    if (profile?.blood_type) parts.push(`Tipo sanguíneo: ${profile.blood_type}.`);
    if (profile?.allergies) parts.push(`Alergias: ${profile.allergies}.`);
    if (profile?.chronic_conditions) parts.push(`Condições: ${profile.chronic_conditions}.`);
    return parts.join(" ");
  }

  function smsHref(phone: string) {
    return `sms:${sanitizePhone(phone)}?body=${encodeURIComponent(buildMessage())}`;
  }
  function waHref(phone: string) {
    const clean = sanitizePhone(phone).replace(/^\+/, "");
    return `https://wa.me/${clean}?text=${encodeURIComponent(buildMessage())}`;
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" /> Emergência
          </DialogTitle>
        </DialogHeader>

        {showProfile ? (
          <div className="space-y-3">
            <div className="text-center p-6 bg-destructive/5 rounded-lg border border-destructive/30">
              <p className="text-xs uppercase text-muted-foreground tracking-wide">Tipo sanguíneo</p>
              <p className="text-5xl font-bold text-destructive my-2">
                {profile?.blood_type || "—"}
              </p>
            </div>
            <div className="space-y-2 text-sm">
              <InfoBlock label="Alergias" value={profile?.allergies} />
              <InfoBlock label="Condições crônicas" value={profile?.chronic_conditions} />
              <InfoBlock label="Observações" value={profile?.notes} />
            </div>
            <Button variant="outline" className="w-full" onClick={() => setShowProfile(false)}>
              <X className="w-4 h-4" /> Voltar
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {primary ? (
              <div className="p-3 rounded-lg bg-primary-soft">
                <p className="text-xs text-muted-foreground">Contato principal</p>
                <p className="font-semibold">{primary.name}</p>
                <p className="text-sm text-muted-foreground">{primary.phone}</p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <a href={`tel:${primary.phone}`}
                     className="flex items-center justify-center gap-2 h-10 rounded-md bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90">
                    <Phone className="w-4 h-4" /> Ligar
                  </a>
                  <a href={waHref(primary.phone)} target="_blank" rel="noreferrer"
                     className="flex items-center justify-center gap-2 h-10 rounded-md bg-[#25D366] text-white font-medium hover:opacity-90">
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </a>
                </div>
                <a href={smsHref(primary.phone)}
                   className="mt-2 flex items-center justify-center gap-2 h-10 rounded-md border font-medium hover:bg-muted">
                  <MessageCircle className="w-4 h-4" /> Enviar SMS
                </a>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground p-3 rounded-lg bg-muted text-center">
                Nenhum contato cadastrado. Adicione um na tela anterior.
              </p>
            )}

            {contacts.length > 1 && (
              <div>
                <p className="text-xs uppercase text-muted-foreground tracking-wide mb-2">Outros contatos</p>
                <div className="space-y-1.5">
                  {contacts.filter((c) => c.id !== primary?.id).map((c) => (
                    <div key={c.id} className="flex items-center gap-2 p-2 rounded-md border">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.phone}</p>
                      </div>
                      <a href={`tel:${c.phone}`} className="p-2 rounded bg-destructive/10 text-destructive">
                        <Phone className="w-4 h-4" />
                      </a>
                      <a href={waHref(c.phone)} target="_blank" rel="noreferrer" className="p-2 rounded bg-[#25D366]/10 text-[#1da851]">
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button variant="outline" className="w-full" onClick={() => setShowProfile(true)}>
              <Heart className="w-4 h-4" /> Mostrar perfil médico
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InfoBlock({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="p-3 rounded-lg border">
      <p className="text-xs uppercase text-muted-foreground tracking-wide">{label}</p>
      <p className="text-sm mt-1">{value || <span className="text-muted-foreground">Não informado</span>}</p>
    </div>
  );
}
