'use client'

// import { ReactPlugin } from '@stagewise-plugins/react'
import { StagewiseToolbar } from '@stagewise/toolbar-next'

export function StagewiseProvider() {
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <StagewiseToolbar
      // config={{
      //   plugins: [ReactPlugin],
      // }}
    />
  )
} 