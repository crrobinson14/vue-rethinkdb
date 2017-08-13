<template>
    <div>
        <div v-for="service in services"></div>
        <span>{{ record.value }}</span>
    </div>
</template>

<script>
    import firebase from 'firebase';

    export default {
        name: 'collection',
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
