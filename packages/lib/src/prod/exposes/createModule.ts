export function createModule(exposes) {
  const temp: string[] = [];

  for (const expose of exposes) {
    // const exposeFilePath = normalizePath(resolve(expose.import));
    // language=JS
    const statement = `
        return __federation_import('${expose.name}').then(module => module.default);
    `;
    temp.push(`
      "${expose.entryName}": () => {${statement}},
    `);
  }

  // language=JS
  return `
    let moduleMap = {${temp.join("\n")}};

    function __federation_import(name) {
        return import(name);
    };

    export const get = (module) => {
        return moduleMap[module]();
    };

    export const init = (shareScope) => {
        globalThis.__federation_shared__ = globalThis.__federation_shared__ || {};
        Object.entries(shareScope).forEach(([key, value]) => {
          const versionKey = Object.keys(value)[0];
          const versionValue = Object.values(value)[0];
          const scope = versionValue.scope || "default";
          globalThis.__federation_shared__[scope] = globalThis.__federation_shared__[scope] || {};
          const shared = globalThis.__federation_shared__[scope];
          (shared[key] = shared[key] || {})[versionKey] = versionValue;
        });
    };
  `;
}
