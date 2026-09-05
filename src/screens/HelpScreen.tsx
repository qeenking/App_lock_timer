import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageBackground,
  SafeAreaView,
} from 'react-native';
import { CHAR_SIZE, HEADER_TEXT_MAX_W, scaleFont, scaleSize } from '../constants/responsive';

const PURPLE = '#6E62E5';
const PURPLE_LIGHT = '#EDEBFC';
const TEXT_MAIN = '#2B2740';
const TEXT_SUB = '#8B87A6';
const BLUE = '#4A90E2';

interface Props {
  navigation?: { goBack: () => void };
  onBack?: () => void;
}

type Step = { number: number; icon: any; title: string; desc: string };

const STEPS: Step[] = [
  { number: 1, icon: require('../assets/icon_step_password.png'), title: '비밀번호 설정', desc: '앱 제한 비밀번호를 설정하세요.' },
  { number: 2, icon: require('../assets/icon_step_calendar.png'), title: '앱 선택', desc: '제한할 앱을 선택하세요.' },
  { number: 3, icon: require('../assets/icon_step_clock.png'), title: '제한 시간 설정', desc: '사용시간을 설정하세요.' },
  { number: 4, icon: require('../assets/icon_step_check.png'), title: '설정 완료', desc: '설정을 저장하면 제한이 시작돼요.' },
];

type Faq = { question: string; answer: string };

const FAQS: Faq[] = [
  {
    question: '앱 제한이 설정된 시간에 앱을 실행하면 어떻게 되나요?',
    answer:
      '설정한 제한 시간에는 앱이 실행되지 않으며, "사용이 제한된 시간입니다." 라는 안내 메시지가 표시돼요.',
  },
  {
    question: '요일별로 다른 시간을 설정할 수 있나요?',
    answer:
      "네, '요일별 설정'에서 요일마다 다른 사용 시간을 설정할 수 있어요. '주중/주말로 설정'을 선택하면 평일과 주말을 묶어서 한 번에 설정할 수도 있어요.",
  },
  {
    question: '앱 제한 비밀번호를 잊어버렸어요. 어떻게 하나요?',
    answer:
      '비밀번호를 잊으셨다면 앱을 삭제 후 재설치해주세요. 다만 재설치 시 요일별 설정, 휴식 시간 등 저장된 설정도 함께 초기화돼요.',
  },
  {
    question: '휴식 시간 설정은 어떤 의미인가요?',
    answer:
      '휴식 시간으로 설정한 시간대에는 선택한 앱을 아예 실행할 수 없어요. 요일/시작·종료 시간을 자유롭게 설정할 수 있어요.',
  },
  {
    question: '설정한 내용은 언제든지 변경할 수 있나요?',
    answer: '네, 홈 화면이나 요일별 설정 화면에서 언제든지 다시 눌러 값을 바꿀 수 있어요.',
  },
];

