import { ChartData } from 'chart.js';
import { getGradientDataset } from './utils';
import queries from './query.json';

export const dataset: ChartData = {
  labels: [
    1658959200000, 1658962800000, 1658966400000, 1658970000000, 1658973600000, 1658977200000, 1658980800000,
    1658984400000, 1658988000000, 1658991600000, 1658995200000, 1658998800000, 1659002400000, 1659006000000,
    1659009600000, 1659013200000, 1659016800000, 1659020400000, 1659024000000, 1659027600000, 1659031200000,
  ],
  datasets: [
    {
      type: 'line',
      fill: true,
      label: '',
      backgroundColor: function (context) {
        const chart = context.chart;
        const { ctx, chartArea } = chart;
        if (!chartArea) {
          return;
        }
        return getGradientDataset(ctx, chartArea.height);
      },
      tension: 0.1,
      borderColor: '#85D1FF',
      data: [
        3870656.435873572, 20303442.84243301, 9870745.584670067, 18119.10310769048, 1391805.3657817068,
        709601.2930927166, 2957995.7821783456, 1375131.6048202082, 31223840.806585938, 5658200.949130977,
        11528961.3702773, 4364589.955216116, 17619224.575805992, 3189009.166316627, 12471789.847408978,
        6743201.329580468, 11959193.738618214, 3235987.583562106, 2906243.976728237, 8592833.587312419,
        6334933.402372118,
      ],
    },
  ],
};

export function query() {
  fetch('https://grafana.play.hydration.cloud/api/ds/query', {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    method: 'POST',
    body: JSON.stringify({
      from: '1673015692000',
      to: '1673128707492',
      queries: queries,
    }),
  })
    .then(function (res) {
      console.log(res);
    })
    .catch(function (res) {
      console.log(res);
    });
}
