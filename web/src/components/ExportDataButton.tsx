
import React from 'react'
import { useI18n } from '../hooks/useI18n'
import { useAuthToken } from '../hooks/useAuthToken'
import authorizedFetch from '@/services/authorizedFetch'

export const ExportDataButton: React.FC = () => {
  const { t } = useI18n()
  const token = useAuthToken()
  const download = async () => {
    const res = await authorizedFetch('/api/compliance/export')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'userData.json'; a.click()
    URL.revokeObjectURL(url)
  }
  return <button onClick={download} className='glass px-3 py-2 rounded-lg border border-white/20'>{t('export')}</button>
}
