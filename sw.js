/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-7e5eb42b'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "5a763803679e9f26e7811ab56a90605c"
  }, {
    "url": "pwa-512.png",
    "revision": "3b1237e9d71ad53dc5414a09e5a53576"
  }, {
    "url": "pwa-192.png",
    "revision": "2561a1b98cea079d31cdf803e3fe909f"
  }, {
    "url": "index.html",
    "revision": "496e0a8465e889ea1a51d8bbbd7b9141"
  }, {
    "url": "icons.svg",
    "revision": "21c7473c592c67dc87223d49892c8f0a"
  }, {
    "url": "favicon.svg",
    "revision": "7e840862161341271697daa99a40d76b"
  }, {
    "url": "assets/index-DvLBvAnK.css",
    "revision": null
  }, {
    "url": "assets/index-B5Tvglqk.js",
    "revision": null
  }, {
    "url": "assets/home-banner-CEx0KAxP.png",
    "revision": null
  }, {
    "url": "assets/category-vegetable-CzWIhfr-.png",
    "revision": null
  }, {
    "url": "assets/category-rice-CHH2Gm3z.png",
    "revision": null
  }, {
    "url": "assets/category-pressure-C2PUdZy5.png",
    "revision": null
  }, {
    "url": "assets/category-other-CnrHKnpx.png",
    "revision": null
  }, {
    "url": "assets/category-noodle-DAcceBdq.png",
    "revision": null
  }, {
    "url": "assets/category-meat-CvX8ewno.png",
    "revision": null
  }, {
    "url": "assets/category-fish-Vfihbxtg.png",
    "revision": null
  }, {
    "url": "favicon.svg",
    "revision": "7e840862161341271697daa99a40d76b"
  }, {
    "url": "manifest.webmanifest",
    "revision": "6a23427e47714cbf489e1eb1fa29c641"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));

}));
