import { Plugin as VitePlugin } from "vite";
export interface PluginHook extends VitePlugin {
  virtualFile?: Record<string, unknown>;
}
