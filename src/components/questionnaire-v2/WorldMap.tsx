import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { useEffect, useState } from 'react';

interface WorldMapProps {
  selectedCountries?: string[];
  onCountrySelect?: (country: string) => void;
  highlightColor?: string;
}

export const WorldMap = ({ selectedCountries = [], onCountrySelect, highlightColor = '#FF6B6B' }: WorldMapProps) => {
  const [worldJson, setWorldJson] = useState<any>(null);

  useEffect(() => {
    // Load world map data
    fetch('https://echarts.apache.org/examples/data/asset/geo/world.json')
      .then(response => response.json())
      .then(data => {
        setWorldJson(data);
        echarts.registerMap('world', data);
      });
  }, []);

  if (!worldJson) {
    return (
      <div className="w-full h-[400px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}'
    },
    geo: {
      map: 'world',
      roam: true,
      zoom: 1.2,
      scaleLimit: {
        min: 1,
        max: 5
      },
      itemStyle: {
        areaColor: '#e0f2fe',
        borderColor: '#0c4a6e'
      },
      emphasis: {
        itemStyle: {
          areaColor: highlightColor
        },
        label: {
          show: true
        }
      },
      select: {
        itemStyle: {
          areaColor: highlightColor
        }
      }
    },
    series: []
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: '400px', width: '100%' }}
      className="rounded-lg"
      onEvents={{
        click: (params: any) => {
          if (onCountrySelect && params.name) {
            onCountrySelect(params.name);
          }
        }
      }}
    />
  );
};
