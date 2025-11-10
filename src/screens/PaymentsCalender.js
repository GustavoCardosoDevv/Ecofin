import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput } from 'react-native';
import { Calendar } from 'react-native-calendars';
import Modal from 'react-native-modal';

const PaymentsCalendar = ({ paymentsData, onSavePayment }) => {
  // paymentsData: array de objetos { id, date: 'YYYY-MM-DD', title, amount, paid: boolean }

  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [editingPaymentId, setEditingPaymentId] = useState(null);

  // Carregar marcações a partir dos dados
  useEffect(() => {
    const marks = {};
    paymentsData.forEach(item => {
      if (!marks[item.date]) {
        marks[item.date] = { marked: true, dots: [] };
      }
      marks[item.date].dots.push({
        key: item.id.toString(),
        color: item.paid ? 'green' : 'red',
      });
    });
    setMarkedDates(marks);
  }, [paymentsData]);

  const handleDayPress = day => {
    setSelectedDate(day.dateString);
    setFormTitle('');
    setFormAmount('');
    setEditingPaymentId(null);
    setModalVisible(true);
  };

  const handleSave = () => {
    if (!formTitle || !formAmount) {
      alert('Por favor insira título e valor');
      return;
    }
    const newPayment = {
      id: editingPaymentId || (new Date().getTime()),
      date: selectedDate,
      title: formTitle,
      amount: parseFloat(formAmount),
      paid: false,
    };
    onSavePayment(newPayment, editingPaymentId !== null);
    setModalVisible(false);
  };

  const handleItemPress = item => {
    setSelectedDate(item.date);
    setFormTitle(item.title);
    setFormAmount(item.amount.toString());
    setEditingPaymentId(item.id);
    setModalVisible(true);
  };

  const renderPaymentItem = ({ item }) => (
    <TouchableOpacity style={styles.item} onPress={() => handleItemPress(item)}>
      <Text style={styles.itemTitle}>{item.title}</Text>
      <Text style={styles.itemAmount}>R$ {item.amount.toFixed(2)}</Text>
      <Text style={styles.itemPaid}>{item.paid ? 'Pago' : 'Pendente'}</Text>
    </TouchableOpacity>
  );

  const paymentsForDate = paymentsData.filter(p => p.date === selectedDate);

  return (
    <View style={styles.container}>
      <Calendar
        onDayPress={handleDayPress}
        markedDates={markedDates}
        markingType={'multi-dot'}
        style={styles.calendar}
      />
      {selectedDate && (
        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>Pagamentos em {selectedDate}</Text>
          <FlatList
            data={paymentsForDate}
            keyExtractor={item => item.id.toString()}
            renderItem={renderPaymentItem}
            ListEmptyComponent={<Text style={styles.empty}>Nenhum pagamento nesta data.</Text>}
          />
        </View>
      )}
      <Modal isVisible={modalVisible}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {editingPaymentId ? 'Editar Pagamento' : 'Novo Pagamento'}
          </Text>
          <TextInput
            placeholder="Título"
            value={formTitle}
            onChangeText={setFormTitle}
            style={styles.input}
          />
          <TextInput
            placeholder="Valor"
            value={formAmount}
            onChangeText={setFormAmount}
            keyboardType="numeric"
            style={styles.input}
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.buttonCancel}>
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={styles.buttonSave}>
              <Text style={styles.buttonText}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  calendar: { marginBottom: 10 },
  listContainer: { flex: 1, paddingHorizontal: 16 },
  listTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  item: { padding: 12, backgroundColor: '#fff', borderRadius: 6, marginBottom: 8, elevation: 1 },
  itemTitle: { fontSize: 16, fontWeight: '600' },
  itemAmount: { fontSize: 14, color: '#333' },
  itemPaid: { fontSize: 12, color: '#777' },
  empty: { textAlign: 'center', color: '#777', marginTop: 20 },
  modalContent: { backgroundColor: 'white', padding: 22, borderRadius: 8 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 10, marginBottom: 12 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end' },
  buttonCancel: { marginRight: 10 },
  buttonSave: { backgroundColor: '#0a84ff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 4 },
  buttonText: { color: 'white', fontWeight: 'bold' },
});

export default PaymentsCalendar;