import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import COLORS from '../theme/colors';



export default function EyeToggle({ visible, onPress }) {
return (
<TouchableOpacity onPress={onPress} style={{ paddingHorizontal: 8, paddingVertical: 6 }}>
<Feather name={visible ? 'eye-off' : 'eye'} size={20} color={COLORS.gray} />
</TouchableOpacity>
);
}