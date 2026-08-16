# NivoLineChart Component

A theme-aware, customizable line chart component built with Nivo for the TuneScan frontend.

## Features

- **Theme Support**: Automatically adapts to light/dark mode using ThemeContext
- **Customizable**: Extensive props for styling and behavior
- **Responsive**: Uses ResponsiveLine for automatic sizing
- **Interactive**: Touch crosshair, tooltips, and hover effects
- **Performance**: Optimized rendering with smooth animations

## Installation

The required packages are already installed:

```bash
@nivo/core
@nivo/line
```

## Basic Usage

```jsx
import { NivoLineChart } from '../../components/NivoLineChart';
import { transformToNivoFormat } from '../../utils/dataAggregation';

// Your data
const data = [
  { date: '2024-10-01', spotify_playcount: 1000, youtube_playcount: 500 },
  { date: '2024-10-02', spotify_playcount: 1200, youtube_playcount: 600 },
];

// Transform to Nivo format
const nivoData = transformToNivoFormat(data, ['spotify_playcount', 'youtube_playcount'], {
  spotify_playcount: 'Spotify',
  youtube_playcount: 'YouTube',
});

// Render
<NivoLineChart data={nivoData} height={400} xAxisLegend="Date" yAxisLegend="Streams" />;
```

## Data Format

The component expects data in Nivo's standard format:

```javascript
[
  {
    id: 'Spotify',
    data: [
      { x: '2024-10-01', y: 1000 },
      { x: '2024-10-02', y: 1200 },
    ],
  },
  {
    id: 'YouTube',
    data: [
      { x: '2024-10-01', y: 500 },
      { x: '2024-10-02', y: 600 },
    ],
  },
];
```

## Transformation Utilities

Use the helper functions in `/utils/dataAggregation.js`:

### `transformToNivoFormat(data, metrics, labels)`

Transforms TuneScan data format to Nivo format.

**Parameters:**

- `data` (Array): Array of data points with date and metrics
- `metrics` (Array): Metric keys to extract (e.g., `['spotify_playcount', 'youtube_playcount']`)
- `labels` (Object): Optional custom labels (e.g., `{ spotify_playcount: 'Spotify' }`)

**Example:**

```javascript
const nivoData = transformToNivoFormat(rawData, ['spotify_playcount', 'youtube_playcount'], {
  spotify_playcount: 'Spotify',
  youtube_playcount: 'YouTube',
});
```

### `transformChartJsToNivo(chartJsData)`

Converts Chart.js formatted data to Nivo format.

**Parameters:**

- `chartJsData` (Object): Chart.js format with `labels` and `datasets`

**Example:**

```javascript
const chartJsData = {
  labels: ['2024-10-01', '2024-10-02'],
  datasets: [
    { label: 'Spotify', data: [1000, 1200] },
    { label: 'YouTube', data: [500, 600] },
  ],
};

const nivoData = transformChartJsToNivo(chartJsData);
```

## Props

| Prop           | Type    | Default       | Description                     |
| -------------- | ------- | ------------- | ------------------------------- |
| `data`         | Array   | `[]`          | Array of series data (required) |
| `height`       | Number  | `400`         | Chart height in pixels          |
| `enableLegend` | Boolean | `true`        | Show/hide legend                |
| `enableGridX`  | Boolean | `true`        | Show/hide vertical grid lines   |
| `enableGridY`  | Boolean | `true`        | Show/hide horizontal grid lines |
| `enablePoints` | Boolean | `true`        | Show/hide data points           |
| `pointSize`    | Number  | `10`          | Size of data points             |
| `enableArea`   | Boolean | `false`       | Fill area under lines           |
| `curve`        | String  | `'monotoneX'` | Line curve type                 |
| `colors`       | Array   | Auto          | Custom color scheme             |
| `xAxisLegend`  | String  | `'Date'`      | X-axis label                    |
| `yAxisLegend`  | String  | `'Value'`     | Y-axis label                    |
| `config`       | Object  | `{}`          | Additional chart config         |

## Curve Types

Available curve types:

- `'linear'` - Straight lines
- `'monotoneX'` - Smooth curves (default)
- `'monotoneY'` - Smooth curves optimized for Y
- `'natural'` - Natural cubic spline
- `'step'` - Step function
- `'stepBefore'` - Step before
- `'stepAfter'` - Step after

## Advanced Examples

### With Area Fill

```jsx
<NivoLineChart data={nivoData} height={400} enableArea={true} xAxisLegend="Date" yAxisLegend="Revenue ($)" />
```

### Custom Colors

```jsx
<NivoLineChart
  data={nivoData}
  height={400}
  colors={['#1DB954', '#FF0000', '#fb923c']}
  xAxisLegend="Date"
  yAxisLegend="Count"
/>
```

### Without Points

```jsx
<NivoLineChart data={nivoData} height={400} enablePoints={false} curve="natural" />
```

### Stacked Lines

```jsx
<NivoLineChart data={nivoData} height={400} config={{ stacked: true }} xAxisLegend="Date" yAxisLegend="Total" />
```

## Integration with Existing Code

### Using with Catalog Data

```jsx
import { NivoLineChart } from '../../components/NivoLineChart';
import { transformToNivoFormat, applyAdaptiveGranularity } from '../../utils/dataAggregation';

const MyCatalogChart = ({ rawData, timeframe }) => {
  // Apply adaptive granularity
  const { data: aggregatedData } = applyAdaptiveGranularity(
    rawData,
    new Date('2024-01-01'),
    new Date('2024-10-20'),
    timeframe
  );

  // Transform to Nivo format
  const nivoData = transformToNivoFormat(aggregatedData, ['spotify_playcount', 'youtube_playcount'], {
    spotify_playcount: 'Spotify',
    youtube_playcount: 'YouTube',
  });

  return <NivoLineChart data={nivoData} height={500} xAxisLegend="Date" yAxisLegend="Playcount" />;
};
```

### With LockedChart Wrapper

```jsx
import { LockedChart } from '../../components/LockedChart';
import { NivoLineChart } from '../../components/NivoLineChart';

const PremiumChart = ({ data, isPremium }) => {
  const chart = <NivoLineChart data={data} height={400} xAxisLegend="Date" yAxisLegend="Streams" />;

  if (!isPremium) {
    return (
      <LockedChart title="Premium Analytics" height="400px" upgradeUrl="/pricing">
        {chart}
      </LockedChart>
    );
  }

  return chart;
};
```

## Theme Support

The component automatically adapts to your theme using the ThemeContext:

```jsx
import { useContext } from 'react';
import { ThemeContext } from '../ThemeProvider/ThemeProvider';

const MyComponent = () => {
  const { currentTheme } = useContext(ThemeContext);
  // Component automatically uses currentTheme ('dark' or 'light')
};
```

The theme controls:

- Text colors
- Grid line colors
- Tooltip styling
- Axis colors
- Background colors

## Demo Page

Visit the demo page at `/chart-demo` to see the component in action with interactive controls.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance Notes

- For large datasets (>1000 points), consider using `applyAdaptiveGranularity()` to reduce data points
- Disable animations for better performance on slower devices
- Use `enablePoints={false}` for smoother rendering with many data points

## License

Part of the TuneScan frontend application.
