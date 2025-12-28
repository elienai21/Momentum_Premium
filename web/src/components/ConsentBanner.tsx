
import React, { useState } from 'react'
import { useI18n } from '../hooks/useI18n'
import { api } from '../lib/api'
import { useAuthToken } from '../hooks/useAuthToken'

export const ConsentBanner: React.FC = () => {
  const { t } = useI18n()
  const token = useAuthToken()
  const [closed, setClosed] = useState<boolean>(() => !!localStorage.getItem('consentAccepted'))
  if (closed) return null
  const accept = async () => {
    try {
      await api('/compliance/consent', token, { method: 'POST' })
      localStorage.setItem('consentAccepted','1')
      setClosed(true)
    } catch (e) { alert('Erro ao registrar consentimento') }
  }
  return (
    <div className='fixed bottom-4 left-1/2 -translate-x-1/2 glass border border-white/10 rounded-xl p-3 shadow-soft flex gap-3 items-center z-50'>
      <span className='text-sm opacity-80'>{t('consent')}</span>
      <button onClick={accept} className='px-3 py-2 rounded-lg border border-white/20'>OK</button>
    </div>
  )
}
