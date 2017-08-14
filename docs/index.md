# VueJS Firebase Data Bridge

[![docs](https://img.shields.io/badge/Project_Docs-mkdocs-blue.svg)](http://webng.gitlab-pages.paltalk.com/vue-firebase-data)
[![build status](http://gitlab.paltalk.com/webng/vue-firebase-data/badges/master/build.svg)](http://gitlab.paltalk.com/webng/vue-firebase-data/pipelines)
[![coverage report](http://gitlab.paltalk.com/webng/vue-firebase-data/badges/master/coverage.svg)](http://webng.gitlab-pages.paltalk.com/vue-firebase-data/coverage/index.html)

This repo provides a simpified Firebase plugin for managing data views
in VueJS. It's similar to `vuefire` but streamlined, and also contains
features similar to `firebaseui` in terms of managing "indexed"
lookups.

## Getting Started

Usage is easy. Simply `npm install -S @webng/vue-firebase-data`, and
add the plugin to VueJS, typically in your `main.js` file:

    import VueFirebaseData from '@webng/vue-firebase-data';
    Vue.use(VueFirebaseData);

Then use the module in your app as shown below. Refer to [Usage](usage)
for full usage documentation.

The examples below all assume the following (very common) data
structure:

```json
{
    "orgs": {
        "A": {
            "name": "Organization A",
            "otherData": "XYZ..."
        },
        "B": {
            "name": "Organization B",
            "otherData": "XYZ..."
        },
        "C": {
            "name": "Organization C",
            "otherData": "XYZ..."
        },
        "D": {
            "name": "Organization D",
            "otherData": "XYZ..."
        },
    },
    "users": {
        "1": {
            "name": "Chad",
            "orgs": {
                "A": true,
                "D": true
            }
        }
    }
}
```

Given this data, a user profile page is as simple as:

```js
<template>
    <div>
        <span>{{ user.name }}</span>
    </div>
</template>

<script>
    import firebase from 'firebase';

    export default {
        name: 'user-profile',
        props: ['userId'],
        data: () => ({}),
        firebaseData() {
            return {
                user: {
                    value: firebase.database().ref(`/users/${userId}`)
                },
            };
        }
    };
</script>
```

Note that there may be some special handling of the binding if the
return type is not an object:

1. `null` values (which Firebase cannot store, but returns when you
  request records that do not exist) are mapped to empty objects `{}`.
1. Discrete values (e.g. strings) are mapped as `FIELDNAME.value`,
  where FIELDNAME is the name you provide. This is done to allow for
  Reactive binding requirements in VueJS.

## Collections

Collections are just as simple. Note the use of the special `$$.key`
field to access the unique identifier for each record in the collection.

```js
<template>
    <div>
        <div v-for="org in orgs" key="org.$$key">{{ user.name }}</span>
    </div>
</template>

<script>
    import firebase from 'firebase';

    export default {
        name: 'orgs',
        data: () => ({}),
        firebaseData() {
            return {
                user: {
                    collection: firebase.database().ref(`/orgs`)
                },
            };
        }
    };
</script>
```

## Indexed Collections

A common pattern with data sets similar to the one above is "display the
organizations the user belongs to." In this case you want to display the
organization name, not its ID. This plugin makes it easy to deal with
"flattened" data sets by performing the secondary lookups to obtain the
actual data values. All you need to do is provide a mapper function to
map between index and data values:

```js
<template>
    <div>
        <span>{{ record.value }}</span>
    </div>
</template>

<script>
    import firebase from 'firebase';
    const db = firebase.database();

    export default {
        name: 'value',
        props: ['userId'],
        data: () => ({}),
        firebaseData() {
            return {
                orgs: {
                    indexedCollection: db.ref(`/users/${userId}`)
                    valueLookup: snapshot => db.ref(`/orgs/${snapshot.key}`),
                },
            };
        }
    };
</script>
```

Please refer to [Usage](usage) for full documentation on the available
options.
