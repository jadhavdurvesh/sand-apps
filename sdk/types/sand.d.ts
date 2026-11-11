/**
 * SAND Apps SDK public declarations.
 * Reference with: /// <reference path="./sdk/types/sand.d.ts" />
 * These declarations describe the browser/Node host SDK, not a native OS ABI.
 */
type SandJSON = null | boolean | number | string | SandJSON[] | { [key: string]: SandJSON };

interface SandManifest {
  id: string;
  name: string;
  version: string;
  capabilities?: string[];
}

interface SandStorageAdapter {
  get(appId: string, key: string): SandJSON | null;
  set(appId: string, key: string, value: SandJSON): boolean;
  remove(appId: string, key: string): boolean;
  keys(appId: string): string[];
}

interface SandRuntimeError extends Error { code: string; }
interface SandDesktopError extends Error { code: string; }

interface SandRuntimeInstance {
  readonly abi: "sand.app-runtime/0.1";
  readonly version: string;
  readonly manifest: Readonly<SandManifest>;
  readonly state: "created" | "initializing" | "ready" | "suspended" | "stopping" | "stopped" | "failed";
  readonly error: { name: string; code: string; message: string } | null;
  readonly capabilities: {
    readonly requested: readonly string[];
    readonly granted: readonly string[];
    has(capability: string): boolean;
    describe(capability: string): string | null;
  };
  init(context?: SandJSON): this;
  suspend(reason?: string): this;
  resume(): this;
  stop(reason?: string): this;
  on(name: string, listener: (payload: SandJSON) => void): () => boolean;
  emit(name: string, payload?: SandJSON): number;
  onLifecycle(listener: (event: { appId: string; previous: string; state: string; detail: SandJSON }) => void): () => boolean;
  storage: {
    get<T extends SandJSON = SandJSON>(key: string): T | null;
    set(key: string, value: SandJSON): boolean;
    remove(key: string): boolean;
    keys(): string[];
  };
  settings: {
    get<T extends SandJSON = SandJSON>(name: string): T;
    set<T extends SandJSON>(name: string, value: T): T;
    all(): Record<string, SandJSON>;
  };
  requestService<T extends SandJSON = SandJSON>(service: string, operation: string, payload: Record<string, SandJSON>, capability: string): Promise<T>;
  onMessage(topic: string, listener: (message: { from: string; to: string; topic: string; payload: SandJSON }) => void): () => boolean;
  onPlatformEvent(topic: string, listener: (payload: SandJSON) => void, capability?: "platform.desktop.events"): () => boolean;
  send(targetAppId: string, topic: string, payload: SandJSON): Promise<boolean>;
}

interface SandRuntimeOptions {
  manifest: SandManifest;
  grants?: string[];
  storage?: SandStorageAdapter;
  settings?: Record<string, { type: "string" | "boolean" | "number" | "integer" | "object" | "array"; default: SandJSON; enum?: SandJSON[] }>;
  platform?: {
    request(request: { abi: string; appId: string; service: string; operation: string; capability: string; payload: SandJSON }): Promise<SandJSON> | SandJSON;
    subscribe?(subscription: { appId: string; topic: string; listener: (payload: SandJSON) => void; capability: string }): () => boolean;
  };
  onInitialize?: (runtime: SandRuntimeInstance, context: SandJSON) => void;
  onStop?: (runtime: SandRuntimeInstance, reason: string) => void;
}

interface SandHost {
  launch(manifest: SandManifest, options?: Omit<SandRuntimeOptions, "manifest"> & { context?: SandJSON }): SandRuntimeInstance;
  getApp(id: string): SandRuntimeInstance | null;
  listApps(): Array<{ id: string; name: string; version: string; state: string }>;
  stop(id: string, reason?: string): boolean;
  readonly count: number;
}

