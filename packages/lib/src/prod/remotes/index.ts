import type { VitePluginFederationConfig } from "../../../types";
import type { PluginHook } from "../../../types/pluginHook";
import { createModule } from "./createModule";

import template from "@babel/template";
import traverse from "@babel/traverse";
import { parse } from "@babel/parser";
import generate from "@babel/generator";

export default function createRemoteHandler(
  pluginConfig: VitePluginFederationConfig,
  builderInfo: any
): PluginHook {
  const virtualId = "\0__federation_remote";
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
  builderInfo.remotes = remotes;

  const virtualFile = createModule(remotes);

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
        return virtualFile;
      }
      return null;
    },
    async transform(code: string, id: string) {
      if (remotes.length) {
        let ast = null;
        try {
          ast = parse(code, {
            sourceType: "module",
          });
        } catch (err) {
          console.error(err);
        }
        if (!ast) {
          return null;
        }

        let hasImportShared = false;
        traverse(ast, {
          // handle share, eg. replace import {a} from b  -> const a = __import_shared('b')
          ImportDeclaration(path) {
            const moduleId = path.node.source.value;
            const shared = builderInfo.shared.find((r) => r.id === moduleId);
            if (shared) {
              hasImportShared = true

              if (path.node.specifiers?.length) {
                let nodeList = [];
                path.node.specifiers.forEach(function (spec) {
                  let node = null;

                  if (spec.type === "ImportDefaultSpecifier") {
                    node = template.ast(
                      `const ${
                        spec.local.name
                      } = await __import_shared(${JSON.stringify(shared.id)})
                      `
                    );
                  } else {
                    const importedName = spec.imported.name;
                    const localName = spec.local.name;

                    let importedStr = "";
                    if (importedName === localName) {
                      importedStr = `{${localName}}`;
                    } else {
                      importedStr = `{${importedName} : ${localName}}`;
                    }

                    node = template.ast(
                      `const ${importedStr} = await __import_shared(${JSON.stringify(
                        shared.id
                      )});
                      `
                    );
                  }

                  nodeList = nodeList.concat(node);
                });

                path.replaceWithMultiple(nodeList);
              }
            }
          },
        });

        let requiresRuntime = false;
        // handle remote import , eg replace import {a} from 'remote/b' to dynamic import
        traverse(ast, {
          CallExpression(path) {
            if (path.node.callee.type === "Import") {
              const moduleId = path.node.arguments[0].value;

              const remote = remotes.find((r) => r.regexp.test(moduleId));
              if (remote) {
                requiresRuntime = true;

                const modName = `.${moduleId.slice(remote.id.length)}`;
                const needWrap = remote?.config.from === "vite";

                const node = template.ast(`
                  __federation_method_getRemote(${JSON.stringify(
                    remote.id
                  )} , ${JSON.stringify(
                  modName
                )}).then(module=>__federation_method_wrapDefault(module, ${needWrap}))
                `);

                path.replaceWith(node);
              }
            }
          },
          // handle the following code
          // import Button1 from 'remote_app/Button1';
          // import {Button2 as Btn2} from 'remote_app/Button2';
          ImportDeclaration(path) {
            const moduleId = path.node.source.value;
            const remote = remotes.find((r) => r.regexp.test(moduleId));

            if (remote) {
              requiresRuntime = true;

              if (path.node.specifiers?.length) {
                const modName = `.${moduleId.slice(remote.id.length)}`;

                let nodeList = [];
                path.node.specifiers.forEach(function (spec) {
                  let node = null;

                  if (spec.type === "ImportDefaultSpecifier") {
                    node = template.ast(
                      `const ${
                        spec.local.name
                      } = await __federation_method_getRemote(${JSON.stringify(
                        remote.id
                      )} , ${JSON.stringify(modName)}).then(function (mod) {
                        return __federation_method_unwrapDefault(mod)
                      });
                      `
                    );
                  } else {
                    const importedName = spec.imported.name;
                    const localName = spec.local.name;

                    let importedStr = "";
                    if (importedName === localName) {
                      importedStr = `{${localName}}`;
                    } else {
                      importedStr = `{${importedName} : ${localName}}`;
                    }

                    node = template.ast(
                      `const ${importedStr} = await __federation_method_getRemote(${JSON.stringify(
                        remote.id
                      )} , ${JSON.stringify(modName)});
                        `
                    );
                  }

                  nodeList = nodeList.concat(node);
                });

                path.replaceWithMultiple(nodeList);
              }
            }
          },
          // handle the following code
          // export {Button1} from 'remote_app/Button1';
          ExportNamedDeclaration(path) {
            if (!path.node.source) {
              return;
            }
            const moduleId = path.node.source.value;
            const remote = remotes.find((r) => r.regexp.test(moduleId));

            if (remote) {
              requiresRuntime = true;

              if (path.node.specifiers?.length) {
                const modName = `.${moduleId.slice(remote.id.length)}`;

                let nodeList = [];

                path.node.specifiers.forEach(function (spec) {
                  const exportedName = spec.exported.name;
                  const localName = spec.local.name;

                  let importedStr = "";
                  if (exportedName === localName) {
                    importedStr = `{${exportedName}}`;
                  } else {
                    importedStr = `{${localName} : ${exportedName}}`;
                  }
                  const node = template.ast(
                    `const ${importedStr} = await __federation_method_getRemote(${JSON.stringify(
                      remote.id
                    )} , ${JSON.stringify(modName)});
                    export {${exportedName}};
                        `
                  );

                  nodeList = nodeList.concat(node);
                });

                path.replaceWithMultiple(nodeList);
              }
            }
          },
        });

        if (requiresRuntime) {
          const node = template.ast(`
            import {
              __federation_method_ensure,
              __federation_method_getRemote,
              __federation_method_wrapDefault,
            } from '${virtualId}';
          `);
          ast.program.body.unshift(node);
        }

        if (hasImportShared) {
          const node = template.ast(`
            import {
              __import_shared
            } from '\0__federation_shared';
          `);
          ast.program.body.unshift(node);
        }

        if (requiresRuntime || hasImportShared) {
          const result = generate(ast);
          return {
            code: result.code,
            map: { mappings: "" },
          };
        }
      }
    },
  };
}
