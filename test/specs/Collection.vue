<template>
    <div>
        <div v-for="entry in collection1" :key="entry.$$key">{{ entry.$$key }} - {{ entry.name }}</div>
    </div>
</template>

<script>
    import firebase from 'firebase';

    export default {
        name: 'collection',
        data: () => ({}),
        firebaseData() {
            return {
                collection1: {
                    collection: firebase.database().ref('/apps/collection1').orderByKey()
                },
            };
        }
    };
</script>
