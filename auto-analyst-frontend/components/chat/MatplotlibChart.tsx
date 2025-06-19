"use client"

import React, { useMemo } from "react"

interface MatplotlibChartProps {
  imageData: string  // base64 encoded image data
}

const MatplotlibChart: React.FC<MatplotlibChartProps> = ({ imageData }) => {
  const memoizedImageSrc = useMemo(() => {
    // Ensure the base64 string has the correct data URL prefix
    if (imageData.startsWith('data:image/')) {
      return imageData
    }
    return `data:image/png;base64,${imageData}`
  }, [imageData])

  return (
    <div className="overflow-hidden px-2">
      <img 
        src={memoizedImageSrc}
        alt="Matplotlib Chart"
        className="max-w-full h-auto rounded-lg shadow-sm"
        style={{
          maxWidth: '100%',
          height: 'auto',
          display: 'block',
          margin: '0 auto'
        }}
        onError={(e) => {
          console.error('Error loading matplotlib chart:', e)
          e.currentTarget.style.display = 'none'
        }}
      />
    </div>
  )
}

export default React.memo(MatplotlibChart) 