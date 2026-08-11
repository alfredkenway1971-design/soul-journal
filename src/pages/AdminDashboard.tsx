import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Users, BarChart3, Gift, Search, Crown, XCircle, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserData {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  subscription: {
    plan_type: string;
    status: string;
    is_manual_grant: boolean;
    current_period_end: string | null;
  } | null;
}

const AdminDashboard = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [grantEmail, setGrantEmail] = useState("");
  const [granting, setGranting] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/");
      return;
    }
    fetchUsers();
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?action=list-users`;
      const fetchRes = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      const data = await fetchRes.json();
      if (data.users) setUsers(data.users);
    } catch (e) {
      console.error("Failed to fetch users:", e);
    }
    setLoading(false);
  };

  const handleGrantAccess = async () => {
    if (!grantEmail.trim()) return;
    setGranting(true);
    const { data: { session } } = await supabase.auth.getSession();
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?action=grant-access`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: grantEmail.trim() }),
    });
    const data = await res.json();
    if (data.success) {
      toast({ title: "Access granted", description: `${grantEmail} now has full access.` });
      setGrantEmail("");
      fetchUsers();
    } else {
      toast({ title: "Error", description: data.error || "Failed to grant access", variant: "destructive" });
    }
    setGranting(false);
  };

  const handleRevokeAccess = async (userId: string, email: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?action=revoke-access`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    if (data.success) {
      toast({ title: "Access revoked", description: `${email}'s access has been revoked.` });
      fetchUsers();
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeSubscribers = users.filter(
    (u) => u.subscription?.status === "active"
  );
  const monthlySubscribers = activeSubscribers.filter(
    (u) => u.subscription?.plan_type === "monthly"
  );
  const annualSubscribers = activeSubscribers.filter(
    (u) => u.subscription?.plan_type === "annual"
  );
  const manualGrants = activeSubscribers.filter(
    (u) => u.subscription?.is_manual_grant
  );

  const getStatusBadge = (user: UserData) => {
    if (!user.subscription) return <Badge variant="outline">{t("admin.free")}</Badge>;
    if (user.subscription.is_manual_grant)
      return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">{t("admin.manualGrant")}</Badge>;
    if (user.subscription.status === "active")
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">{t("admin.active")}</Badge>;
    if (user.subscription.status === "cancelled")
      return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">{t("admin.cancelled")}</Badge>;
    return <Badge variant="outline">{t("admin.inactive")}</Badge>;
  };

  // Mock revenue figures derived from subscription counts (placeholder until Stripe webhooks populate real data)
  const monthlyRevenue = monthlySubscribers.length * 599;
  const annualRevenueShare = Math.round((annualSubscribers.length * 4999) / 12);
  const totalRevenueThisMonth = monthlyRevenue + annualRevenueShare;
  const fmtUSD = (cents: number) =>
    `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <div className="min-h-screen gradient-warm pb-24">
      <header className="sticky top-0 z-40 backdrop-blur-2xl bg-white/30 border-b border-white/40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-white/50 backdrop-blur-md border border-white/60"
              onClick={() => navigate("/settings")}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 text-center -ml-9">
              <h1 className="text-xl font-display font-semibold text-foreground flex items-center justify-center gap-2">
                Admin Dashboard <Crown className="w-5 h-5 text-primary" />
              </h1>
              <p className="text-xs text-muted-foreground">{t("admin.revenueMetrics")}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-white/50 backdrop-blur-md border border-white/60"
              onClick={fetchUsers}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <Tabs defaultValue="revenue" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/45 backdrop-blur-xl border border-white/60 rounded-full p-1 h-12 shadow-[0_8px_24px_-10px_hsl(215_50%_30%_/_0.18),inset_0_1px_0_rgba(255,255,255,0.7)]">
            <TabsTrigger
              value="users"
              className="rounded-full text-sm font-medium data-[state=active]:bg-white/80 data-[state=active]:text-primary data-[state=active]:shadow-[0_4px_14px_-4px_hsl(211_85%_45%_/_0.35)]"
            >
              Users
            </TabsTrigger>
            <TabsTrigger
              value="revenue"
              className="rounded-full text-sm font-medium data-[state=active]:bg-white/80 data-[state=active]:text-primary data-[state=active]:shadow-[0_4px_14px_-4px_hsl(211_85%_45%_/_0.35)]"
            >
              Revenue
            </TabsTrigger>
            <TabsTrigger
              value="grants"
              className="rounded-full text-sm font-medium data-[state=active]:bg-white/80 data-[state=active]:text-primary data-[state=active]:shadow-[0_4px_14px_-4px_hsl(211_85%_45%_/_0.35)]"
            >
              Manual Access
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users by email or name..."
                className="pl-10 rounded-full bg-white/60 border-white/60 backdrop-blur-md"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{filteredUsers.length} users total</p>
                {filteredUsers.map((user, i) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="glass-card rounded-2xl p-4 flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-full bg-white/60 flex items-center justify-center text-sm font-medium text-primary">
                      {user.display_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {user.display_name || "No name"}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(user.created_at).toLocaleDateString()}
                        {user.last_sign_in_at &&
                          ` · Last active ${new Date(user.last_sign_in_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    {getStatusBadge(user)}
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Revenue Tab — matches design screenshot */}
          <TabsContent value="revenue" className="space-y-4">
            {/* Hero card — Total Revenue */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[28px] p-7 text-center backdrop-blur-2xl border border-white/70"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(230,242,255,0.5) 100%)",
                boxShadow:
                  "0 18px 50px -18px hsl(215 60% 30% / 0.3), inset 0 1px 0 rgba(255,255,255,0.85)",
              }}
            >
              <p className="text-base text-foreground/80 mb-1">{t("admin.totalRevenue")}</p>
              <p className="text-6xl font-bold text-primary tracking-tight leading-none my-2">
                {fmtUSD(totalRevenueThisMonth)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{t("admin.thisMonth")}</p>
            </motion.div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total Users", value: users.length.toLocaleString() },
                { label: "Active Subscribers", value: activeSubscribers.length.toLocaleString() },
                { label: "Monthly Revenue", value: fmtUSD(monthlyRevenue) },
                { label: "Annual Revenue", value: fmtUSD(annualSubscribers.length * 4999) },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + i * 0.04 }}
                  className="rounded-3xl p-5 text-center backdrop-blur-2xl border border-white/70"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(230,242,255,0.45) 100%)",
                    boxShadow:
                      "0 10px 30px -12px hsl(215 60% 30% / 0.22), inset 0 1px 0 rgba(255,255,255,0.85)",
                  }}
                >
                  <p className="text-sm text-foreground/80 mb-2">{stat.label}</p>
                  <p className="text-3xl font-bold text-primary tracking-tight">{stat.value}</p>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="rounded-3xl p-6 text-center backdrop-blur-2xl border border-white/70"
              style={{
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(230,242,255,0.45) 100%)",
                boxShadow:
                  "0 10px 30px -12px hsl(215 60% 30% / 0.22), inset 0 1px 0 rgba(255,255,255,0.85)",
              }}
            >
              <p className="text-sm text-foreground/80 mb-2">{t("admin.manualGrants")}</p>
              <p className="text-4xl font-bold text-primary tracking-tight">{manualGrants.length}</p>
            </motion.div>

            <p className="text-xs text-muted-foreground text-center px-4 pt-1">
              {t("admin.revenueNote")}
            </p>
          </TabsContent>

          {/* Manual Access Tab */}
          <TabsContent value="grants" className="space-y-4">
            <div className="glass-card rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-foreground">{t("admin.grantFreeAccess")}</h3>
              <p className="text-sm text-muted-foreground">
                Enter the email of a registered user to give them full app access without payment.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="user@email.com"
                  value={grantEmail}
                  onChange={(e) => setGrantEmail(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleGrantAccess} disabled={granting || !grantEmail.trim()}>
                  {granting ? t("admin.granting") : t("admin.grantAccess")}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">{t("admin.usersWithManualAccess")}</h3>
              {manualGrants.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("admin.noManualGrants")}</p>
              ) : (
                manualGrants.map((user) => (
                  <div key={user.id} className="glass-card rounded-xl p-4 flex items-center gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{user.display_name || user.email}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => handleRevokeAccess(user.id, user.email)}
                    >
                      <XCircle className="w-4 h-4 mr-1" /> Revoke
                    </Button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
