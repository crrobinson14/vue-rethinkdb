# VueJS Firebase Data Bridge

[![docs](https://img.shields.io/badge/Project_Docs-mkdocs-blue.svg)](http://webng.gitlab-pages.paltalk.com/vue-firebase-data)
[![build status](http://gitlab.paltalk.com/webng/vue-firebase-data/badges/master/build.svg)](http://gitlab.paltalk.com/webng/vue-firebase-data/pipelines)
[![coverage report](http://gitlab.paltalk.com/webng/vue-firebase-data/badges/master/coverage.svg)](http://webng.gitlab-pages.paltalk.com/vue-firebase-data/coverage/index.html)

This repo provides a simpified Firebase plugin for managing data views
in VueJS. It's similar to `vuefire` but streamlined, and also contains
features similar to `firebaseui` in terms of managing "indexed"
lookups.

## Getting Started

Usage is easy. Simply `npm install -S @webng/vue-firebase-data`. Then use the
module in your app:

    const DateTools = require('@webng/vue-firebase-data');

    const now = Date.now();
    console.log(DateTools.timeAgo(now)); // ==> 'Just now'
