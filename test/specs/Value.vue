<template>
    <div>
        <span class="number">{{ numberValue.value }}</span>
        <span class="string">{{ stringValue.value }}</span>
        <span class="bool">{{ boolValue.value }}</span>
        <span class="object">{{ objectValue.string }}</span>
        <span class="null">{{ nullValue.value }}</span>
    </div>
</template>

<script>
    import firebase from 'firebase';

    export default {
        name: 'value',
        data: () => ({
            valueCallbacks: 0
        }),
        firebaseData() {
            return {
                numberValue: {
                    value: firebase.database().ref('/apps/numberValue'),
                    onValue: () => this.valueCallbacks++,
                },
                stringValue: {
                    value: firebase.database().ref('/apps/stringValue'),
                    onValue: () => this.valueCallbacks++,
                },
                boolValue: {
                    value: firebase.database().ref('/apps/boolValue'),
                    onValue: () => this.valueCallbacks++,
                },
                objectValue: {
                    value: firebase.database().ref('/apps/objectValue'),
                    onValue: () => this.valueCallbacks++,
                },
                nullValue: {
                    value: firebase.database().ref('/apps/INVALID'),
                    onValue: () => this.valueCallbacks++,
                },
            };
        }
    };
</script>
