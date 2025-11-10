import React, { useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';

export default function PaymentsCalendar({ paymentsData = [], onSavePayment }) {
  const [selectedDate, setSelectedDate] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');

  // 🔹 Agrupar pagamentos por data
  const markedDates = paymentsData.reduce((acc, payment) => {
    acc[payment.date] = {
      marked: true,
      dotColor: payment.paid ? '#2E7D32' : '#C62828',
    };
    return acc;
  }, {});

  const openModal = (day) => {
    setSelectedDate(day.dateString);
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!title || !amount) return;
    const newPayment = {
      id: Date.now(),
      date: selectedDate,
      title,
      amount: parseFloat(amount),
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
        markedDates={{
          ...markedDates,
          [selectedDate]: { selected: true, selectedColor: '#2E7D32' },
        }}
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
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <View style={styles.paymentItem}>
                    <Ionicons
                      name={item.paid ? 'checkmark-circle' : 'time-outline'}
                      size={20}
                      color={item.paid ? '#2E7D32' : '#C62828'}
                    />
                    <Text style={styles.paymentText}>
                      {item.title} - R$ {item.amount.toFixed(2)}
                    </Text>
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
  paymentItem: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  paymentText: { marginLeft: 8, color: '#333' },
});
