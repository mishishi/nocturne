import { useState } from 'react'
import { ConfirmModal } from './ui/ConfirmModal'
import { Toast } from './ui/Toast'
import { api } from '../services/api'

interface ExportDataModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ExportDataModal({ isOpen, onClose }: ExportDataModalProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await api.exportData()
      onClose()
    } catch {
      setToastMessage('导出失败，请重试')
      setToastVisible(true)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <>
      <ConfirmModal
        isOpen={isOpen}
        title="导出我的数据"
        message="将导出你的所有个人信息，包括梦境记录、社区帖子、好友关系等"
        confirmText={isExporting ? '正在导出...' : '确认导出'}
        cancelText="取消"
        onConfirm={handleExport}
        onCancel={onClose}
      />
      <Toast
        message={toastMessage}
        visible={toastVisible}
        onClose={() => setToastVisible(false)}
        type="error"
      />
    </>
  )
}
