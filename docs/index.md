# Vue JS Modules

[![docs](https://img.shields.io/badge/Project_Docs-mkdocs-blue.svg)](http://webng.gitlab-pages.paltalk.com/vuejs-modules)
[![build status](http://gitlab.paltalk.com/webng/vuejs-modules/badges/master/build.svg)](http://gitlab.paltalk.com/webng/vuejs-modules/pipelines)
[![coverage report](http://gitlab.paltalk.com/webng/vuejs-modules/badges/master/coverage.svg)](http://webng.gitlab-pages.paltalk.com/vuejs-modules/coverage/index.html)

This repo contains a number of reusable components we've found valuable
in our VueJS projects. Please see the docs above for more details.

* **EventBus** - Pub/sub message handling mechanics. See
  [TestEventBus.vue](./src/components/TestEventBus.vue) for sample usage.
* **FirebaseAuthListener** - Listens to Firebase Auth events.
* **FirebaseDataProvider** - Value/Array management for Firebase
  Realtime Database. See [TestFirebaseDataProvider.vue](./src/components/TestFirebaseDataProvider.vue)
  for sample usage.
* **DateTools** - Various date formatting tools to reduce MomentJS
  usage within our projects.
* **Logger** - Logging mixin.

## Development

After cloning the project, run `npm install`. After that it's only
necessary to run `npm run build` to build and publish new versions.
Note that the build process bumps the patch level for the package.
This produces a Git commit. Make sure you push after this!
