# Date Tools

[![docs](https://img.shields.io/badge/Project_Docs-mkdocs-blue.svg)](http://webng.gitlab-pages.paltalk.com/date-tools)
[![build status](http://gitlab.paltalk.com/webng/date-tools/badges/master/build.svg)](http://gitlab.paltalk.com/webng/date-tools/pipelines)
[![coverage report](http://gitlab.paltalk.com/webng/date-tools/badges/master/coverage.svg)](http://webng.gitlab-pages.paltalk.com/date-tools/coverage/index.html)

This repo provides simpified date-management tools to eliminate the need
to install MomentJS. Moment is great, but also huge, and doesn't Webpack
very well. Please see the docs link above for more information.

## Getting Started

Usage is easy. Simply `npm install -S @webng/date-tools`. Then use the
module in your app:

    const DateTools = require('@webng/date-tools');

    const now = Date.now();
    console.log(DateTools.timeAgo(now)); // ==> 'Just now'
