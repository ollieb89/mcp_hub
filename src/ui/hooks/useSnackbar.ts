import { useCallback, useState } from "react";

export function useSnackbar() {
  const [message, setMessage] = useState<string | null>(null);

  const showSnackbar = useCallback((text: string) => {
    setMessage(text);
  }, []);

  const closeSnackbar = useCallback(() => {
    setMessage(null);
  }, []);

  return {
    message,
    open: Boolean(message),
    showSnackbar,
    closeSnackbar,
  };
}
