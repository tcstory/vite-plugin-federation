import { relative, dirname } from "path";
import type { VitePluginFederationConfig } from "../../../types";
import type { PluginHook } from "../../../types/pluginHook";
import type { OutputChunk } from "rollup";
import { ResolvedConfig } from "vite";
import { createModule } from "./createModule";

export default function createExposeHandler(
  pluginConfig: VitePluginFederationConfig,
  builderInfo: any
): PluginHook {
  const virtualId = "\0__remote_entry_helper";

  pluginConfig.exposes = pluginConfig.exposes ?? {};

  const exposes = Object.keys(pluginConfig.exposes).map(function (key) {
    const expose = {
      entryName: key,
      import: pluginConfig.exposes[key],
      emitFile: null,
      name: null,
      id: null,
    };
    expose.name = `__federation_expose_${expose.entryName.replace(
      /[^0-9a-zA-Z_-]+/g,
      ""
    )}`;

    return expose;
  });
  builderInfo.exposes = exposes;

  const virtualFile = createModule(exposes);

  return {
    name: "",
    configResolved(config: ResolvedConfig) {
      //
    },
    async buildStart() {
      if (exposes.length > 0) {
        this.emitFile({
          fileName: `${
            builderInfo.assetsDir ? builderInfo.assetsDir + "/" : ""
          }${pluginConfig.filename}`,
          type: "chunk",
          id: virtualId,
          preserveSignature: "strict",
        });

        for (const expose of exposes) {
          // const result = await this.resolve(expose.import)
          expose.id = (await this.resolve(expose.import))?.id;

          if (!expose.id) {
            this.error(
              `Cannot find file ${expose.import}, please check your 'exposes.import' config.`
            );
          }

          expose.emitFile = this.emitFile({
            type: "chunk",
            id: expose.id,
            name: expose.name,
            preserveSignature: "allow-extension",
          });
        }
      }
    },
    resolveId(id) {
      if (id === virtualId) {
        return virtualId;
      }
      return null;
    },
    load(id) {
      if (id === virtualId) {
        return virtualFile;
      }
      return null;
    },
    generateBundle(options, bundle) {
      let remoteEntryChunk;
      for (const key in bundle) {
        const chunk = bundle[key] as OutputChunk;
        if (chunk?.facadeModuleId === "\x00__remote_entry_helper") {
          remoteEntryChunk = chunk;
          break;
        }
      }
      if (remoteEntryChunk) {
        for (const expose of exposes) {
          const key = Object.keys(bundle).find((key) => {
            const chunk = bundle[key];
            return chunk.name === expose.name;
          });

          if (key) {
            const chunk = bundle[key];
            const fileRelativePath = relative(
              dirname(remoteEntryChunk.fileName),
              chunk.fileName
            );
            const slashPath = fileRelativePath.replace(/\\/g, "/");
            remoteEntryChunk.code = remoteEntryChunk.code.replace(
              expose.name,
              `./${slashPath}`
            );
          }
        }
      }
    },
  };
}
