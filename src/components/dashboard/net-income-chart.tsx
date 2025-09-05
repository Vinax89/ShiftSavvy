'use client';

import { Bar, BarChart, XAxis, YAxis } from 'recharts';
import { incomeData } from '@/lib/mock-data';
import { ChartContainer, ChartTooltipContent, ChartTooltip } from '@/components/ui/chart';

export default function NetIncomeChart() {
  return (
     <ChartContainer config={{
        netIncome: {
            label: "Net Income",
            color: "hsl(var(--primary))",
        },
     }} className="min-h-[300px] w-full">
        <BarChart
            accessibilityLayer
            data={incomeData}
            margin={{
                top: 5,
                right: 10,
                bottom: 5,
                left: -10,
            }}
        >
            <XAxis
                dataKey="date"
                stroke="hsl(var(--foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
            />
            <YAxis
                stroke="hsl(var(--foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value/1000}k`}
            />
             <Tooltip
                cursor={{ fill: 'hsl(var(--accent) / 0.2)' }}
                content={<ChartTooltipContent indicator="dot" />}
             />
            <Bar dataKey="netIncome" name="Net Income" fill="var(--color-netIncome)" radius={[4, 4, 0, 0]} />
        </BarChart>
    </ChartContainer>
  );
}