export default function HelpScreen({ navigation, onBack }: Props) {
  const handleBack = onBack ?? (() => navigation?.goBack());
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground source={require('../assets/bg_clouds.png')} style={styles.bg} resizeMode="cover">
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── 헤더 ── */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <Text style={styles.title}>도움말</Text>
            <Text style={styles.subtitle}>앱 사용법과 자주 묻는 질문을 확인해보세요.</Text>
            <Image
              source={require('../assets/character_help.png')}
              style={styles.character}
              resizeMode="contain"
            />
          </View>

          {/* ── 1. 앱 사용법 ── */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>1. 앱 사용법</Text>

            <View style={styles.stepsRow}>
              {STEPS.map((step, i) => (
                <React.Fragment key={step.number}>
                  <View style={styles.stepItem}>
                    <Image source={step.icon} style={styles.stepIconImg} resizeMode="contain" />
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <Text style={styles.stepDesc}>{step.desc}</Text>
                  </View>
                  {i < STEPS.length - 1 && <Text style={styles.stepChevron}>›</Text>}
                </React.Fragment>
              ))}
            </View>

            <View style={styles.tipBox}>
              <View style={styles.tipHeaderRow}>
                <Text style={styles.tipHeaderText}>
                  Tip. <Text style={styles.tipHeaderLink}>더 똑똑한 사용을 위해 알아두세요!</Text>
                </Text>
              </View>

              <View style={styles.tipColumnsRow}>
                <View style={styles.tipColumn}>
                  <View style={styles.tipColumnTitleRow}>
                    <Image source={require('../assets/icon_calendar.png')} style={styles.tipColumnIcon} resizeMode="contain" />
                    <Text style={styles.tipColumnTitle}>요일별 설정 방법</Text>
                  </View>
                  <Text style={styles.tipColumnLine}>① '요일별 설정'에서 앱과 요일을 선택해요.</Text>
                  <Text style={styles.tipColumnLine}>② 요일별로 다른 제한 시간을 설정할 수 있어요.</Text>
                </View>
                <View style={styles.tipColumn}>
                  <View style={styles.tipColumnTitleRow}>
                    <Image source={require('../assets/icon_moon.png')} style={styles.tipColumnIcon} resizeMode="contain" />
                    <Text style={styles.tipColumnTitle}>휴식 시간 설정 방법</Text>
                  </View>
                  <Text style={styles.tipColumnLine}>① '휴식 시간 설정'에서 시작/종료 시간을 정해요.</Text>
                  <Text style={styles.tipColumnLine}>
                    ② 해당 시간에는 선택한 앱 사용이 제한돼요. (이 시간에는 앱을 열 수 없어요.)
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── 2. 예상되는 질문과 답변 ── */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>2. 예상되는 질문과 답변</Text>

            {FAQS.map((faq, index) => {
              const expanded = expandedIndex === index;
              return (
                <View key={faq.question} style={[styles.faqItem, index === FAQS.length - 1 && styles.faqItemLast]}>
                  <TouchableOpacity style={styles.faqQuestionRow} onPress={() => toggleFaq(index)} activeOpacity={0.7}>
                    <View style={styles.qBadge}>
                      <Text style={styles.qBadgeText}>Q</Text>
                    </View>
                    <Text style={styles.faqQuestionText}>{faq.question}</Text>
                    <Text style={styles.faqChevron}>{expanded ? '︿' : '⌄'}</Text>
                  </TouchableOpacity>

                  {expanded && (
                    <View style={styles.faqAnswerRow}>
                      <View style={styles.aBadge}>
                        <Text style={styles.aBadgeText}>A</Text>
                      </View>
                      <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F3F1FB' },
  bg: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12 },

  header: { paddingTop: 8, paddingBottom: 8, position: 'relative' },
  backArrow: { fontSize: 24, color: TEXT_MAIN, marginBottom: 12 },
  title: { fontSize: scaleFont(26), fontWeight: '800', color: TEXT_MAIN, maxWidth: HEADER_TEXT_MAX_W },
  subtitle: { fontSize: scaleFont(14), color: TEXT_SUB, marginTop: 4, maxWidth: HEADER_TEXT_MAX_W },
  character: { position: 'absolute', right: 4, top: 28, width: CHAR_SIZE, height: CHAR_SIZE, zIndex: 10, elevation: 10 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginTop: 16,
    shadowColor: '#6E62E5',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: TEXT_MAIN, marginBottom: 14 },

  stepsRow: { flexDirection: 'row', alignItems: 'flex-start' },
  stepItem: { flex: 1, alignItems: 'center' },
  stepIconImg: { width: 48, height: 48, marginBottom: 8 },
  stepTitle: { fontSize: 12, fontWeight: '800', color: TEXT_MAIN, textAlign: 'center' },
  stepDesc: { fontSize: 10, color: TEXT_SUB, textAlign: 'center', marginTop: 3, lineHeight: 13 },
  stepChevron: { fontSize: 16, color: '#D8D5EC', marginTop: 20, marginHorizontal: 2 },

  tipBox: { backgroundColor: '#F3F6FF', borderRadius: 16, padding: 14, marginTop: 18 },
  tipHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  tipHeaderText: { fontSize: 13, fontWeight: '700', color: TEXT_MAIN },
  tipHeaderLink: { color: BLUE, fontWeight: '700' },
  tipColumnsRow: { flexDirection: 'row', gap: 12 },
  tipColumn: { flex: 1 },
  tipColumnTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  tipColumnIcon: { width: 16, height: 16, marginRight: 5 },
  tipColumnTitle: { fontSize: 12, fontWeight: '800', color: BLUE },
  tipColumnLine: { fontSize: 11, color: TEXT_SUB, lineHeight: 16, marginBottom: 2 },

  faqItem: { borderBottomWidth: 1, borderBottomColor: '#F1EFFA', paddingVertical: 12 },
  faqItemLast: { borderBottomWidth: 0 },
  faqQuestionRow: { flexDirection: 'row', alignItems: 'center' },
  qBadge: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: PURPLE,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  qBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  faqQuestionText: { flex: 1, fontSize: 14, fontWeight: '700', color: TEXT_MAIN },
  faqChevron: { fontSize: 14, color: TEXT_SUB, marginLeft: 8 },
  faqAnswerRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 10, paddingLeft: 2 },
  aBadge: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: BLUE,
    alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 1,
  },
  aBadgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  faqAnswerText: { flex: 1, fontSize: 13, color: TEXT_SUB, lineHeight: 20 },
});
