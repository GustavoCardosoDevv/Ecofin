import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import COLORS from '../theme/colors';


export default function LabeledInput({
label,
placeholder,
value,
onChangeText,
rightElement,
secureTextEntry,
keyboardType,
autoCapitalize,
returnKeyType,
error,
}) {
return (
<View>
{label ? <Text style={styles.label}>{label}</Text> : null}
<View style={styles.inputWrapper}>
<TextInput
style={styles.input}
placeholder={placeholder}
placeholderTextColor={COLORS.gray}
value={value}
onChangeText={onChangeText}
secureTextEntry={secureTextEntry}
keyboardType={keyboardType}
autoCapitalize={autoCapitalize}
returnKeyType={returnKeyType}
/>
{rightElement ? <View style={styles.right}>{rightElement}</View> : null}
</View>
{error ? <Text style={styles.error}>{error}</Text> : null}
</View>
);
}


const styles = StyleSheet.create({
label: {
fontWeight: '600',
color: COLORS.text,
marginBottom: 6,
marginTop: 8,
},
inputWrapper: {
flexDirection: 'row',
alignItems: 'center',
borderWidth: 1,
borderColor: COLORS.border,
backgroundColor: COLORS.white,
borderRadius: 12,
paddingHorizontal: 12,
height: 48,
},
input: {
flex: 1,
color: COLORS.text,
},
right: {
justifyContent: 'center',
alignItems: 'center',
},
error: {
color: COLORS.danger,
marginTop: 6,
},
});