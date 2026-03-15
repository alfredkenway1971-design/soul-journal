import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      console.log("AuthCallbackPage loaded, URL params:", Object.fromEntries(searchParams.entries()));
      
      // Check for OAuth errors in query parameters
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      
      if (errorParam) {
        console.error('OAuth error:', errorParam, errorDescription);
        setError(errorDescription || errorParam);
        // Stay on page to show error
        return;
      }

      try {
        // Check if we have OAuth code in URL (for Supabase OAuth)
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        
        if (code) {
          console.log("OAuth code found in URL, attempting to exchange for session");
          // Try to exchange code for session
          const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error("Error exchanging code for session:", exchangeError);
            setError(exchangeError.message);
            return;
          }
          
          if (session) {
            console.log("Session established via OAuth code exchange");
            navigate("/");
            return;
          }
        }

        // Fallback: check existing session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("OAuth callback error:", sessionError);
          setError(sessionError.message);
          return;
        }

        if (session) {
          console.log("Session found, redirecting to home");
          navigate("/");
        } else {
          console.log("No session found, redirecting to auth page");
          // No session found after a short delay, redirect to auth page
          setTimeout(() => {
            navigate("/auth");
          }, 3000);
        }
      } catch (err) {
        console.error("Unexpected error during OAuth callback:", err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    handleOAuthCallback();
  }, [navigate, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen gradient-warm flex items-center justify-center px-4">
        <div className="glass-card rounded-3xl p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold font-journal text-foreground mb-4">Sign In Failed</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={() => navigate('/auth')}
            className="w-full py-3 rounded-2xl gradient-amber shadow-glow text-lg font-medium"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-warm flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
};

export default AuthCallbackPage;