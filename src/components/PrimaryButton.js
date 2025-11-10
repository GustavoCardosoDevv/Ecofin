import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import COLORS from '../theme/colors';


export default function PrimaryButton({ title, onPress, disabled }) {
return (
<TouchableOpacity
activeOpacity={0.9}
onPress={onPress}
disabled={disabled}
style={[styles.button, disabled && styles.disabled]}
>
<Text style={styles.buttonText}>{title}</Text>
</TouchableOpacity>
);
}


const styles = StyleSheet.create({
button: {
backgroundColor: COLORS.blue,
height: 52,
borderRadius: 14,
alignItems: 'center',
justifyContent: 'center',
},
disabled: {
backgroundColor: COLORS.blueDark,
opacity: 0.6,
},
buttonText: {
color: COLORS.white,
fontSize: 16,
fontWeight: '700',
},
});