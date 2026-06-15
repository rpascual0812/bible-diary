import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

/**
 * Device connectivity via NetInfo.
 * Uses isConnected only — isInternetReachable is often false while online.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const apply = (connected: boolean | null | undefined) => {
      setIsOnline(connected !== false);
    };

    const unsubscribe = NetInfo.addEventListener((state) => {
      apply(state.isConnected);
    });

    void NetInfo.fetch().then((state) => {
      apply(state.isConnected);
    });

    return unsubscribe;
  }, []);

  return isOnline;
}
