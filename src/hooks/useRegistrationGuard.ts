import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

/**
 * Guards a registration step by checking that required localStorage/sessionStorage
 * keys from prior steps are present. Redirects to the specified fallback route if not.
 */
export const useRegistrationGuard = (
  requiredKeys: { key: string; storage?: "local" | "session" }[],
  redirectTo: string
) => {
  const navigate = useNavigate();

  useEffect(() => {
    const missing = requiredKeys.some(({ key, storage = "local" }) => {
      const store = storage === "session" ? sessionStorage : localStorage;
      const value = store.getItem(key);
      return !value || value.trim() === "";
    });

    if (missing) {
      toast.error("Please complete the previous step first.");
      navigate(redirectTo, { replace: true });
    }
  }, []);
};
