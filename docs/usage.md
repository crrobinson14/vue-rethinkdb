# Usage

Start by installing the plugin, typically in your `main.js` file:

    const VueFirebaseData = require('@webng/vue-fireatbase-data');
    Vue.use(VueFirebaseData);

This plguin looks for a `firebaseData() { ... }` option set on a Vue
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

<dt><a href="#array">varName: { array: ref }</a></dt>
<dd><p>Bind varName to the collection referred to by ref.</p></dd>

<dt><a href="#indexedArray">varName: { indexedArray: ref, valueLookup: fn }</a></dt>
<dd><p>Bind varName to a collection referred to by ref. Call valueLookup with each record to look up a second record to obtain the final value.</p></dd>
</dl>

<a name="value"></a>

### varName: { value: ref }
Bind varName to the value referred to by ref.

**Options**

| Param | Type | Description |
| --- | --- | --- |
| value | <code>Reference</code> | A Firebase Reference to map to |
| onValue | <code>Function(vm, snapshot)</code> | Optional. If supplied, will be called whenever the value changes. |

**Mapped Structure**

| Param | Type | Description |
| --- | --- | --- |
| value | <code>Vue</code> | The mapped value. (e.g. in templates, use <code>myVar.value</code> to render) |
| $$key | <code>string</code> | The key of the mapped value. |
| $$ref | <code>Reference</code> | The reference to the mapped value. |

<a name="array"></a>

### varName: { array: ref }
Bind varName to the collection referred to by ref.

**Options**

| Param | Type | Description |
| --- | --- | --- |
| value | <code>Reference</code> | A Firebase Reference to map to |
| onValue | <code>Function(vm, snapshot)</code> | Optional. If supplied, will be called whenever the value changes. |

**Mapped Structure**

| Param | Type | Description |
| --- | --- | --- |
| value | <code>Vue</code> | The mapped value. (e.g. in templates, use <code>myVar.value</code> to render) |
| $$key | <code>string</code> | The key of the mapped value. |
| $$ref | <code>Reference</code> | The reference to the mapped value. |

<a name="indexedArray"></a>

### varName: { indexedArray: ref }
Bind varName to the collection referred to by ref. Assume each record
contains a reference to a second collection. Execute a callback to look
up each reference to its final value. This is useful for data structures
like:

```json
{
    "books": {
        "1": { title: "Book 1" },
        "2": { title: "Book 2" },
        "3": { title: "Book 3" }
    },
    "users": {
        "sam": {
             name: "Sam Gamgee",
             books: { "1": true, "3": true }
         }
    }
}
```

In this case you may wish to render Sam's list of books. But the only
thing you know at first is Sam's user ID `sam`. With `indexedArray`, you
can do something like:

    <template>
        <div>
            <div v-for="book in books" :key="book.$$key">{{ book.title }}</div>
        </div>
    </template>

    <script>
        import firebase from 'firebase';

        export default {
            name: 'my-component',
            data: () => ({}),
            firebaseData() {
                return {
                    record: {
                        indexedArray: firebase.database().ref('/users/sam/books'),
                        valueLookup: function(vm, snapshot) {
                            return firebase.database.ref('/books/' + snapshot.key);
                        },
                    },
                };
            }
        };
    </script>

**Options**

| Param | Type | Description |
| --- | --- | --- |
| value | <code>Reference</code> | A Firebase Reference to map to |
| valueLookup | <code>Function(vm, snapshot)</code> | Called once for each value added to the index collection. Must return a reference to be used to obtain the value record. |
| onChildAdded | <code>Function(vm, snapshot)</code> | Optional. Called once for each value added to the values collection. |

**Mapped Structure**

| Param | Type | Description |
| --- | --- | --- |
| value | <code>Vue</code> | The final value. |
| $$index | <code>*</code> | The value of the index record. |
| $$key | <code>string</code> | The key of the mapped value. |
| $$ref | <code>Reference</code> | The reference to the mapped value. |
