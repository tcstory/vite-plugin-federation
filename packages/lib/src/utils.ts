import type { PluginHook } from "../types/pluginHooks";
import type { VitePluginFederationConfig } from "../types";
import createExposeHandler from "./prod/expose";

interface Result {
  handlerList: PluginHook[];
  virtualFile: object;
}

export function isEmptyObject(obj) {
  return Object.keys(obj).length === 0;
}

export const registerHandlers = (function () {
  let result = {} as Result;

  return function (
    pluginConfig: VitePluginFederationConfig,
    buildInfo,
    { mode, command }
  ): Result {
    if (!isEmptyObject(result)) {
      return result;
    }

    let shareHandler;
    let exposeHandler;
    let remoteHandler;

    if (mode === "development" || command === "serve") {
      //
    } else if (mode === "production" || command === "build") {
      exposeHandler = createExposeHandler(pluginConfig, buildInfo);
    } else {
      //
    }

    const handlerList = [shareHandler, exposeHandler, remoteHandler].filter(
      (item) => item
    );

    result = {
      handlerList,
      virtualFile: handlerList
        .filter((handler) => handler.virtualFile)
        .reduce(function (acc, cur) {
          return Object.assign(acc, cur.virtualFile);
        }, {}),
    };

    return result;
  };
})();
