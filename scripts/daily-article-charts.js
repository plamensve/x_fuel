import React from 'https://esm.sh/react@18.3.1';
import { createRoot } from 'https://esm.sh/react-dom@18.3.1/client';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, LabelList
} from 'https://esm.sh/recharts@2.15.4?deps=react@18.3.1,react-dom@18.3.1';

const h = React.createElement;
const COLORS = ['#2563eb', '#0f766e', '#d97706', '#7c3aed'];
const money = (v) => Number.isFinite(Number(v)) ? `${Number(v).toFixed(2).replace('.', ',')} €` : '—';

function valueDomain(data, keys) {
  const values = [];
  data.forEach(row => keys.forEach(k => {
    const v = Number(row[k]);
    if (Number.isFinite(v)) values.push(v);
  }));
  if (!values.length) return [0, 1];
  const min = Math.min(...values), max = Math.max(...values);
  const spread = Math.max(max - min, 0.02);
  const pad = Math.max(spread * 0.35, 0.03);
  return [Math.max(0, min - pad), max + pad];
}

function ValueLabel(props) {
  const { x, y, width, value } = props;
  if (value == null || !Number.isFinite(Number(value))) return null;
  return h('text', {
    x: Number(x) + Number(width) / 2,
    y: Number(y) - 9,
    textAnchor: 'middle',
    fill: '#0f172a',
    fontSize: 17,
    fontWeight: 800
  }, money(value));
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return h('div', { className: 'recharts-editorial-tooltip' },
    h('strong', null, label || ''),
    ...payload.filter(p => p.value != null).map((p, i) =>
      h('div', { key: `${p.dataKey}-${i}` }, `${p.name}: ${money(p.value)}`)
    )
  );
}

function CityChart({ spec }) {
  const data = spec.data || [];
  const keys = spec.series.map(s => s.key);
  const domain = valueDomain(data, keys);
  return h(ResponsiveContainer, { width: '100%', height: 430 },
    h(BarChart, { data, margin: { top: 42, right: 28, left: 12, bottom: 42 } },
      h(CartesianGrid, { strokeDasharray: '3 3', vertical: false, opacity: 0.25 }),
      h(XAxis, { dataKey: 'fuel', tick: { fontSize: 16, fontWeight: 700 }, interval: 0, angle: -6, height: 58 }),
      h(YAxis, { domain, tickFormatter: v => Number(v).toFixed(2).replace('.', ','), tick: { fontSize: 15 }, width: 66 }),
      h(Tooltip, { content: h(ChartTooltip) }),
      ...spec.series.map((s, i) => h(Bar, { key: s.key, dataKey: s.key, name: s.label, fill: COLORS[i % COLORS.length], radius: [8, 8, 0, 0], maxBarSize: 76 },
        h(LabelList, { dataKey: s.key, content: h(ValueLabel) })
      ))
    )
  );
}

function ComparisonChart({ spec }) {
  const data = spec.data || [];
  const keys = spec.series.map(s => s.key);
  const domain = valueDomain(data, keys);
  return h(ResponsiveContainer, { width: '100%', height: 520 },
    h(BarChart, { data, margin: { top: 42, right: 24, left: 10, bottom: 58 } },
      h(CartesianGrid, { strokeDasharray: '3 3', vertical: false, opacity: 0.25 }),
      h(XAxis, { dataKey: 'city', tick: { fontSize: 16, fontWeight: 700 }, interval: 0, height: 56 }),
      h(YAxis, { domain, tickFormatter: v => Number(v).toFixed(2).replace('.', ','), tick: { fontSize: 15 }, width: 66 }),
      h(Tooltip, { content: h(ChartTooltip) }),
      h(Legend, { wrapperStyle: { fontSize: 16, fontWeight: 700, paddingTop: 12 } }),
      ...spec.series.map((s, i) => h(Bar, { key: s.key, dataKey: s.key, name: s.label, fill: COLORS[i % COLORS.length], radius: [7, 7, 0, 0], maxBarSize: 42 }))
    )
  );
}

function TrendChart({ spec }) {
  const data = spec.data || [];
  const keys = spec.series.map(s => s.key);
  const domain = valueDomain(data, keys);
  return h(ResponsiveContainer, { width: '100%', height: 450 },
    h(LineChart, { data, margin: { top: 38, right: 30, left: 12, bottom: 28 } },
      h(CartesianGrid, { strokeDasharray: '3 3', opacity: 0.25 }),
      h(XAxis, { dataKey: 'day', tick: { fontSize: 16, fontWeight: 700 } }),
      h(YAxis, { domain, tickFormatter: v => Number(v).toFixed(2).replace('.', ','), tick: { fontSize: 15 }, width: 66 }),
      h(Tooltip, { content: h(ChartTooltip) }),
      h(Legend, { wrapperStyle: { fontSize: 16, fontWeight: 700 } }),
      ...spec.series.map((s, i) => h(Line, { key: s.key, type: 'monotone', dataKey: s.key, name: s.label, stroke: COLORS[i % COLORS.length], strokeWidth: 3, dot: { r: 5 }, activeDot: { r: 7 }, connectNulls: false }))
    )
  );
}

function App({ spec }) {
  const chart = spec.type === 'trend' ? h(TrendChart, { spec }) : spec.type === 'comparison' ? h(ComparisonChart, { spec }) : h(CityChart, { spec });
  return h('div', { className: 'recharts-editorial-card' },
    h('div', { className: 'recharts-editorial-head' }, h('h3', null, spec.title), spec.subtitle ? h('p', null, spec.subtitle) : null),
    chart,
    spec.note ? h('p', { className: 'recharts-editorial-note' }, spec.note) : null
  );
}

document.querySelectorAll('.recharts-article-chart[data-chart]').forEach(node => {
  try {
    const spec = JSON.parse(node.dataset.chart);
    createRoot(node).render(h(App, { spec }));
  } catch (error) {
    console.error('Article chart render failed', error);
    node.innerHTML = '<p class="chart-fallback">Графиката не можа да се зареди.</p>';
  }
});
