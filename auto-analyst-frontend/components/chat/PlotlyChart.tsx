"use client"

import dynamic from "next/dynamic"
import React, { useRef, useEffect, useState, useCallback, useMemo } from "react"

// Dynamically import Plot to avoid SSR issues
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

interface PlotlyChartProps {
  data: any[]
  layout?: any
}

const PlotlyChart: React.FC<PlotlyChartProps> = ({ data, layout = {} }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const parentWidth = containerRef.current.parentElement?.getBoundingClientRect().width || 0
      const width = Math.max(parentWidth - 40, 800) // Minimum width of 600px
      const height = Math.max(width * 0.6, 600) // Minimum height of 400px
      setDimensions((prevDimensions) => {
        if (prevDimensions.width !== width || prevDimensions.height !== height) {
          return { width, height }
        }
        return prevDimensions
      })
    }
  }, [])

  useEffect(() => {
    updateDimensions()
    const resizeObserver = new ResizeObserver(updateDimensions)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }
    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current)
      }
      resizeObserver.disconnect()
    }
  }, [updateDimensions])

  const memoizedLayout = useMemo(() => ({
    ...layout,
    width: dimensions.width,
    height: dimensions.height,
    margin: { t: 50, b: 50, l: 50, r: 50 },
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
  }), [layout, dimensions.width, dimensions.height])

  const memoizedConfig = useMemo(() => ({
    responsive: false,
    displayModeBar: true,
    displaylogo: false,
  }), [])

  const memoizedStyle = useMemo(() => ({
    width: `${dimensions.width}px`,
    height: `${dimensions.height}px`,
  }), [dimensions.width, dimensions.height])

  return (
    <div ref={containerRef} className="overflow-hidden px-2">
      <Plot
        data={data}
        layout={memoizedLayout}
        config={memoizedConfig}
        style={memoizedStyle}
      />
    </div>
  )
}

export default React.memo(PlotlyChart)
