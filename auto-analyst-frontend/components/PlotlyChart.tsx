"use client"

import dynamic from "next/dynamic"
import type React from "react" // Added import for React

// Dynamically import Plot to avoid SSR issues
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

interface PlotlyChartProps {
  data: any[]
  layout?: any
}

const PlotlyChart: React.FC<PlotlyChartProps> = ({ data, layout = {} }) => {
  return (
    <Plot
      data={data}
      layout={{
        width: "100%",
        height: 400,
        ...layout,
      }}
      config={{
        responsive: true,
        displayModeBar: true,
        displaylogo: false,
      }}
    />
  )
}

export default PlotlyChart