declare const SandRuntime: {
  readonly VERSION: string;
  readonly ABI: "sand.app-runtime/0.1";
  readonly STATES: Readonly<Record<"CREATED" | "INITIALIZING" | "READY" | "SUSPENDED" | "STOPPING" | "STOPPED" | "FAILED", string>>;
  readonly CAPABILITIES: Readonly<Record<string, string>>;
  readonly RuntimeError: new (code: string, message: string) => SandRuntimeError;
  validateManifest(manifest: SandManifest): Readonly<SandManifest>;
  createMemoryStorageAdapter(): SandStorageAdapter;
  createLocalStorageAdapter(storage: Storage): SandStorageAdapter;
  createRuntime(options: SandRuntimeOptions): SandRuntimeInstance;
  createHost(options?: { storage?: SandStorageAdapter; platform?: SandRuntimeOptions["platform"] }): SandHost;
};

interface SandDesktopWindow {
  id: string; appId: string; title: string;
  width: number; height: number;
  state: "normal" | "focused" | "minimized" | "maximized";
  createdAt: number;
}
interface SandDesktopNotification {
  id: string; appId: string; title: string; body: string;
  createdAt: number; read: boolean;
}
interface SandDesktopHost {
  readonly abi: "sand.desktop-services/0.1";
  launch(id: string, options?: { grants?: string[]; context?: SandJSON }): SandRuntimeInstance;
  stop(id: string, reason?: string): boolean;
  listApps(): Array<{ id: string; name: string; version: string; state: string }>;
  on(topic: string, listener: (payload: SandJSON) => void): () => boolean;
  emit(topic: string, payload?: Record<string, SandJSON>): boolean;
  listWindows(): SandDesktopWindow[];
  listNotifications(): SandDesktopNotification[];
  readonly count: number;
}
declare const SandDesktop: {
  readonly VERSION: string;
  readonly ABI: "sand.desktop-services/0.1";
  readonly DesktopError: new (code: string, message: string) => SandDesktopError;
  createDesktopHost(options?: { catalog?: SandManifest[]; storage?: SandStorageAdapter; systemInfo?: Record<string, SandJSON> }): SandDesktopHost;
};

interface SandPackageFile { path: string; content: string; }
interface SandPackageManifest extends SandManifest { description: string; entrypoint?: string; }
interface SandPackage {
  format: "SANDPKG";
  formatVersion: 1;
  manifest: SandPackageManifest;
  files: SandPackageFile[];
  createdAt?: string | null;
}
interface SandPackageManager {
  readonly format: "SANDPKG";
  readonly formatVersion: 1;
  validateManifest(manifest: SandPackageManifest): SandPackageManifest;
  validatePackage(pkg: SandPackage): SandPackage;
  createPackage(manifest: SandPackageManifest, files: SandPackageFile[]): SandPackage;
  compareVersions(a: string, b: string): number;
  list(): Array<{ id: string; name: string; version: string; description: string; capabilities: string[]; source: string; installed: boolean; protected: boolean; installedAt?: string }>;
  get(id: string): { manifest: SandPackageManifest; files?: SandPackageFile[]; source: string; protected: boolean } | null;
  getPermissions(id: string): { granted: string[]; updatedAt: string | null };
  setPermissions(id: string, grants: string[]): { granted: string[]; updatedAt: string | null };
  install(pkg: SandPackage): { id: string; version: string; updated: boolean; launchable: false };
  uninstall(id: string): boolean;
  removePermissions(id: string): boolean;
  checkUpdates(packages?: SandPackage[]): Array<{ id: string; current: string; available: string }>;
}
declare const SandPackages: {
  readonly FORMAT: "SANDPKG";
  readonly FORMAT_VERSION: 1;
  readonly PackageError: new (code: string, message: string) => Error & { code: string };
  validateManifest(manifest: SandPackageManifest): SandPackageManifest;
  validatePackage(pkg: SandPackage): SandPackage;
  createPackage(manifest: SandPackageManifest, files: SandPackageFile[]): SandPackage;
  compareVersions(a: string, b: string): number;
  createManager(options: { storage: SandStorageAdapter; catalog?: SandPackageManifest[] }): SandPackageManager;
}

interface SandAppMountContext {
  workspace: HTMLElement;
  currentRuntime: SandRuntimeInstance;
  renderNotifications?: () => void;
}
interface SandAppModule { mount(context: SandAppMountContext): void | (() => void); }
interface Window { SandApps: Record<string, SandAppModule>; SandRuntime: typeof SandRuntime; SandDesktop: typeof SandDesktop; SandPackages: typeof SandPackages; }
