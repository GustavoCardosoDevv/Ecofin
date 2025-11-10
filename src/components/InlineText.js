import React from 'react';
import { Text, StyleSheet } from 'react-native';
import COLORS from '../theme/colors';


export default function InlineText({ prefix, action, onPress }) {
    return (
        <Text style={styles.inlineText}>
            {prefix}
            <Text style={styles.inlineAction} onPress={onPress}>
                {action}
            </Text>
        </Text>
    );
}


const styles = StyleSheet.create({
    inlineText: {
        textAlign: 'center',
        color: COLORS.gray,
    },
    inlineAction: {
        color: COLORS.blue,
        fontWeight: '700',
    },
});