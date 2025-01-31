"use client"

import dynamic from "next/dynamic"
import type React from "react"
import { useRef, useEffect, useState } from "react"

// Dynamically import Plot to avoid SSR issues
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

interface PlotlyChartProps {
  data: any[]
  layout?: any
}

const PlotlyChart: React.FC<PlotlyChartProps> = ({ data, layout = {} }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        // Get the parent width to ensure we stay within bounds
        const parentWidth = containerRef.current.parentElement?.getBoundingClientRect().width || 0
        // Use parent width minus padding to ensure we don't overflow
        const width = Math.max(parentWidth - 40, 0) // 40px total padding (20px each side)
        const height = Math.min(width * 0.6, 300) // Keep height proportional but capped
        setDimensions({ width, height })
      }
    }

    // Initial size calculation
    updateDimensions()

    // Create ResizeObserver to watch for container size changes
    const resizeObserver = new ResizeObserver(updateDimensions)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    // Cleanup
    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current)
      }
      resizeObserver.disconnect()
    }
  }, [])

  return (
    <div ref={containerRef} className="w-full overflow-hidden px-2">
      <Plot
        data={data}
        layout={{
          ...layout,
          width: dimensions.width,
          height: dimensions.height,
          margin: { t: 30, b: 40, l: 60, r: 20 },
          autosize: false,
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
          xaxis: {
            ...layout.xaxis,
            automargin: true,
          },
          yaxis: {
            ...layout.yaxis,
            automargin: true,
          },
        }}
        config={{
          responsive: false, // We handle responsiveness ourselves
          displayModeBar: false,
          displaylogo: false,
        }}
        style={{
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  )
}

export default PlotlyChart

