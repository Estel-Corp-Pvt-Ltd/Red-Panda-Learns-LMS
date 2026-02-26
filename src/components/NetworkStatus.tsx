import { useEffect } from "react";
import { toast } from "@/hooks/use-toast";

export default function NetworkStatus() {
  useEffect(() => {
    const handleOffline = () => {
      toast({
        title: "You're offline",
        description: "Check your internet connection and try again.",
        variant: "destructive",
      });
    };

    const handleOnline = () => {
      toast({
        title: "Back online",
        description: "Your connection has been restored.",
      });
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return null;
}
