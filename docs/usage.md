# Usage

Start by installing the plugin, typically in your `main.js` file:

    import VueFirebaseData from '@webng/vue-firebase-data';
    Vue.use(VueFirebaseData);

This plugin looks for a `firebaseData() { ... }` option set on a Vue
component. The variables defined in that function are mapped to Firebase
and set (reactively) on the component instance as data in various ways.
For example, for a simple value:

    <template>
        <div>{{ record.value }}</div>
    </template>

    <script>
        import firebase from 'firebase';

        export default {
            name: 'my-component',
            data: () => ({}),
            firebaseData() {
                return {
                    record: {
                        value: firebase.database().ref('/path/to/value')
                    },
                };
            }
        };
    </script>

## Mapping Options

There are a variety of ways Firebase data can be mapped into variables
for the component to use.

<dl>
<dt><a href="#value">varName: { value: ref }</a></dt>
<dd><p>Bind varName to the value referred to by ref.</p></dd>

<dt><a href="#collection">varName: { collection: ref }</a></dt>
<dd><p>Bind varName to the collection referred to by ref.</p></dd>

<dt><a href="#indexedCollection">varName: { indexedCollection: ref, valueLookup: fn }</a></dt>
<dd><p>Bind varName to an index collection referred to by ref. Call valueLookup with each index record to look up the final data record.</p></dd>
</dl>

---

<a name="value"></a>
### varName: { value: ref }

Bind varName to a single value.

**Options**

| Param | Type | Description |
| --- | --- | --- |
| **value** | <code>Reference</code> | A Firebase Reference to bind to |
| onValue | <code>Function(vm, snapshot)</code> | Optional. If supplied, will be called whenever the value changes. |

**Mapped Structure in `varName`:**

| Param | Type | Description |
| --- | --- | --- |
| value | <code>Vue</code> | Only present if `ref` points to a discrete value. Contains that value. |
| *OTHER FIELDS* | <code>Vue</code> | If `ref` points to an object, its fields will be merged into the object at this level. |
| $$key | <code>string</code> | The key of the mapped value. |
| $$ref | <code>Reference</code> | The reference to the mapped value. |

Specific handling will be applied based on what `ref` points to:

1. If `null` is returned, this indicates a missing/empty value. The
  `value` field will be present, but set to an empty object `{}`.
1. If a discrete value is returned, the `value` field will be present,
  and set to that value.
1. If an object is returned, its fields will be present here instead.

---

<a name="collection"></a>
### varName: { collection: ref }

Bind varName to the collection referred to by ref. Note that in Firebase,
arrays are considered an anti-pattern - developers are expected to use
KEY:VALUE maps instead. However, when retrieving data, sort operators
(or implicit sorting) will add deterministic ordering to the results,
and operators such as added/removed/moved make the results appear
"array-like". Therefore, the client-side behavior is as if the data were
stored in an array (which is convenient, because it means `v-for` can
work directly on this data.)

**Options**

| Param | Type | Description |
| --- | --- | --- |
| **collection** | <code>Reference</code> | A Firebase Reference to bind to. This should be a collection of KEY:VALUE pairs. |
| onChildAdded | <code>Function(vm, array, index, entry)</code> | Optional. If supplied, will be called whenever a record is added. |
| onChildRemoved | <code>Function(vm, array, index, entry)</code> | Optional. If supplied, will be called whenever a record is removed. |
| onChildChanged | <code>Function(vm, array, index, oldValue, newValue)</code> | Optional. If supplied, will be called whenever a record is updated. |
| onChildMoved | <code>Function(vm, array, oldIndex, newIndex, entry)</code> | Optional. If supplied, will be called whenever a record is moved. |
| onValue | <code>Function(vm, snapshot)</code> | Optional. If supplied, will be called whenever the data value changes. |

**Mapped Structure in each record in `varName[]`:**

| Param | Type | Description |
| --- | --- | --- |
| Array(object) | <code>Vue</code> | The mapped value. (e.g. in templates, use <code>myVar.value</code> to render) |
| $$key | <code>string</code> | The key of the mapped value. |
| $$ref | <code>Reference</code> | The reference to the mapped value. |

---

<a name="indexedCollection"></a>
### varName: { indexedCollection: ref, valueLookup: fn(snapshot) }

| Param | Type | Description |
| --- | --- | --- |
| **indexedCollection** | <code>Reference</code> | A Firebase Reference for the initial, "index" collection. |
| **valueLookup** | <code>Function(vm, snapshot)</code> | Called once for each entry found in the index collection. Must return a reference to the value record. |
| onChildAdded | <code>Function(vm, array, index, entry)</code> | Optional. If supplied, will be called whenever a record is added. |
| onChildRemoved | <code>Function(vm, array, index, entry)</code> | Optional. If supplied, will be called whenever a record is removed. |
| onChildMoved | <code>Function(vm, array, oldIndex, newIndex, entry)</code> | Optional. If supplied, will be called whenever a record is moved. |
| onValue | <code>Function(vm, snapshot)</code> | Optional. If supplied, will be called whenever the data value changes. |

**Mapped Structure in each record in `varName[]`:**

| Param | Type | Description |
| --- | --- | --- |
| value | <code>Vue</code> | The final value. |
| $$index | <code>*</code> | The value of the index record. |
| $$ready | <code>boolean</code> | True if the data value has been looked up. May be used to "gate" rendering data until it has arrived. |
| $$key | <code>string</code> | The key of the mapped value. |
| $$ref | <code>Reference</code> | The reference to the mapped value. |
