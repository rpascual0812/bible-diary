import { useEffect, useState } from "react";

/** Browser connectivity — defaults to online; syncs with navigator.onLine events. */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const sync = () => {
      setIsOnline(
        typeof navigator === "undefined" ? true : navigator.onLine !== false,
      );
    };

    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  return isOnline;
}
