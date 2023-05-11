import type { Plugin, UserConfig, ConfigEnv } from "vite";
import type { VitePluginFederationConfig } from "../types";
import type { PluginHook } from "../types/pluginHook";
import { defaultEntryFileName } from "./constants";
import { registerHandlers } from "./utils";

export default function federation(
  pluginConfig: VitePluginFederationConfig
): Plugin {
  pluginConfig = Object.assign(
    {
      filename: defaultEntryFileName,
      mode: "production",
    },
    pluginConfig
  );

  let handlerList: PluginHook[] = [];

  const builderInfo = {
    builder: "rollup",
    version: "",
    assetsDir: "",
  };

  return {
    name: "vite-plugin-federation",
    enforce: "post",
    options(options) {
      const result = registerHandlers(pluginConfig, builderInfo, {
        mode: pluginConfig.mode as string,
        command: "",
      });
      handlerList = result.handlerList;

      handlerList.forEach((handler) => {
        handler.options?.call(this, options);
      });

      return options;
    },
    config(config: UserConfig, env: ConfigEnv) {
      pluginConfig.mode = env.mode;

      const result = registerHandlers(pluginConfig, builderInfo, {
        mode: pluginConfig.mode as string,
        command: "",
      });
      handlerList = result.handlerList;

      handlerList.forEach((handler) => {
        handler.config?.call(this, config, env);
      });

      builderInfo.builder = "vite";
      builderInfo.assetsDir = config?.build?.assetsDir ?? "assets";
    },
    buildStart(options) {
      handlerList.forEach((handler) => {
        handler.buildStart?.call(this, options);
      });
    },
    resolveId(id) {
      if (id === "\0__remoteEntryHelper__") {
        return "\0__remoteEntryHelper__";
      } else if (id === '\0__federation__') {
        return '\0__federation__'
      }
      return null;
    },
    load(id) {
      for (const handler of handlerList) {
        const result = handler.load?.call(this, id);
        if (result) {
          return result;
        }
      }

      return null;
    },
    async transform(code: string, id: string) {
      for (const handler of handlerList) {
        const result = await handler.transform?.call(this, code, id);
        if (result) {
          return result;
        }
      }

      return null;
    },
    generateBundle: function (options, bundle, isWrite) {
      for (const handler of handlerList) {
        handler.generateBundle?.call(this, options, bundle, isWrite);
      }
    },
  };
}
