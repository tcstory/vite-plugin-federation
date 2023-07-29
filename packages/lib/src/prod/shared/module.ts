import { satisfy } from "__federation_fn_satisfy";

const moduleMap = __rf_var__moduleMap;
const moduleCache = Object.create(null);

async function __importShared(name, shareScope = "default") {
  return moduleCache[name]
    ? Promise.resolve(moduleCache[name])
    : (await __importSharedRuntime(name, shareScope)) ||
        __importSharedLocal(name);
}

async function __importSharedRuntime(name, shareScope) {
  let module = null;
  if (globalThis?.__federation_shared__?.[shareScope]?.[name]) {
    const versionObj = globalThis.__federation_shared__[shareScope][name];
    const versionKey = Object.keys(versionObj)[0];
    const versionValue = Object.values(versionObj)[0];

    if (moduleMap[name]?.requiredVersion) {
      // judge version satisfy
      if (satisfy(versionKey, moduleMap[name].requiredVersion)) {
        module = await (await versionValue.get())();
      } else {
        console.log(
          `provider support ${name}(${versionKey}) is not satisfied requiredVersion(\${moduleMap[name].requiredVersion})`
        );
      }
    } else {
      module = await (await versionValue.get())();
    }
  }
  if (module) {
    if (module.default) module = module.default;
    moduleCache[name] = module;
    return module;
  }
}

async function __importSharedLocal(name) {
  if (moduleMap[name]?.import) {
    let module = await (await moduleMap[name].get())();
    if (module.default) {
      module = module.default;
    }
    moduleCache[name] = module;
    return module;
  } else {
    console.error(
      `consumer config import=false,so cant use callback shared module`
    );
  }
}

export { __importShared, __importSharedRuntime, __importSharedLocal };
