import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../../hooks/useAuth";
import Cookies from "js-cookie";
import { Loader2 } from "lucide-react";

export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setError("No token received");
      setTimeout(() => navigate("/auth/login?error=oauth_failed"), 2000);
      return;
    }

    Cookies.set("token", token);

    fetch(import.meta.env.VITE_API_URL + "/auth/me", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch user data");
        return res.json();
      })
      .then(data => {
        if (data.authenticated && data.user) {
          login(data.user);
          navigate("/dashboard", { replace: true });
        } else {
          throw new Error("Invalid user data");
        }
      })
      .catch(() => {
        Cookies.remove("token");
        setError("Authentication failed");
        setTimeout(() => navigate("/auth/login?error=oauth_failed"), 2000);
      });
  }, [searchParams, login, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-on-surface font-medium">
          {error ? error : "Signing in..."}
        </p>
      </div>
    </div>
  );
}
