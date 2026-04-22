import React from 'react'
import { cn } from '@/utils/helpers'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
}

export function Card({ children, className, padding = 'md', hover = false, onClick, ...props }: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  }

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-gray-200 shadow-sm',
        paddings[padding],
        hover && 'hover:shadow-md hover:border-gray-300 transition-all duration-200',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string | number
  icon?: React.ReactNode
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange' | 'gray'
  trend?: { value: number; label: string }
  className?: string
}

const colorMap = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', icon: 'bg-blue-100' },
  green: { bg: 'bg-green-50', text: 'text-green-700', icon: 'bg-green-100' },
  yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: 'bg-yellow-100' },
  red: { bg: 'bg-red-50', text: 'text-red-700', icon: 'bg-red-100' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', icon: 'bg-purple-100' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', icon: 'bg-orange-100' },
  gray: { bg: 'bg-gray-50', text: 'text-gray-700', icon: 'bg-gray-100' },
}

export function StatCard({ title, value, icon, color = 'blue', trend, className }: StatCardProps) {
  const colors = colorMap[color]
  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 shadow-sm p-4', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 mb-1">{title}</p>
          <p className={cn('text-2xl font-black', colors.text)}>{value}</p>
          {trend && (
            <p className={cn('text-xs mt-1', trend.value >= 0 ? 'text-green-600' : 'text-red-500')}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        {icon && (
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', colors.icon)}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
