<template>
    <div>
        <span>{{ record.value }}</span>
    </div>
</template>

<script>
    import firebase from 'firebase';

    export default {
        name: 'indexed-collection',
        data: () => ({}),
        firebaseData() {
            return {
                record: {
                    value: firebase.database().ref('/services/hosting/name')
                },
            };
        }
    };
</script>
