function createRemotesMap(remotes) {
  const createUrl = (remote) => {
    const external = remote.config.external[0];
    const externalType = remote.config.externalType;
    if (externalType === "promise") {
      return `()=>${external}`;
    } else {
      return `'${external}'`;
    }
  };

  // language=JS
  return `
    const remotesMap = {
      ${remotes
        .map(
          (remote) =>
            `'${remote.id}':{url:${createUrl(remote)},format:'${
              remote.config.format
            }',from:'${remote.config.from}'}`
        )
        .join(",\n  ")}
    };
  `;
}

export function createModule(remotes) {
  // language=JS
  return `
    ${createRemotesMap(remotes)}
    const loadJS = async (url, fn) => {
      const resolvedUrl = typeof url === 'function' ? await url() : url;
      const script = document.createElement('script')
      script.type = 'text/javascript';
      script.onload = fn;
      script.src = resolvedUrl;
      document.head.appendChild(script);
    }

    async function __federation_method_ensure(remoteId) {
      const remote = remotesMap[remoteId];

      if (!remote.inited) {
        if ('var' === remote.format) {
          // loading js with script tag
          return new Promise(resolve => {
            const callback = () => {
              if (!remote.inited) {
                remote.lib = window[remoteId];
                // remote.lib.init(wrapShareModule(remote.from))
                remote.inited = true;
              }
              resolve(remote.lib);
            }
            return loadJS(remote.url, callback);
          });
        } else if (['esm', 'systemjs'].includes(remote.format)) {
          // loading js with import(...)
          const getUrl = typeof remote.url === 'function' ? remote.url : () => Promise.resolve(remote.url);

          return getUrl().then(url => {
            return import(/* @vite-ignore */ url)
          }).then(function (lib) {
            if (!remote.inited) {
              // const shareScope = wrapShareModule(remote.from)
              // lib.init(shareScope);
              remote.lib = lib;
              // remote.lib.init(shareScope);
              remote.inited = true;
            }
            return remote.lib
          })
        }
      } else {
        return remote.lib;
      }
    }

    function __federation_method_getRemote(remoteName, componentName) {
      return __federation_method_ensure(remoteName).
      then(function (remote) {
        return remote.get(componentName)
      }).then(function (factory) {
          return factory()
      })
    }

    function __federation_method_wrapDefault(module, need) {
      if (!module?.default && need) {
        let obj = Object.create(null);
        obj.default = module;
        obj.__esModule = true;
        return obj;
      }
      return module;
    }


    export {
      __federation_method_ensure,
      __federation_method_getRemote,
      __federation_method_wrapDefault
    }
  `;
}
