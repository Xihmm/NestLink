import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import RangeSlider from 'rn-range-slider';

export default function BudgetRangeSliderDebug() {
  const [low, setLow] = useState(500);
  const [high, setHigh] = useState(1800);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Budget Slider Debug</Text>
      <Text style={styles.value}>${low} - ${high}</Text>
      <RangeSlider
        style={styles.slider}
        min={0}
        max={3000}
        step={50}
        low={low}
        high={high}
        renderThumb={() => <View style={styles.thumb} />}
        renderRail={() => <View style={styles.rail} />}
        renderRailSelected={() => <View style={styles.railSelected} />}
        onSliderTouchStart={(nextLow, nextHigh) => {
          console.log('[BudgetRangeSliderDebug] touch start', { low: nextLow, high: nextHigh });
        }}
        onValueChanged={(nextLow, nextHigh, fromUser) => {
          console.log('[BudgetRangeSliderDebug] onValueChanged', {
            low: nextLow,
            high: nextHigh,
            fromUser,
          });
          setLow(nextLow);
          setHigh(nextHigh);
        }}
        onSliderTouchEnd={(nextLow, nextHigh) => {
          console.log('[BudgetRangeSliderDebug] touch end', { low: nextLow, high: nextHigh });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 12,
  },
  slider: {
    width: '100%',
    height: 44,
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#3B82F6',
  },
  rail: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
  },
  railSelected: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3B82F6',
  },
});
