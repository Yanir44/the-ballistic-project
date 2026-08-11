import { Chart, registerables } from 'chart.js';
import type { ChartData, ChartOptions } from 'chart.js';
import type { TrajectoryPoint } from '../physics/simulate';
import { getTheme } from './theme';

Chart.register(...registerables);

export type ChartTab = 'side' | 'top' | 'speed' | 'forces';

let activeChart: Chart | null = null;

function downsample(pts: TrajectoryPoint[], max = 800): TrajectoryPoint[] {
  if (pts.length <= max) return pts;
  const step = Math.ceil(pts.length / max);
  return pts.filter((_, i) => i % step === 0);
}

export function renderChart(
  canvas: HTMLCanvasElement,
  trajectory: TrajectoryPoint[],
  tab: ChartTab,
  compareTrajectory?: TrajectoryPoint[],
  compareColor?: string
): Chart {
  if (activeChart) { activeChart.destroy(); activeChart = null; }

  const pts  = downsample(trajectory);
  const pts2 = compareTrajectory ? downsample(compareTrajectory) : null;

  const isDark = getTheme() === 'dark';
  const CYAN   = isDark ? '#00d4ff' : '#0284c7';
  const GOLD   = isDark ? '#f5c518' : '#d97706';
  const PINK   = isDark ? '#ff4fcf' : '#db2777';
  const RED    = isDark ? '#ff4545' : '#e11d48';
  const GRID   = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.08)';
  const TEXT   = isDark ? '#6080a0' : '#475569';
  const LEGEND = isDark ? '#a0b0d0' : '#334155';
  const TT_BG  = isDark ? 'rgba(6,11,24,0.92)' : 'rgba(255,255,255,0.95)';
  const TT_TXT = isDark ? '#e0e6ff' : '#0f172a';

  let data: ChartData;
  let options: ChartOptions;
  const base: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 800, easing: 'easeInOutQuart' },
    plugins: {
      legend: { labels: { color: LEGEND, font: { family: 'Outfit' } } },
      tooltip: {
        backgroundColor: TT_BG,
        titleColor: CYAN,
        bodyColor: TT_TXT,
        borderColor: CYAN,
        borderWidth: 1,
        callbacks: {
          label: (ctx) => {
            const p = pts[ctx.dataIndex];
            if (!p) return '';
            return [
              `  Alt: ${p.y.toFixed(1)} m`,
              `  Speed: ${p.speed.toFixed(1)} m/s`,
              `  Mach: ${p.mach.toFixed(3)}`,
              `  t: ${p.t.toFixed(2)} s`,
            ].join('\n');
          },
        },
      },
    },
    scales: {
      x: { grid: { color: GRID }, ticks: { color: TEXT, font: { family: 'Outfit' } } },
      y: { grid: { color: GRID }, ticks: { color: TEXT, font: { family: 'Outfit' } } },
    },
  };

  switch (tab) {
    case 'side': {
      const makeDs = (p: TrajectoryPoint[], color: string, label: string) => ({
        label,
        data: p.map(pt => ({ x: Math.sqrt(pt.x**2 + pt.z**2), y: pt.y })),
        borderColor: color,
        backgroundColor: 'transparent',
        pointRadius: 0,
        tension: 0.3,
        borderWidth: 2.5,
        fill: false,
      });
      const datasets: any[] = [makeDs(pts, CYAN, 'Altitude')];
      if (pts2) datasets.push(makeDs(pts2, compareColor ?? GOLD, 'Compare'));
      data = { datasets };
      options = { ...base, parsing: { xAxisKey: 'x', yAxisKey: 'y' },
        scales: { ...base.scales,
          x: { ...base.scales!.x as any, title: { display: true, text: 'Horizontal Distance (m)', color: TEXT } },
          y: { ...base.scales!.y as any, title: { display: true, text: 'Altitude (m)', color: TEXT } },
        },
      } as ChartOptions;
      break;
    }
    case 'top': {
      const makeDs = (p: TrajectoryPoint[], color: string, label: string) => ({
        label,
        data: p.map(pt => ({ x: pt.z, y: pt.x })),
        borderColor: color,
        backgroundColor: 'transparent',
        pointRadius: 0,
        tension: 0.3,
        borderWidth: 2.5,
        fill: false,
      });
      const datasets: any[] = [makeDs(pts, PINK, 'Ground Track')];
      if (pts2) datasets.push(makeDs(pts2, compareColor ?? GOLD, 'Compare'));
      data = { datasets };
      options = { ...base, parsing: { xAxisKey: 'x', yAxisKey: 'y' },
        scales: { ...base.scales,
          x: { ...base.scales!.x as any, title: { display: true, text: 'East (m)', color: TEXT } },
          y: { ...base.scales!.y as any, title: { display: true, text: 'North (m)', color: TEXT } },
        },
      } as ChartOptions;
      break;
    }
    case 'speed': {
      const MACH_SPEED = 343;
      data = {
        labels: pts.map(p => p.t.toFixed(1)),
        datasets: [
          { label: 'Speed (m/s)', data: pts.map(p => p.speed), borderColor: CYAN, backgroundColor: 'transparent', pointRadius: 0, tension: 0.3, borderWidth: 2.5, fill: false },
          { label: 'Mach 1 (343 m/s)', data: pts.map(() => MACH_SPEED), borderColor: RED, borderDash: [6, 4], backgroundColor: 'transparent', pointRadius: 0, borderWidth: 1.5, fill: false },
        ],
      };
      options = { ...base, scales: { ...base.scales,
        x: { ...base.scales!.x as any, title: { display: true, text: 'Time (s)', color: TEXT } },
        y: { ...base.scales!.y as any, title: { display: true, text: 'Speed (m/s)', color: TEXT } },
      } } as ChartOptions;
      break;
    }
    case 'forces': {
      data = {
        labels: pts.map(p => p.t.toFixed(1)),
        datasets: [
          { label: 'Drag Force (N)', data: pts.map(p => p.drag), borderColor: RED, backgroundColor: 'transparent', pointRadius: 0, tension: 0.3, borderWidth: 2, fill: false },
          { label: 'Kinetic Energy (kJ)', data: pts.map(p => p.kineticJ / 1000), borderColor: GOLD, backgroundColor: 'transparent', pointRadius: 0, tension: 0.3, borderWidth: 2, fill: false, yAxisID: 'y2' },
        ],
      };
      options = { ...base, scales: { ...base.scales,
        x: { ...base.scales!.x as any, title: { display: true, text: 'Time (s)', color: TEXT } },
        y:  { ...base.scales!.y as any, title: { display: true, text: 'Drag (N)', color: RED }, position: 'left'  },
        y2: { grid: { color: 'transparent' }, ticks: { color: GOLD, font: { family: 'Outfit' } }, title: { display: true, text: 'KE (kJ)', color: GOLD }, position: 'right' },
      } } as ChartOptions;
      break;
    }
  }

  activeChart = new Chart(canvas, { type: 'line', data, options });
  return activeChart;
}

export function getActiveChart(): Chart | null { return activeChart; }
