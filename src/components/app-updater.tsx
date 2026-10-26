import { getVersion } from "@tauri-apps/api/app";
import { isTauri } from "@tauri-apps/api/core";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type UpdaterContextValue = {
  isTauriApp: boolean;
  version: string | null;
  isChecking: boolean;
  checkForUpdates: (silent?: boolean) => Promise<boolean>;
};

type DownloadProgress = {
  downloadedBytes: number;
  totalBytes: number | null;
  isInstalling: boolean;
};

const UpdaterContext = createContext<UpdaterContextValue | null>(null);

function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AppUpdaterProvider({ children }: { children: ReactNode }) {
  const [isTauriApp, setIsTauriApp] = useState(false);
  const [version, setVersion] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [update, setUpdate] = useState<Update | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const checkInFlight = useRef<Promise<boolean> | null>(null);

  const checkForUpdates = useCallback((silent = false): Promise<boolean> => {
    if (!isTauri()) return Promise.resolve(false);
    if (checkInFlight.current) return checkInFlight.current;

    const checkPromise = (async () => {
      setIsChecking(true);
      try {
        const availableUpdate = await check();
        if (!availableUpdate) {
          if (!silent) toast.success("Você está na versão mais recente");
          return false;
        }

        setUpdate(availableUpdate);
        return true;
      } catch (error) {
        if (!silent) {
          toast.error(
            error instanceof Error ? error.message : "Não foi possível verificar atualizações",
          );
        }
        return false;
      } finally {
        setIsChecking(false);
        checkInFlight.current = null;
      }
    })();

    checkInFlight.current = checkPromise;
    return checkPromise;
  }, []);

  useEffect(() => {
    const runningInTauri = isTauri();
    setIsTauriApp(runningInTauri);
    if (!runningInTauri) return;

    void getVersion()
      .then(setVersion)
      .catch(() => undefined);
    void checkForUpdates(true);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        window.setTimeout(() => void checkForUpdates(true), 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkForUpdates]);

  const installUpdate = async () => {
    if (!update) return;

    setIsInstalling(true);
    setDownloadProgress({ downloadedBytes: 0, totalBytes: null, isInstalling: false });
    let downloadedBytes = 0;

    try {
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          setDownloadProgress({
            downloadedBytes: 0,
            totalBytes: event.data.contentLength ?? null,
            isInstalling: false,
          });
        } else if (event.event === "Progress") {
          downloadedBytes += event.data.chunkLength;
          setDownloadProgress((current) => ({
            downloadedBytes,
            totalBytes: current?.totalBytes ?? null,
            isInstalling: false,
          }));
        } else {
          setDownloadProgress((current) => ({
            downloadedBytes: current?.downloadedBytes ?? downloadedBytes,
            totalBytes: current?.totalBytes ?? null,
            isInstalling: true,
          }));
        }
      });

      await relaunch();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível instalar a atualização",
      );
      setIsInstalling(false);
      setDownloadProgress(null);
    }
  };

  const progressPercent = downloadProgress?.totalBytes
    ? Math.min(100, (downloadProgress.downloadedBytes / downloadProgress.totalBytes) * 100)
    : 0;

  return (
    <UpdaterContext.Provider value={{ isTauriApp, version, isChecking, checkForUpdates }}>
      {children}
      <Dialog
        open={update !== null}
        onOpenChange={(open) => {
          if (!open && !isInstalling) {
            setUpdate(null);
            setDownloadProgress(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualização disponível: {update?.version}</DialogTitle>
            <DialogDescription className="whitespace-pre-wrap">
              {update?.body || "Há uma nova versão disponível."}
            </DialogDescription>
          </DialogHeader>
          {downloadProgress && (
            <div className="space-y-2">
              <Progress value={progressPercent} />
              <p className="text-sm text-muted-foreground">
                {downloadProgress.isInstalling
                  ? "Instalando atualização..."
                  : `Baixando atualização: ${formatBytes(downloadProgress.downloadedBytes)}${
                      downloadProgress.totalBytes
                        ? ` de ${formatBytes(downloadProgress.totalBytes)}`
                        : ""
                    }`}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isInstalling}
              onClick={() => {
                setUpdate(null);
                setDownloadProgress(null);
              }}
            >
              Depois
            </Button>
            <Button type="button" disabled={isInstalling} onClick={() => void installUpdate()}>
              {isInstalling ? "Atualizando..." : "Atualizar agora"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UpdaterContext.Provider>
  );
}

export function AppUpdateSettings() {
  const context = useContext(UpdaterContext);
  if (!context) throw new Error("AppUpdateSettings must be used within AppUpdaterProvider");
  if (!context.isTauriApp) return null;

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Versão atual: {context.version ?? "Verificando..."}
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={context.isChecking}
        onClick={() => void context.checkForUpdates()}
      >
        {context.isChecking ? "Verificando..." : "Verificar atualizações"}
      </Button>
    </div>
  );
}
