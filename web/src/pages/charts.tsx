
import React, { useEffect, useRef } from 'react'
import { Chart, LineElement, PointElement, LineController, CategoryScale, LinearScale, ArcElement, Tooltip, Legend, PieController } from 'chart.js'
Chart.register(LineElement, PointElement, LineController, CategoryScale, LinearScale, ArcElement, Tooltip, Legend, PieController)

export const Line: React.FC = () => {
  const ref = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    if (!ref.current) return
    const ctx = ref.current.getContext('2d')!
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul'],
        datasets: [{ label: 'Receita', data: [5,6,7,8,8,9,10] }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    })
    return () => chart.destroy()
  }, [])
  return <div style={{height: 280}}><canvas ref={ref}/></div>
}

export const Pie: React.FC = () => {
  const ref = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    if (!ref.current) return
    const ctx = ref.current.getContext('2d')!
    const chart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Alimentação','Transporte','Moradia','Outros'],
        datasets: [{ data: [35, 20, 25, 20] }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    })
    return () => chart.destroy()
  }, [])
  return <div style={{height: 280}}><canvas ref={ref}/></div>
}
