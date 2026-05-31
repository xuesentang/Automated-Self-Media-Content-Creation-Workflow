import { useState, useEffect } from 'react';
import { Button, Result, Typography, message, Modal, Checkbox, Spin, Alert } from 'antd';
import { CheckCircle, FileText, RotateCcw, ExternalLink, Save, Loader2 } from 'lucide-react';
import type { WorkflowContext as AppContext } from '../../state/appMachine.types';
import api from '../../services/api';

const { Paragraph } = Typography;

interface PlatformAccount {
  id: string;
  platform: string;
  accountName: string;
  avatar: string;
}

interface CompletedStepProps {
  context: AppContext;
  onNewArticle: () => void;
  onGoToWarehouse: () => void;
  onSave: () => Promise<number>;
}

export function CompletedStep({ context, onNewArticle, onGoToWarehouse, onSave }: CompletedStepProps) {
  const [saving, setSaving] = useState(false);
  const [savedArticleId, setSavedArticleId] = useState<number | null>(null);
  const [publishEnabled, setPublishEnabled] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [accounts, setAccounts] = useState<PlatformAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ taskId: string; status: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/health');
        setPublishEnabled(!!res.data?.publishEnabled);
      } catch { /* health check failed, keep publish disabled */ }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const id = await onSave();
      setSavedArticleId(id);
      message.success('文章已保存到仓库');
    } catch {
      message.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const openPublishModal = async () => {
    if (!savedArticleId) {
      message.warning('请先保存文章到仓库');
      return;
    }
    setPublishModalOpen(true);
    setLoadingAccounts(true);
    setPublishResult(null);
    try {
      const res = await api.get('/publish/accounts');
      setAccounts(res.data || []);
    } catch {
      message.error('获取平台账号失败，请检查蚁小二客户端是否已登录');
      setPublishModalOpen(false);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handlePublish = async () => {
    if (!savedArticleId) return;
    if (selectedPlatforms.length === 0) {
      message.warning('请至少选择一个发布平台');
      return;
    }
    setPublishing(true);
    try {
      const res = await api.post('/publish/submit', {
        articleId: savedArticleId,
        title: context.skeleton?.title ?? '未命名',
        content: context.draft,
        platforms: selectedPlatforms,
      });
      setPublishResult(res.data);
      message.success('发布任务已提交');
    } catch {
      message.error('发布失败，请重试');
    } finally {
      setPublishing(false);
    }
  };

  const closeModal = () => {
    setPublishModalOpen(false);
    setPublishResult(null);
    setSelectedPlatforms([]);
  };

  const platformOptions = accounts.map((a) => ({
    label: `${a.platform} — ${a.accountName}`,
    value: a.platform,
  }));

  return (
    <div className="animate-fade-in-up">
      <div className="text-center py-12">
        {/* Success Icon */}
        <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-emerald-500" />
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mb-2">文章创作完成！</h2>
        <p className="text-slate-500 mb-8 max-w-md mx-auto">
          你的文章已创作完成。保存后可在文章仓库中随时查阅，或一键发布到各平台。
        </p>

        {context.mentorFeedback && (
          <div className="max-w-lg mx-auto mb-8 p-4 bg-amber-50 rounded-xl border border-amber-200 text-left">
            <p className="font-medium text-amber-800 mb-1">导师反馈摘要：</p>
            <p className="text-sm text-amber-700">{context.mentorFeedback.nextStep}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button
            type="primary"
            size="large"
            onClick={handleSave}
            loading={saving}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            保存文章到仓库
          </Button>

          {publishEnabled && (
            <Button
              size="large"
              onClick={openPublishModal}
              disabled={!savedArticleId}
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              发布到平台
            </Button>
          )}

          <Button
            size="large"
            onClick={onGoToWarehouse}
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            前往文章仓库
          </Button>

          <Button
            size="large"
            onClick={onNewArticle}
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            开始新文章
          </Button>
        </div>
      </div>

      {/* Publish Modal */}
      <Modal
        title="选择发布平台"
        open={publishModalOpen}
        onCancel={closeModal}
        footer={publishResult ? [
          <Button key="close" onClick={closeModal}>关闭</Button>,
        ] : [
          <Button key="cancel" onClick={closeModal}>取消</Button>,
          <Button
            key="publish"
            type="primary"
            onClick={handlePublish}
            loading={publishing}
            disabled={selectedPlatforms.length === 0}
          >
            确认发布
          </Button>,
        ]}
      >
        {loadingAccounts ? (
          <div className="text-center py-8">
            <Spin tip="加载平台账号..." />
          </div>
        ) : publishResult ? (
          <div>
            <Alert
              type={publishResult.status === 'failed' ? 'error' : 'success'}
              message={publishResult.status === 'failed' ? '发布任务提交失败' : `发布任务已提交（ID: ${publishResult.taskId}）`}
              description="蚁小二客户端正在处理发布任务，请保持客户端运行。发布完成后可在蚁小二客户端查看详细结果。"
              className="mb-4 rounded-xl"
            />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>未检测到已授权媒体账号</p>
            <p className="text-sm mt-2">请先在蚁小二客户端中完成平台账号授权</p>
          </div>
        ) : (
          <div>
            <Paragraph className="mb-4">选择要发布到的平台：</Paragraph>
            <Checkbox.Group
              options={platformOptions}
              value={selectedPlatforms}
              onChange={(values) => setSelectedPlatforms(values as string[])}
              className="flex flex-col gap-2"
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
