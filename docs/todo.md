### TODOs
| Filename | line # | TODO
|:------|:------:|:------
| src/index.js | 146 | Minor memleak. The listener is not cleaned up until the entire collection is destroyed.
| src/index.js | 156 | Add processing for childChanged for indexedCollection bindings.
| test/specs/Value.spec.js | 34 | Add a test for null value mapping
| test/specs/Value.spec.js | 35 | Add a test for object mapping
