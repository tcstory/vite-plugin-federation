import type { VitePluginFederationConfig } from "../../types";
import type { PluginHook } from "../../types/pluginHook";
import { createModule } from "./createModule";

import traverse from "@babel/traverse";

export default function createRemoteHandler(
  pluginConfig: VitePluginFederationConfig,
  builderInfo: any
): PluginHook {
  pluginConfig.remotes = pluginConfig.remotes ?? {};

  const remotes = Object.keys(pluginConfig.remotes).map(function (key) {
    const external = pluginConfig.remotes[key];

    return {
      id: key,
      regexp: new RegExp(`^${key}/.+?`),
      config: {
        external,
        shareScope: "default",
        format: "esm",
        from: "vite",
        externalType: "url",
      },
    };
  });

  const virtualFile = createModule(remotes);

  return {
    name: "",
    load(_id) {
      if (_id === "id") {
        return virtualFile;
      }
      return null;
    },
    async transform(code: string, id: string) {
      if (remotes.length) {
        let ast = null
        try {
          ast = this.parse(code)
        } catch (err) {
          console.error(err)
        }
        if (!ast) {
          return null
        }

        let requiresRuntime = false

        traverse(ast, {
          importDeclaration(path): any {
            console.log('noting to do', path);
            const moduleId = path.node.source.value
            const remote = remotes.find((r) => r.regexp.test(moduleId))
            if (remote) {
              requiresRuntime = true

              // const needWrap = remote?.config.from === 'vite'
              // const modName = `.${moduleId.slice(remote.id.length)}`
              // const node = recast.parse(`__federation_method_getRemote(${JSON.stringify(
              //   remote.id
              // )} , ${JSON.stringify(
              //   modName
              // )}).then(module=>__federation_method_wrapDefault(module, ${needWrap}))`)
              //
              // path.replace(node)
            }


            return false
          }
        })

        // if (requiresRuntime) {
        //   visit(ast, {
        //     visitProgram(path): any {
        //       const b = recast.types.builders;
        //       b.importDeclaration(
        //         b.importSpecifier(b.identifier),
        //       )
        //       const program = recast.parse(
        //         `import {__federation_method_ensure, __federation_method_getRemote , __federation_method_wrapDefault , __federation_method_unwrapDefault} from '__federation__';\n\n`
        //       )
        //       const firstNode = path.get("elements", 0)
        //       const newNode = program.program.body[0]
        //       console.log('nani????', newNode);
        //       firstNode.insertBefore(newNode)
        //       // path.value.body.unshift(node)
        //       // path.get("elements").insertAt(1, node);
        //       return false
        //     }
        //   })
        // }


        // return recast.print(ast).code
        return false
      }

    }
  };
}
