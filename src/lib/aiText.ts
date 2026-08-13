import { supabase } from "@/integrations/supabase/client";

// AI enhancement through our Vercel function (the Lovable-managed Supabase
// edge fn is unreliable). Falls back to the Supabase edge fn if Vercel fails.
export const invokeEnhance = async (body: any): Promise<{ enhancedText: string }> => {
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  try {
    const response = await fetch("/api/enhance-text", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(body),
    });
    let data: any;
    try {
      data = await response.json();
    } catch {
      data = {};
    }
    if (!response.ok) throw new Error(data.error || "Enhancement failed");
    if (data.error) throw new Error(data.error);
    return data;
  } catch (vercelError) {
    console.warn("Vercel enhance failed, falling back to edge fn:", vercelError);
    const { data, error } = await supabase.functions.invoke("enhance-text", { body });
    if (error) throw new Error(error.message);
    if (data.error) throw new Error(data.error);
    return data;
  }
};
