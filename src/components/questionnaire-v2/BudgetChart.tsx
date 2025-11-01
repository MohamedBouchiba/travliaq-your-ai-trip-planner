import ReactECharts from 'echarts-for-react';

interface BudgetChartProps {
  value: number;
  max?: number;
}

export const BudgetChart = ({ value, max = 5000 }: BudgetChartProps) => {
  const percentage = (value / max) * 100;

  const option = {
    series: [
      {
        type: 'gauge',
        startAngle: 180,
        endAngle: 0,
        center: ['50%', '75%'],
        radius: '90%',
        min: 0,
        max: max,
        splitNumber: 8,
        axisLine: {
          lineStyle: {
            width: 6,
            color: [
              [0.3, '#67e8f9'],
              [0.7, '#22d3ee'],
              [1, '#0891b2']
            ]
          }
        },
        pointer: {
          icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
          length: '12%',
          width: 20,
          offsetCenter: [0, '-60%'],
          itemStyle: {
            color: 'auto'
          }
        },
        axisTick: {
          length: 12,
          lineStyle: {
            color: 'auto',
            width: 2
          }
        },
        splitLine: {
          length: 20,
          lineStyle: {
            color: 'auto',
            width: 5
          }
        },
        axisLabel: {
          color: '#464646',
          fontSize: 12,
          distance: -60,
          rotate: 'tangential',
          formatter: function (value: number) {
            if (value === max) {
              return value + '+';
            }
            return value;
          }
        },
        title: {
          offsetCenter: [0, '-10%'],
          fontSize: 20,
          color: '#0c4a6e'
        },
        detail: {
          fontSize: 30,
          offsetCenter: [0, '-35%'],
          valueAnimation: true,
          formatter: function (value: number) {
            return '€' + Math.round(value);
          },
          color: 'inherit'
        },
        data: [
          {
            value: value,
            name: 'Budget'
          }
        ]
      }
    ]
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: '300px', width: '100%' }}
      className="rounded-lg"
    />
  );
};
