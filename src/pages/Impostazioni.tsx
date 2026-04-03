import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import {
  Settings, Users, Shield, UserCog, Trash2, Loader2, KeyRound, Ban, CheckCircle2, UserPlus, Link, Unlink, CreditCard, BookOpen, Pencil, FileText,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PaymentSettingsCard from "@/components/impostazioni/PaymentSettingsCard";
import CorsiSettingsCard from "@/components/impostazioni/CorsiSettingsCard";
import DocumentiSettingsCard from "@/components/impostazioni/DocumentiSettingsCard";
import DatiPagamentoSettingsCard from "@/components/impostazioni/DatiPagamentoSettingsCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type UserWithRole = {
  id: string;
  email: string;
  full_name: string;
  role: string | null;
  is_active: boolean;
  persona_id: string | null;
  persona_nome: string | null;
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Amministratore",
  segreteria: "Segreteria",
  allenatore: "Allenatore",
  atleta: "Atleta",
};

async function callAdminApi(action: string, params: Record<string, any>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Non autenticato");

  const res = await supabase.functions.invoke("admin-users", {
    body: { action, ...params },
  });
  if (res.error) throw new Error(res.error.message || "Errore server");
  if (res.data?.error) throw new Error(res.data.error);
  return res.data;
}

export default function Impostazioni() {
  const { role: currentRole } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState<string | null>(null);
  const [showLinkDialog, setShowLinkDialog] = useState<UserWithRole | null>(null);
  const [showEditDialog, setShowEditDialog] = useState<UserWithRole | null>(null);
  const [editData, setEditData] = useState({ email: "", full_name: "" });
  const [newUser, setNewUser] = useState({ email: "", password: "", full_name: "", role: "allenatore" });
  const [newPassword, setNewPassword] = useState("");
  const [selectedPersonaId, setSelectedPersonaId] = useState("");

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;

      const { data: roles } = await supabase.from("user_roles").select("*");
      const { data: persone } = await supabase.from("persone").select("id, nome, cognome, user_id").not("user_id", "is", null);

      return (profiles || []).map((p: any) => {
        const persona = (persone || []).find((pe: any) => pe.user_id === p.id);
        return {
          id: p.id,
          email: p.email || "",
          full_name: p.full_name || "",
          role: roles?.find((r: any) => r.user_id === p.id)?.role || null,
          is_active: p.is_active ?? true,
          persona_id: persona?.id || null,
          persona_nome: persona ? `${persona.nome} ${persona.cognome}` : null,
        };
      }) as UserWithRole[];
    },
    enabled: currentRole === "admin",
  });

  const { data: persone = [] } = useQuery({
    queryKey: ["persone-for-link"],
    queryFn: async () => {
      const { data } = await supabase.from("persone").select("id, nome, cognome").order("cognome");
      return data || [];
    },
    enabled: currentRole === "admin",
  });

  const createUserMutation = useMutation({
    mutationFn: () => callAdminApi("create_user", newUser),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Utente creato");
      setShowCreateDialog(false);
      setNewUser({ email: "", password: "", full_name: "", role: "allenatore" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      callAdminApi("update_role", { user_id: userId, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Ruolo aggiornato");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updatePasswordMutation = useMutation({
    mutationFn: (userId: string) =>
      callAdminApi("update_password", { user_id: userId, password: newPassword }),
    onSuccess: () => {
      toast.success("Password aggiornata");
      setShowPasswordDialog(null);
      setNewPassword("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      callAdminApi("toggle_active", { user_id: userId, is_active: isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Stato utente aggiornato");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const removeRoleMutation = useMutation({
    mutationFn: (userId: string) => callAdminApi("remove_role", { user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Ruolo rimosso");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const linkPersonaMutation = useMutation({
    mutationFn: ({ userId, personaId }: { userId: string; personaId: string }) =>
      callAdminApi("link_persona", { user_id: userId, persona_id: personaId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Persona collegata all'utente");
      setShowLinkDialog(null);
      setSelectedPersonaId("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const unlinkPersonaMutation = useMutation({
    mutationFn: (userId: string) => callAdminApi("unlink_persona", { user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Collegamento rimosso");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, email, full_name }: { userId: string; email: string; full_name: string }) =>
      callAdminApi("update_user", { user_id: userId, email, full_name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Utente aggiornato");
      setShowEditDialog(null);
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (currentRole !== "admin") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Accesso non autorizzato</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Impostazioni</h1>
            <p className="text-sm text-muted-foreground">Gestione utenti, corsi e pagamenti</p>
          </div>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Nuovo utente
        </Button>
      </div>

      <Tabs defaultValue="utenti" className="space-y-4">
        <TabsList>
          <TabsTrigger value="utenti" className="gap-2">
            <UserCog className="h-4 w-4" />
            Utenti
          </TabsTrigger>
          <TabsTrigger value="corsi" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Corsi
          </TabsTrigger>
          <TabsTrigger value="pagamenti" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Pagamenti
          </TabsTrigger>
          <TabsTrigger value="documenti" className="gap-2">
            <FileText className="h-4 w-4" />
            Documenti
          </TabsTrigger>
        </TabsList>

        <TabsContent value="utenti">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                Utenti registrati
              </CardTitle>
              <CardDescription>Gestisci ruoli, password, stato e collegamento anagrafica.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Ruolo</TableHead>
                        <TableHead>Anagrafica</TableHead>
                        <TableHead>Stato</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id} className={!u.is_active ? "opacity-50" : ""}>
                          <TableCell className="font-medium">{u.email}</TableCell>
                          <TableCell>{u.full_name}</TableCell>
                          <TableCell>
                            <Select
                              value={u.role || ""}
                              onValueChange={(val) => updateRoleMutation.mutate({ userId: u.id, role: val })}
                            >
                              <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Nessun ruolo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">
                                  <div className="flex items-center gap-2"><Shield className="h-3.5 w-3.5" /> Admin</div>
                                </SelectItem>
                                <SelectItem value="segreteria">
                                  <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5" /> Segreteria</div>
                                </SelectItem>
                                <SelectItem value="allenatore">
                                  <div className="flex items-center gap-2"><UserCog className="h-3.5 w-3.5" /> Allenatore</div>
                                </SelectItem>
                                <SelectItem value="atleta">
                                  <div className="flex items-center gap-2"><UserCog className="h-3.5 w-3.5" /> Atleta</div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            {u.persona_nome ? (
                              <div className="flex items-center gap-1">
                                <span className="text-sm">{u.persona_nome}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                  title="Scollega"
                                  onClick={() => unlinkPersonaMutation.mutate(u.id)}
                                >
                                  <Unlink className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : (
                              u.role === "atleta" ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => { setShowLinkDialog(u); setSelectedPersonaId(""); }}
                                >
                                  <Link className="mr-1 h-3 w-3" />
                                  Collega
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={u.is_active ? "border-green-500/30 text-green-700 bg-green-500/10" : "border-destructive/30 text-destructive bg-destructive/10"}>
                              {u.is_active ? "Attivo" : "Disattivato"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Modifica utente"
                                onClick={() => { setShowEditDialog(u); setEditData({ email: u.email, full_name: u.full_name }); }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Modifica password"
                                onClick={() => setShowPasswordDialog(u.id)}
                              >
                                <KeyRound className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title={u.is_active ? "Disattiva" : "Riattiva"}
                                onClick={() => toggleActiveMutation.mutate({ userId: u.id, isActive: !u.is_active })}
                              >
                                {u.is_active ? <Ban className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-green-600" />}
                              </Button>
                              {u.role && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Rimuovere il ruolo?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        L'utente {u.email} non potrà più accedere al gestionale.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => removeRoleMutation.mutate(u.id)}>Rimuovi</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="corsi">
          <CorsiSettingsCard />
        </TabsContent>

        <TabsContent value="pagamenti" className="space-y-6">
          <DatiPagamentoSettingsCard />
          <PaymentSettingsCard />
        </TabsContent>

        <TabsContent value="documenti">
          <DocumentiSettingsCard />
        </TabsContent>
      </Tabs>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crea nuovo utente</DialogTitle>
            <DialogDescription>L'utente potrà accedere subito con queste credenziali.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} placeholder="Mario Rossi" />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required placeholder="email@esempio.it" />
            </div>
            <div className="space-y-2">
              <Label>Password *</Label>
              <Input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required minLength={6} placeholder="Minimo 6 caratteri" />
            </div>
            <div className="space-y-2">
              <Label>Ruolo *</Label>
              <Select value={newUser.role} onValueChange={(val) => setNewUser({ ...newUser, role: val })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="segreteria">Segreteria</SelectItem>
                  <SelectItem value="allenatore">Allenatore</SelectItem>
                  <SelectItem value="atleta">Atleta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Annulla</Button>
            <Button onClick={() => createUserMutation.mutate()} disabled={createUserMutation.isPending || !newUser.email || !newUser.password}>
              {createUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crea utente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={!!showPasswordDialog} onOpenChange={() => { setShowPasswordDialog(null); setNewPassword(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica password</DialogTitle>
            <DialogDescription>Inserisci la nuova password per l'utente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Nuova password</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} placeholder="Minimo 6 caratteri" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowPasswordDialog(null); setNewPassword(""); }}>Annulla</Button>
            <Button
              onClick={() => showPasswordDialog && updatePasswordMutation.mutate(showPasswordDialog)}
              disabled={updatePasswordMutation.isPending || newPassword.length < 6}
            >
              {updatePasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Aggiorna
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Persona Dialog */}
      <Dialog open={!!showLinkDialog} onOpenChange={() => { setShowLinkDialog(null); setSelectedPersonaId(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Collega anagrafica</DialogTitle>
            <DialogDescription>
              Seleziona la persona di <strong>{showLinkDialog?.full_name || showLinkDialog?.email}</strong> nell'anagrafica del gestionale.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Persona</Label>
            <Select value={selectedPersonaId} onValueChange={setSelectedPersonaId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona persona..." />
              </SelectTrigger>
              <SelectContent>
                {persone.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.cognome} {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowLinkDialog(null); setSelectedPersonaId(""); }}>Annulla</Button>
            <Button
              onClick={() => showLinkDialog && linkPersonaMutation.mutate({ userId: showLinkDialog.id, personaId: selectedPersonaId })}
              disabled={linkPersonaMutation.isPending || !selectedPersonaId}
            >
              {linkPersonaMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Collega
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit User Dialog */}
      <Dialog open={!!showEditDialog} onOpenChange={() => setShowEditDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica utente</DialogTitle>
            <DialogDescription>Aggiorna i dati dell'utente e collega l'anagrafica.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input value={editData.full_name} onChange={(e) => setEditData({ ...editData, full_name: e.target.value })} placeholder="Mario Rossi" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={editData.email} onChange={(e) => setEditData({ ...editData, email: e.target.value })} placeholder="email@esempio.it" />
            </div>
            <div className="space-y-2">
              <Label>Collegamento anagrafica</Label>
              {showEditDialog?.persona_nome ? (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm">{showEditDialog.persona_nome}</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      unlinkPersonaMutation.mutate(showEditDialog.id);
                      setShowEditDialog({ ...showEditDialog, persona_id: null, persona_nome: null });
                    }}
                  >
                    <Unlink className="mr-1 h-3 w-3" />
                    Scollega
                  </Button>
                </div>
              ) : (
                <Select value={selectedPersonaId} onValueChange={setSelectedPersonaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona persona da collegare..." />
                  </SelectTrigger>
                  <SelectContent>
                    {persone.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.cognome} {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                Collegando una persona, l'utente potrà accedere alla propria area personale.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(null)}>Annulla</Button>
            <Button
              onClick={async () => {
                if (!showEditDialog) return;
                await updateUserMutation.mutateAsync({ userId: showEditDialog.id, email: editData.email, full_name: editData.full_name });
                if (selectedPersonaId && !showEditDialog.persona_id) {
                  await linkPersonaMutation.mutateAsync({ userId: showEditDialog.id, personaId: selectedPersonaId });
                  setSelectedPersonaId("");
                }
                setShowEditDialog(null);
              }}
              disabled={updateUserMutation.isPending || linkPersonaMutation.isPending || !editData.email}
            >
              {(updateUserMutation.isPending || linkPersonaMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
