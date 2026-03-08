import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Users, BarChart3, Gift, Search, Crown, XCircle, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
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
    if (!user.subscription) return <Badge variant="outline">Free</Badge>;
    if (user.subscription.is_manual_grant)
      return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Manual Grant</Badge>;
    if (user.subscription.status === "active")
      return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Active</Badge>;
    if (user.subscription.status === "cancelled")
      return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Cancelled</Badge>;
    return <Badge variant="outline">Inactive</Badge>;
  };

  return (
    <div className="min-h-screen gradient-warm pb-8">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate("/settings")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary" /> Admin Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">Manage users & business metrics</p>
            </div>
            <Button variant="ghost" size="icon" className="ml-auto rounded-full" onClick={fetchUsers}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" /> Users
            </TabsTrigger>
            <TabsTrigger value="revenue" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Revenue
            </TabsTrigger>
            <TabsTrigger value="grants" className="flex items-center gap-2">
              <Gift className="w-4 h-4" /> Manual Access
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users by email or name..."
                className="pl-10"
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
                    className="glass-card rounded-xl p-4 flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
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

          {/* Revenue Tab */}
          <TabsContent value="revenue" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card rounded-xl p-5 text-center">
                <p className="text-3xl font-bold text-foreground">{users.length}</p>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
              <div className="glass-card rounded-xl p-5 text-center">
                <p className="text-3xl font-bold text-emerald-500">{activeSubscribers.length}</p>
                <p className="text-sm text-muted-foreground">Active Subscribers</p>
              </div>
              <div className="glass-card rounded-xl p-5 text-center">
                <p className="text-3xl font-bold text-primary">{monthlySubscribers.length}</p>
                <p className="text-sm text-muted-foreground">Monthly</p>
              </div>
              <div className="glass-card rounded-xl p-5 text-center">
                <p className="text-3xl font-bold text-primary">{annualSubscribers.length}</p>
                <p className="text-sm text-muted-foreground">Annual</p>
              </div>
              <div className="glass-card rounded-xl p-5 text-center col-span-2">
                <p className="text-3xl font-bold text-purple-500">{manualGrants.length}</p>
                <p className="text-sm text-muted-foreground">Manual Grants</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Revenue metrics will populate once Stripe is connected and subscriptions are active.
            </p>
          </TabsContent>

          {/* Manual Access Tab */}
          <TabsContent value="grants" className="space-y-4">
            <div className="glass-card rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-foreground">Grant Free Access</h3>
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
                  {granting ? "Granting..." : "Grant Access"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">Users with Manual Access</h3>
              {manualGrants.length === 0 ? (
                <p className="text-sm text-muted-foreground">No manual grants yet.</p>
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
