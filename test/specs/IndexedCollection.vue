<template>
    <div>
        <div v-for="entry in collection2" :key="entry.$$key">{{ entry.$$key }} - {{ entry.value.name }}</div>
    </div>
</template>

<script>
    import firebase from 'firebase';

    export default {
        name: 'collection',
        data: () => ({}),
        firebaseData() {
            return {
                collection2: {
                    indexedCollection: firebase.database().ref('/apps/collection2/abc/collection1Entries'),
                    valueLookup: snapshot => firebase.database().ref(`/apps/collection1/${snapshot.key}`)
                },
            };
        }
    };
</script>
