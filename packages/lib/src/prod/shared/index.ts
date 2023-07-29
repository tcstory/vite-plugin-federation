import type { VitePluginFederationConfig } from "../../../types";
import type { PluginHook } from "../../../types/pluginHook";
import { readFileSync } from "fs";

export default function createRemoteHandler(
  pluginConfig: VitePluginFederationConfig,
  builderInfo: any
): PluginHook {
  const virtualId = "\0__federation_shared";
  pluginConfig.shared = pluginConfig.shared ?? {};

  const shared = Object.keys(pluginConfig.shared).map(function (key) {
    return {
      id: key,
      import: true,
      shareScope: "default",
      packagePath: key,
      // Whether the path is set manually
      manuallyPackagePathSetting: false,
      generate: true,
    };
  });
  builderInfo.shared = shared;

  return {
    name: "",
    resolveId(id) {
      if (id === virtualId) {
        return virtualId;
      }
      return null;
    },
    load(_id) {
      if (_id === virtualId) {
        return readFileSync("./module.ts", "utf-8");
      }
      return null;
    },
    buildStart() {
      // if (shared.length && isRemote) {
      //   this.emitFile({
      //     fileName: `${
      //       builderInfo.assetsDir ? builderInfo.assetsDir + "/" : ""
      //     }__federation_fn_import.js`,
      //     type: "chunk",
      //     id: "__federation_fn_import",
      //     preserveSignature: "strict",
      //   });
      // }
    },
  };
}
