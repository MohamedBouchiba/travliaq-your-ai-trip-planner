import ReactECharts from 'echarts-for-react';

interface ProgressRingProps {
  percentage: number;
  title?: string;
}

export const ProgressRing = ({ percentage, title = "Progression" }: ProgressRingProps) => {
  const option = {
    series: [
      {
        type: 'pie',
        radius: ['70%', '90%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          position: 'center',
          formatter: `{a|${Math.round(percentage)}%}\n{b|${title}}`,
          rich: {
            a: {
              fontSize: 28,
              fontWeight: 'bold',
              color: '#0c4a6e',
              lineHeight: 40
            },
            b: {
              fontSize: 14,
              color: '#64748b'
            }
          }
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 32,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: [
          {
            value: percentage,
            name: 'Complété',
            itemStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: '#06b6d4' },
                  { offset: 1, color: '#0891b2' }
                ]
              }
            }
          },
          {
            value: 100 - percentage,
            name: 'Restant',
            itemStyle: {
              color: '#e0f2fe'
            }
          }
        ]
      }
    ]
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: '200px', width: '200px' }}
      className="mx-auto"
    />
  );
};
