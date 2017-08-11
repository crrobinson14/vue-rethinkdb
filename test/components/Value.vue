<template>
    <span>{{ val }}</span>
</template>

<script>
    const firebase = require('firebase');

    export default {
        name: 'value',
        data() {
            return {};
        },
        firebaseData() {
            return {
                // Bind "rule" to a discrete value. Will produce `ruleName: { $$key, $$ref, value: 'XYZ' }`.
                val: { value: firebase.database().ref('/services/hosting/name') },
            };
        },
    };
</script>
