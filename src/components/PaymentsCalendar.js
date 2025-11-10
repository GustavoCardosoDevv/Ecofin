import React, { useMemo, useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';

export default function PaymentsCalendar({
  paymentsData = [],
  onSavePayment,           // (payment, isEdit=false)
  onDeletePayment,         // (id)
  onTogglePaid,            // (id)
  onMonthChange,           // (year, month[1-12])
}) {
  const [selectedDate, setSelectedDate] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');

  // Agrupa marcações por data (ponto verde=pago, vermelho=pendente)
  const markedDates = useMemo(() => {
    return paymentsData.reduce((acc, p) => {
      acc[p.date] = {
        marked: true,
        dotColor: p.paid ? '#2E7D32' : '#C62828',
        ...(selectedDate === p.date ? { selected: true, selectedColor: '#2E7D32' } : {}),
      };
      return acc;
    }, selectedDate ? { [selectedDate]: { selected: true, selectedColor: '#2E7D32' } } : {});
  }, [paymentsData, selectedDate]);

  const openModal = (day) => {
    setSelectedDate(day.dateString);
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!selectedDate || !title || !amount) {
      Alert.alert('Atenção', 'Preencha todos os campos.');
      return;
    }
    const newPayment = {
      // id será criado no Firestore
      date: selectedDate,
      title: title.trim(),
      amount: parseFloat(String(amount).replace(',', '.')) || 0,
      paid: false,
    };
    onSavePayment && onSavePayment(newPayment, false);
    setTitle('');
    setAmount('');
    setModalVisible(false);
  };

  const dayPayments = paymentsData.filter((p) => p.date === selectedDate);

  return (
    <View style={styles.container}>
      <Calendar
        onDayPress={openModal}
        onMonthChange={(m) => onMonthChange && onMonthChange(m.year, m.month)}
        markedDates={markedDates}
        theme={{
          todayTextColor: '#2E7D32',
          selectedDayBackgroundColor: '#2E7D32',
          arrowColor: '#2E7D32',
        }}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedDate ? `Pagamentos em ${selectedDate}` : 'Novo pagamento'}
            </Text>

            {dayPayments.length > 0 && (
              <FlatList
                data={dayPayments}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.paymentItem}>
                    <Ionicons
                      name={item.paid ? 'checkmark-circle' : 'time-outline'}
                      size={20}
                      color={item.paid ? '#2E7D32' : '#C62828'}
                    />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={[styles.paymentText, item.paid && { textDecorationLine: 'line-through', color: '#6B7280' }]}>
                        {item.title || 'Pagamento'}
                      </Text>
                      <Text style={styles.paymentSub}>R$ {Number(item.amount || 0).toFixed(2)} • {item.paid ? 'Pago' : 'Pendente'}</Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.smallBtn, { backgroundColor: item.paid ? '#E5F6EB' : '#EAF2FD' }]}
                      onPress={() => onTogglePaid && onTogglePaid(item.id)}
                    >
                      <Text style={[styles.smallBtnTxt, { color: item.paid ? '#16A34A' : '#2563EB' }]}>
                        {item.paid ? 'Desmarcar' : 'Marcar pago'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.smallBtn, { backgroundColor: '#FEE2E2' }]}
                      onPress={() => {
                        Alert.alert('Excluir', 'Deseja excluir este pagamento?', [
                          { text: 'Cancelar', style: 'cancel' },
                          { text: 'Excluir', style: 'destructive', onPress: () => onDeletePayment && onDeletePayment(item.id) },
                        ]);
                      }}
                    >
                      <Text style={[styles.smallBtnTxt, { color: '#DC2626' }]}>Excluir</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}

            <TextInput
              placeholder="Nome do pagamento"
              value={title}
              onChangeText={setTitle}
              style={styles.input}
            />
            <TextInput
              placeholder="Valor (R$)"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              style={styles.input}
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Salvar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 10 },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#2E7D32', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 10,
    marginVertical: 6,
  },
  saveButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 10,
  },
  saveButtonText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  closeButton: { marginTop: 10 },
  closeButtonText: { textAlign: 'center', color: '#555' },
  paymentItem: { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
  paymentText: { color: '#111', fontWeight: '700' },
  paymentSub: { color: '#6B7280', fontSize: 12 },
  smallBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginLeft: 8 },
  smallBtnTxt: { fontWeight: '800' },
});
