import { useMemo } from 'react';
import { 
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';

interface ChartSeries {
  name: string;
  key: string;
  color?: string;
}

interface LineChartProps {
  data: any[];
  xAxis: string;
  series: ChartSeries[];
  height?: number;
}

export function LineChart({ data, xAxis, series, height = 400 }: LineChartProps) {
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const dateA = new Date(a[xAxis]);
      const dateB = new Date(b[xAxis]);
      return dateA.getTime() - dateB.getTime();
    });
  }, [data, xAxis]);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart
        data={sortedData}
        margin={{ top: 10, right: 30, left: 20, bottom: 30 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis 
          dataKey={xAxis} 
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => {
            if (typeof value === 'string' && value.includes('-')) {
              const date = new Date(value);
              return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
            }
            return value;
          }}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip 
          formatter={(value, name) => {
            const nameString = typeof name === 'string' ? name : '';
            if (nameString.toLowerCase().includes('cost')) {
              return [`$${parseFloat(value as string).toFixed(2)}`, nameString];
            }
            return [value, nameString];
          }}
          labelFormatter={(label) => {
            if (typeof label === 'string' && label.includes('-')) {
              return new Date(label).toLocaleDateString('en-US', { 
                weekday: 'short',
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              });
            }
            return label;
          }}
        />
        <Legend />
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color || `hsl(${i * 30 + 210}, 70%, 50%)`}
            activeDot={{ r: 6 }}
            strokeWidth={2}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}

interface BarChartProps {
  data: any[];
  xAxis: string;
  series: ChartSeries[];
  height?: number;
  stacked?: boolean;
}

export function BarChart({ data, xAxis, series, height = 400, stacked = false }: BarChartProps) {
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const dateA = new Date(a[xAxis]);
      const dateB = new Date(b[xAxis]);
      return dateA.getTime() - dateB.getTime();
    });
  }, [data, xAxis]);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={sortedData}
        margin={{ top: 10, right: 30, left: 20, bottom: 30 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis 
          dataKey={xAxis} 
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => {
            if (typeof value === 'string' && value.includes('-')) {
              const date = new Date(value);
              return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
            }
            return value;
          }}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip 
          formatter={(value, name) => {
            const nameString = typeof name === 'string' ? name : '';
            if (nameString.toLowerCase().includes('cost')) {
              return [`$${parseFloat(value as string).toFixed(2)}`, nameString];
            }
            if (nameString.toLowerCase().includes('tokens')) {
              return [parseFloat(value as string).toLocaleString(), nameString];
            }
            return [value, nameString];
          }}
          labelFormatter={(label) => {
            if (typeof label === 'string' && label.includes('-')) {
              return new Date(label).toLocaleDateString('en-US', { 
                weekday: 'short',
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              });
            }
            return label;
          }}
        />
        <Legend />
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            fill={s.color || `hsl(${i * 30 + 210}, 70%, 50%)`}
            stackId={stacked ? 'stack' : undefined}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}

interface PieChartProps {
  data: any[];
  nameKey: string;
  dataKey: string;
  height?: number;
  title?: string;
}

export function PieChart({ data, nameKey, dataKey, height = 400, title }: PieChartProps) {
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1', '#A4DE6C', '#D0ED57'];
  
  const formattedData = useMemo(() => {
    return data
      .filter(item => item[dataKey] > 0)
      .sort((a, b) => b[dataKey] - a[dataKey])
      .slice(0, 10); // Limit to top 10 for better visualization
  }, [data, dataKey]);

  if (formattedData.length === 0) {
    return <div className="text-center py-8">No data available</div>;
  }

  const total = formattedData.reduce((sum, item) => sum + item[dataKey], 0);

  return (
    <div className="h-full flex flex-col">
      {title && <h3 className="text-sm font-medium text-center mb-2">{title}</h3>}
      <div className="flex-1">
        <ResponsiveContainer width="100%" height={height}>
          <RechartsPieChart>
            <Pie
              data={formattedData}
              cx="50%"
              cy="50%"
              labelLine={true}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              dataKey={dataKey}
              nameKey={nameKey}
            >
              {formattedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => {
                if (dataKey.toLowerCase().includes('cost')) {
                  return [`$${parseFloat(value as string).toFixed(2)} (${((parseFloat(value as string) / total) * 100).toFixed(1)}%)`];
                }
                return [`${parseFloat(value as string).toLocaleString()} (${((parseFloat(value as string) / total) * 100).toFixed(1)}%)`];
              }}
            />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
} 