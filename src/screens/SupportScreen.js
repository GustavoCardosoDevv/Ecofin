import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

// Necessário para animação suave no Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function SupportScreen({ navigation }) {
  const { theme, colors, toggleTheme } = useTheme();

  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);

  // Perguntas e respostas
  const faqData = [
    {
      question: 'Como adicionar uma nova transação?',
      answer:
        'Para adicionar uma nova transação, vá até a tela inicial e toque no botão “+”. Em seguida, escolha o tipo (receita ou despesa), insira os valores e salve.',
    },
    {
      question: 'Como criar um orçamento mensal?',
      answer:
        'No menu principal, acesse “Orçamentos”. Toque em “Criar Novo”, defina o valor total e as categorias. O Ecofin controlará automaticamente seus gastos.',
    },
    {
      question: 'Como exportar meus dados financeiros?',
      answer:
        'Vá até “Configurações da Conta” → “Exportar Dados”. Você poderá escolher entre CSV ou PDF e fazer o download diretamente.',
    },
    {
      question: 'Como configurar metas financeiras?',
      answer:
        'Acesse “Metas” no menu principal, toque em “Nova Meta”, defina o valor-alvo e o prazo. O app acompanhará seu progresso automaticamente.',
    },
  ];

  // Filtro de pesquisa
  const filteredFaq = faqData.filter((item) =>
    item.question.toLowerCase().includes(search.toLowerCase())
  );

  // Expande / recolhe uma pergunta
  const toggleExpand = (index) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(expanded === index ? null : index);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Barra superior */}
      <View
        style={[
          styles.appbar,
          { backgroundColor: colors.primary, borderColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.back, { color: colors.text }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.appbarTitle, { color: colors.text }]}>Tela de Ajuda</Text>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Campo de pesquisa */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Como podemos ajudar?
          </Text>
          <TextInput
            placeholder="Pesquisar ajuda..."
            placeholderTextColor={colors.sub}
            value={search}
            onChangeText={setSearch}
            style={[
              styles.input,
              {
                backgroundColor:
                  theme === 'dark' ? '#1E1E1E' : '#EEF2F6',
                color: colors.text,
              },
            ]}
          />
        </View>

        {/* Lista de perguntas */}
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            Perguntas Frequentes
          </Text>

          {filteredFaq.length === 0 ? (
            <Text style={[styles.noResults, { color: colors.sub }]}>
              Nenhuma pergunta encontrada.
            </Text>
          ) : (
            filteredFaq.map((item, index) => (
              <View key={index}>
                <TouchableOpacity
                  onPress={() => toggleExpand(index)}
                  activeOpacity={0.7}
                  style={styles.questionRow}
                >
                  <Text style={[styles.questionText, { color: colors.text }]}>
                    • {item.question}
                  </Text>
                  <Text style={[styles.icon, { color: colors.sub }]}>
                    {expanded === index ? '▲' : '▼'}
                  </Text>
                </TouchableOpacity>

                {expanded === index && (
                  <Text style={[styles.answer, { color: colors.sub }]}>
                    {item.answer}
                  </Text>
                )}
              </View>
            ))
          )}
        </View>

        {/* Botão para alternar tema */}
        <TouchableOpacity
          onPress={toggleTheme}
          style={[styles.toggleButton, { backgroundColor: colors.primary }]}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>
            Alternar para modo {theme === 'dark' ? 'claro' : 'escuro'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  appbar: {
    height: 54,
    borderRadius: 10,
    margin: 16,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  back: { fontSize: 20, marginRight: 8 },
  appbarTitle: { fontSize: 16, fontWeight: '700', flex: 1, textAlign: 'center' },
  scrollContainer: { padding: 16 },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardTitle: { fontWeight: '800', marginBottom: 10, fontSize: 16 },
  input: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  questionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  questionText: { flex: 1, fontWeight: '600', flexWrap: 'wrap' },
  answer: {
    marginTop: 4,
    backgroundColor: '#F3F6F9',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  icon: { fontSize: 14, marginLeft: 8 },
  noResults: { fontStyle: 'italic', textAlign: 'center', paddingVertical: 10 },
  toggleButton: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 10,
  },
});
